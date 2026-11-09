import { Job } from '../models/Job.js';
import { JobMatch } from '../models/JobMatch.js';
import { Application } from '../models/Application.js';
import { TailoredResume } from '../models/TailoredResume.js';
import { UserProfile } from '../models/UserProfile.js';
import { UserPreference } from '../models/UserPreference.js';
import { AutomationSettings } from '../models/AutomationSettings.js';
import { jobDiscoveryService } from '../services/discovery/jobDiscoveryService.js';
import { jobScoringService } from '../services/ai/jobScoringService.js';

export const getJobs = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      page = 1,
      limit = 20,
      search = '',
      workplaceType = '',
      source = '',
      minScore = 0,
      savedOnly = 'false',
    } = req.query;

    const query = { isActive: true };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    if (workplaceType) {
      query.workplaceType = workplaceType;
    }

    if (source) {
      query.source = source;
    }

    // Fetch user matches to join
    const userMatches = await JobMatch.find({ userId });
    const matchMap = new Map();
    userMatches.forEach((m) => {
      matchMap.set(m.jobId.toString(), m);
    });

    // Fetch user applications to show status
    const userApps = await Application.find({ userId });
    const appMap = new Map();
    userApps.forEach((a) => {
      appMap.set(a.jobId.toString(), a);
    });

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const totalCount = await Job.countDocuments(query);
    const rawJobs = await Job.find(query).sort({ postedAt: -1 }).skip(skip).limit(parseInt(limit, 10));

    // Augment jobs with match score and application status
    let augmented = rawJobs.map((job) => {
      const match = matchMap.get(job._id.toString());
      const app = appMap.get(job._id.toString());

      return {
        ...job.toObject(),
        matchScore: match ? match.matchScore : null,
        matchingSkills: match ? match.matchingSkills : [],
        missingSkills: match ? match.missingSkills : [],
        explanation: match ? match.explanation : null,
        eligibility: match ? match.eligibility : false,
        isSaved: match ? match.isSaved : false,
        isDismissed: match ? match.isDismissed : false,
        applicationStatus: app ? app.status : 'NOT_APPLIED',
        applicationId: app ? app._id : null,
      };
    });

    // Apply saved filter
    if (savedOnly === 'true') {
      augmented = augmented.filter((j) => j.isSaved);
    }

    // Apply minimum score filter if requested
    if (parseInt(minScore, 10) > 0) {
      augmented = augmented.filter((j) => j.matchScore && j.matchScore >= parseInt(minScore, 10));
    }

    // Sort by match score first, then newest
    augmented.sort((a, b) => {
      if ((b.matchScore || 0) !== (a.matchScore || 0)) {
        return (b.matchScore || 0) - (a.matchScore || 0);
      }
      return new Date(b.postedAt) - new Date(a.postedAt);
    });

    res.json({
      success: true,
      jobs: augmented,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getJobById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job listing not found.',
      });
    }

    const match = await JobMatch.findOne({ userId, jobId: job._id });
    const application = await Application.findOne({ userId, jobId: job._id });
    const tailoredResume = await TailoredResume.findOne({ userId, jobId: job._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      job: {
        ...job.toObject(),
        matchScore: match ? match.matchScore : null,
        matchingSkills: match ? match.matchingSkills : [],
        missingSkills: match ? match.missingSkills : [],
        relevantExperience: match ? match.relevantExperience : [],
        strengths: match ? match.strengths : [],
        gaps: match ? match.gaps : [],
        explanation: match ? match.explanation : null,
        eligibility: match ? match.eligibility : false,
        isSaved: match ? match.isSaved : false,
        isDismissed: match ? match.isDismissed : false,
        applicationStatus: application ? application.status : 'NOT_APPLIED',
        applicationId: application ? application._id : null,
        tailoredResume: tailoredResume || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const triggerDiscovery = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const preferences = await UserPreference.findOne({ userId });
    const settings = await AutomationSettings.findOne({ userId });

    const maxAgeDays = preferences?.postingAgeLimit || settings?.postingAgeLimit || 7;

    // Run discovery across Greenhouse and Lever
    const discoveryResult = await jobDiscoveryService.runDiscovery({
      maxPostingAgeDays: maxAgeDays,
    });

    // Score discovered jobs for this user
    const profile = await UserProfile.findOne({ userId });
    const minScore = settings?.minimumMatchScore || 80;

    let matchedCount = 0;
    const evaluatedMatches = [];

    if (profile && discoveryResult.jobs.length > 0) {
      for (const job of discoveryResult.jobs.slice(0, 30)) {
        const match = await jobScoringService.evaluateJobMatch(
          userId,
          job,
          profile,
          preferences,
          minScore
        );
        evaluatedMatches.push(match);
        if (match.eligibility) {
          matchedCount++;
        }
      }
    }

    res.json({
      success: true,
      message: `Job discovery completed: ${discoveryResult.discoveredCount} jobs retrieved from boards, ${discoveryResult.newInsertedCount} new jobs saved, ${matchedCount} matched eligible positions.`,
      summary: {
        discoveredCount: discoveryResult.discoveredCount,
        newInsertedCount: discoveryResult.newInsertedCount,
        activeAvailable: discoveryResult.totalActiveAvailable,
        matchedEligibleCount: matchedCount,
        errors: discoveryResult.errors,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const matchJob = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const profile = await UserProfile.findOne({ userId });
    const preferences = await UserPreference.findOne({ userId });
    const settings = await AutomationSettings.findOne({ userId });

    const match = await jobScoringService.evaluateJobMatch(
      userId,
      job,
      profile,
      preferences,
      settings?.minimumMatchScore || 80
    );

    res.json({
      success: true,
      match,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleSaveJob = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const jobId = req.params.id;

    let match = await JobMatch.findOne({ userId, jobId });
    if (!match) {
      match = await JobMatch.create({
        userId,
        jobId,
        matchScore: 0,
        explanation: 'Saved by user',
        isSaved: true,
      });
    } else {
      match.isSaved = !match.isSaved;
      await match.save();
    }

    res.json({
      success: true,
      isSaved: match.isSaved,
      message: match.isSaved ? 'Job saved to favorites.' : 'Job removed from saved list.',
    });
  } catch (error) {
    next(error);
  }
};

export const dismissJob = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const jobId = req.params.id;

    let match = await JobMatch.findOne({ userId, jobId });
    if (!match) {
      match = await JobMatch.create({
        userId,
        jobId,
        matchScore: 0,
        explanation: 'Dismissed by user',
        isDismissed: true,
      });
    } else {
      match.isDismissed = true;
      await match.save();
    }

    res.json({
      success: true,
      message: 'Job dismissed.',
    });
  } catch (error) {
    next(error);
  }
};

