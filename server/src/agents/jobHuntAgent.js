import { connectDB } from '../config/database.js';
import { User } from '../models/User.js';
import { UserProfile } from '../models/UserProfile.js';
import { UserPreference } from '../models/UserPreference.js';
import { AutomationSettings } from '../models/AutomationSettings.js';
import { AgentRun } from '../models/AgentRun.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';
import { JobMatch } from '../models/JobMatch.js';
import { PendingAction } from '../models/PendingAction.js';
import { Notification } from '../models/Notification.js';
import { jobDiscoveryService } from '../services/discovery/jobDiscoveryService.js';
import { jobScoringService, isGeminiQuotaExceeded } from '../services/ai/jobScoringService.js';
import { applicationPreparationService } from '../services/application/applicationPreparationService.js';
import { formMappingService } from '../services/browser/formMappingService.js';
import { reportGenerator } from '../services/reporting/reportGenerator.js';
import { emailService } from '../services/email/emailService.js';
import { TailoredResume } from '../models/TailoredResume.js';
import { Resume } from '../models/Resume.js';
import path from 'path';
import fs from 'fs';

// Map of active runs for cooperative instant cancellation
const activeUserRuns = new Map();

/**
 * Force stop any active agent execution for a user and clear stale locks
 */
export async function cancelUserRun(userId) {
  const userKey = userId.toString();
  if (activeUserRuns.has(userKey)) {
    const runState = activeUserRuns.get(userKey);
    runState.isCancelled = true;
    console.log(`[JobHuntAgent] Cancellation flag set for user ${userKey}`);
  }

  // Update all ongoing runs in MongoDB to cancelled
  const result = await AgentRun.updateMany(
    { userId, status: 'running' },
    {
      $set: {
        status: 'cancelled',
        endTime: new Date(),
      },
      $push: {
        errorSummary: 'Force stopped by user',
      },
    }
  );

  activeUserRuns.delete(userKey);
  return { success: true, stoppedCount: result.modifiedCount };
}

/**
 * Runs the autonomous job hunt cycle for a specific user
 */
export async function runJobHuntCycleForUser(userId, runType = 'manual') {
  await connectDB();

  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new Error(`User ${userId} not found or inactive`);
  }

  const profile = await UserProfile.findOne({ userId });
  const preferences = await UserPreference.findOne({ userId });
  const settings = await AutomationSettings.findOne({ userId });

  if (settings && settings.pauseAll) {
    console.log(`[JobHuntAgent] Agent execution paused by user settings.`);
    return { status: 'paused', message: 'Agent paused by user setting.' };
  }

  const userKey = userId.toString();

  // 1. Concurrency guard: Check if an active run is currently ongoing for this user
  const ongoingRun = await AgentRun.findOne({
    userId,
    status: 'running',
    startTime: { $gte: new Date(Date.now() - 30 * 60 * 1000) }, // within last 30 mins
  });

  if (ongoingRun && activeUserRuns.has(userKey)) {
    console.warn(`[JobHuntAgent] A run is already in progress for user ${userId}. Exiting to prevent concurrency collision.`);
    return { status: 'concurrency_blocked', message: 'Another run is already active.' };
  } else if (ongoingRun && !activeUserRuns.has(userKey)) {
    // Stale run left from earlier crash/restart without active in-memory task -> auto clean
    console.log(`[JobHuntAgent] Cleaning up stale running state for user ${userId}.`);
    ongoingRun.status = 'cancelled';
    ongoingRun.endTime = new Date();
    ongoingRun.errorSummary.push('Stale run cleared automatically');
    await ongoingRun.save();
  }

  // Create AgentRun record
  const agentRun = await AgentRun.create({
    userId,
    runType,
    status: 'running',
    startTime: new Date(),
    summary: { discovered: 0, matched: 0, prepared: 0, submitted: 0, pending: 0, failed: 0, dismissed: 0 },
  });

  const runState = { isCancelled: false, runId: agentRun._id };
  activeUserRuns.set(userKey, runState);

  const runErrors = [];
  const processedApplications = [];
  const runDiscoveredJobs = [];

  try {
    console.log(`[JobHuntAgent] Starting run ${agentRun._id} for ${user.email}...`);

    // 2. Discover Jobs
    const maxAgeDays = preferences?.postingAgeLimit || settings?.postingAgeLimit || 7;
    const discoveryResult = await jobDiscoveryService.runDiscovery({ maxPostingAgeDays: maxAgeDays });

    agentRun.summary.discovered = discoveryResult.discoveredCount;
    if (discoveryResult.errors && discoveryResult.errors.length > 0) {
      runErrors.push(...discoveryResult.errors);
    }

    if (runState.isCancelled) {
      console.log(`[JobHuntAgent] Run ${agentRun._id} cancelled by user.`);
      agentRun.status = 'cancelled';
      agentRun.endTime = new Date();
      agentRun.errorSummary.push('Force stopped by user');
      await agentRun.save();
      return { status: 'cancelled', message: 'Job hunt cycle stopped by user.' };
    }

    // 3. Match & Rank Jobs
    const minScore = preferences?.minimumMatchScore || settings?.minimumMatchScore || 70;

    // Search specifically for jobs matching user's preferred roles, skills, and target positions across the whole catalog
    const userRoleKeywords = (preferences?.preferredRoles || []).map((r) => r.trim()).filter(Boolean);
    const userSkillKeywords = [
      ...(profile?.skills?.technical || []),
      ...(profile?.skills?.frameworks || []),
      ...(profile?.skills?.tools || []),
    ].map((s) => s.trim()).filter(Boolean);

    const roleRegexes = userRoleKeywords.map((r) => new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    const skillRegexes = userSkillKeywords.slice(0, 10).map((s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

    let targetedJobs = [];
    if (roleRegexes.length > 0 || skillRegexes.length > 0) {
      targetedJobs = await Job.find({
        isActive: true,
        $or: [
          ...(roleRegexes.length > 0 ? [{ title: { $in: roleRegexes } }] : []),
          ...(skillRegexes.length > 0 ? [{ title: { $in: skillRegexes } }] : []),
          ...(skillRegexes.length > 0 ? [{ originalDescription: { $in: skillRegexes } }] : []),
          { title: /full\s*stack|frontend|react|software\s*engineer|developer|web|engineer/i },
        ],
      }).sort({ postedAt: -1 }).limit(60);
    }

    // Merge targeted jobs with discovery jobs so the candidate pool is rich with relevant roles
    const seenIds = new Set();
    const candidateJobs = [];
    for (const j of [...targetedJobs, ...(discoveryResult.jobs || [])]) {
      const idStr = j._id.toString();
      if (!seenIds.has(idStr)) {
        seenIds.add(idStr);
        candidateJobs.push(j);
      }
      if (candidateJobs.length >= 35) break;
    }

    const eligibleJobs = [];

    for (const job of candidateJobs) {
      if (runState.isCancelled) {
        console.log(`[JobHuntAgent] Run ${agentRun._id} cancelled by user during matching.`);
        agentRun.status = 'cancelled';
        agentRun.endTime = new Date();
        agentRun.errorSummary.push('Force stopped by user');
        await agentRun.save();
        return { status: 'cancelled', message: 'Job hunt cycle stopped by user.' };
      }

      try {
        const match = await jobScoringService.evaluateJobMatch(
          userId,
          job,
          profile,
          preferences,
          minScore
        );

        runDiscoveredJobs.push({
          ...job.toObject(),
          matchScore: match.matchScore,
        });

        if (match.eligibility) {
          eligibleJobs.push({ job, match });
        }
      } catch (matchErr) {
        runErrors.push({ errorType: 'ScoringError', job: job.title, message: matchErr.message });
      }
    }

    // Prioritize eligible jobs by highest match score first
    eligibleJobs.sort((a, b) => b.match.matchScore - a.match.matchScore);
    agentRun.summary.matched = eligibleJobs.length;

    // Immediately notify user about newly matched opportunities ready for application
    if (eligibleJobs.length > 0) {
      await Notification.create({
        userId,
        type: 'jobs_matched',
        title: `${eligibleJobs.length} Matched Job(s) Ready for Review`,
        message: `Found ${eligibleJobs.length} position(s) aligning with your profile (top match: ${eligibleJobs[0].job.title} at ${eligibleJobs[0].job.company} — ${eligibleJobs[0].match.matchScore}%). Check them out to review tailored materials!`,
        relatedEntityId: agentRun._id,
        linkUrl: '/jobs',
      }).catch(() => {});
    }

    // 4. Calculate today's applied count for Daily Application Limit enforcement
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayAppliedCount = await Application.countDocuments({
      userId,
      submissionTimestamp: { $gte: startOfToday },
      status: 'APPLIED',
    });

    const dailyLimit = settings?.dailyApplicationLimit || 10;
    let remainingDailySlots = Math.max(0, dailyLimit - todayAppliedCount);

    console.log(`[JobHuntAgent] Today's applied: ${todayAppliedCount}/${dailyLimit}. Remaining quota: ${remainingDailySlots}`);

    // 5. Prepare Applications & Submit if Authorized
    for (const { job, match } of eligibleJobs) {
      if (runState.isCancelled) {
        console.log(`[JobHuntAgent] Run ${agentRun._id} cancelled by user during applications.`);
        agentRun.status = 'cancelled';
        agentRun.endTime = new Date();
        agentRun.errorSummary.push('Force stopped by user');
        await agentRun.save();
        return { status: 'cancelled', message: 'Job hunt cycle stopped by user.' };
      }

      // Check if user already applied or dismissed
      const existingApp = await Application.findOne({ userId, jobId: job._id });
      if (existingApp && ['APPLIED', 'DISMISSED', 'INTERVIEW', 'OFFER', 'REJECTED'].includes(existingApp.status)) {
        continue;
      }

      try {
        const prep = await applicationPreparationService.prepareApplication(userId, job);
        agentRun.summary.prepared++;

        if (prep.requiresHumanAction) {
          agentRun.summary.pending += prep.pendingActionsCount || 1;
          processedApplications.push(prep.application);
          continue;
        }

        // Automatic Submission Eligibility Checks (Section 9):
        // 1. Automatic submissions enabled explicitly by user
        // 2. Score >= minimumMatchScore
        // 3. Within daily quota
        // 4. Not paused
        if (
          settings?.automaticSubmissionEnabled &&
          match.matchScore >= minScore &&
          remainingDailySlots > 0 &&
          !settings?.pauseAll
        ) {
          console.log(`[JobHuntAgent] Automatically submitting eligible job: ${job.company} - ${job.title}`);

          // Resolve resume local file
          let resumePath = null;
          if (prep.tailoredResume?._id) {
            const tailored = await TailoredResume.findById(prep.tailoredResume._id);
            if (tailored && tailored.fileUrl.startsWith('/uploads')) {
              const local = path.resolve(`.${tailored.fileUrl}`);
              if (fs.existsSync(local)) resumePath = local;
            }
          }
          if (!resumePath) {
            const original = await Resume.findOne({ userId, isOriginal: true }).sort({ createdAt: -1 });
            if (original && original.originalFileUrl.startsWith('/uploads')) {
              const local = path.resolve(`.${original.originalFileUrl}`);
              if (fs.existsSync(local)) resumePath = local;
            }
          }

          const candidateData = {
            fullName: profile.personalDetails?.fullName,
            email: profile.personalDetails?.email,
            phone: profile.personalDetails?.phone,
            linkedinUrl: profile.personalDetails?.linkedinUrl,
            githubUrl: profile.personalDetails?.githubUrl,
            portfolioUrl: profile.personalDetails?.portfolioUrl,
          };

          const submissionRes = await formMappingService.submitApplicationProcess({
            applicationUrl: job.applicationUrl,
            candidateData,
            resumeLocalPath: resumePath,
            allowSubmit: true,
          });

          prep.application.status = submissionRes.status;
          prep.application.statusHistory.push({
            status: submissionRes.status,
            reason: submissionRes.message,
            source: submissionRes.status === 'APPLIED' ? 'portal_verified' : 'agent',
          });

          if (submissionRes.status === 'APPLIED') {
            prep.application.submissionTimestamp = new Date();
            prep.application.submissionMethod = 'automatic';
            prep.application.confirmationDetails = {
              confirmationText: submissionRes.confirmationText,
              confirmationUrl: submissionRes.confirmationUrl,
              verifiedBy: 'portal_verified',
            };
            agentRun.summary.submitted++;
            remainingDailySlots--;
          } else if (submissionRes.status === 'PENDING') {
            agentRun.summary.pending++;
          } else if (submissionRes.status === 'FAILED') {
            agentRun.summary.failed++;
          }

          await prep.application.save();
          processedApplications.push(prep.application);
        } else {
          // Prepared for user manual approval
          processedApplications.push(prep.application);
        }
      } catch (appErr) {
        agentRun.summary.failed++;
        runErrors.push({ errorType: 'ApplicationError', job: job.title, message: appErr.message });
      }
    }

    // 6. Fetch pending actions for report
    const pendingActions = await PendingAction.find({ userId, status: 'pending' }).populate('jobId');

    // 7. Generate Excel Report
    const reportRes = await reportGenerator.generateRunReport({
      userId,
      runId: agentRun._id,
      summaryData: agentRun.summary,
      discoveredJobs: runDiscoveredJobs,
      applications: processedApplications,
      pendingActions,
      errors: runErrors,
    });

    // 8. Dispatch Email Notification
    const emailRes = await emailService.sendRunSummaryEmail({
      toEmail: user.email,
      userName: user.name,
      summaryData: agentRun.summary,
      reportUrl: reportRes.fileUrl,
    });

    // 9. Create In-App Notification
    await Notification.create({
      userId,
      type: 'run_completed',
      title: 'Job Hunt Run Completed',
      message: `Discovered ${agentRun.summary.discovered} jobs, matched ${agentRun.summary.matched}, submitted ${agentRun.summary.submitted}, with ${agentRun.summary.pending} pending actions.`,
      relatedEntityId: agentRun._id,
      linkUrl: '/dashboard',
    });

    const quotaExceeded = isGeminiQuotaExceeded();
    if (quotaExceeded) {
      await Notification.create({
        userId,
        type: 'quota_warning',
        title: 'Gemini AI Tokens: 0 Remaining Today',
        message: 'Your Google Gemini Free Tier daily limit (20 calls/day) has reached 0. The agent automatically completed this run using the built-in deterministic skill-matching engine. To restore full AI scoring and resume tailoring, set up billing at https://ai.google.dev or update GEMINI_API_KEY in server/.env.',
        relatedEntityId: agentRun._id,
        linkUrl: '/dashboard',
      }).catch(() => {});
    }

    // Finalize AgentRun
    agentRun.status = 'completed';
    agentRun.endTime = new Date();
    agentRun.durationMs = agentRun.endTime.getTime() - agentRun.startTime.getTime();
    agentRun.errorSummary = runErrors.map((e) => `${e.errorType || 'Error'}: ${e.message || e.error}`);
    if (quotaExceeded) {
      agentRun.errorSummary.push('Gemini AI token limit was 0 during this run. Built-in deterministic skill matching was used.');
    }
    await agentRun.save();

    console.log(`[JobHuntAgent] Run ${agentRun._id} completed in ${agentRun.durationMs}ms.`);

    return {
      status: 'completed',
      agentRun,
      reportUrl: reportRes.fileUrl,
      emailSent: emailRes.sent,
      quotaExceeded,
    };
  } catch (fatalErr) {
    console.error(`[JobHuntAgent Fatal Error] ${fatalErr.message}`);
    agentRun.status = 'failed';
    agentRun.endTime = new Date();
    agentRun.errorSummary.push(fatalErr.message);
    await agentRun.save();
    throw fatalErr;
  } finally {
    activeUserRuns.delete(userKey);
  }
}

// If invoked directly from CLI (e.g. GitHub Actions)
if (process.argv[1] && process.argv[1].endsWith('jobHuntAgent.js')) {
  (async () => {
    try {
      await connectDB();
      console.log('[CLI Agent Runner] Executing daily job hunt for active users...');

      // Run for all active users with automated discovery enabled
      const users = await User.find({ isActive: true });
      for (const u of users) {
        console.log(`[CLI Agent Runner] Processing user: ${u.email}`);
        await runJobHuntCycleForUser(u._id, 'scheduled_github_actions');
      }

      console.log('[CLI Agent Runner] All user cycles completed successfully.');
      process.exit(0);
    } catch (err) {
      console.error('[CLI Agent Runner Fatal]', err);
      process.exit(1);
    }
  })();
}

