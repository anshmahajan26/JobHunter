import { Application } from '../../models/Application.js';
import { UserProfile } from '../../models/UserProfile.js';
import { UserPreference } from '../../models/UserPreference.js';
import { PendingAction } from '../../models/PendingAction.js';
import { Notification } from '../../models/Notification.js';
import { resumeTailorService } from '../resume/resumeTailorService.js';
import { answerGenerationService } from '../ai/answerGenerationService.js';

export class ApplicationPreparationService {
  /**
   * Prepares an application package for an eligible job
   */
  async prepareApplication(userId, job, originalResumeId = null) {
    const profile = await UserProfile.findOne({ userId });
    const preferences = await UserPreference.findOne({ userId });

    if (!profile) {
      throw new Error('User profile does not exist. Please complete your profile first.');
    }

    // 1. Find or create Application record
    let application = await Application.findOne({ userId, jobId: job._id });
    if (!application) {
      application = await Application.create({
        userId,
        jobId: job._id,
        status: 'PREPARING',
        statusHistory: [
          {
            status: 'PREPARING',
            reason: 'Initiated application preparation pipeline',
            source: 'agent',
          },
        ],
      });
    }

    // 2. Generate or fetch Tailored Resume
    let tailoredResume = null;
    try {
      tailoredResume = await resumeTailorService.tailorResumeForJob(
        userId,
        job,
        profile,
        originalResumeId
      );
      if (tailoredResume?._id) {
        application.tailoredResumeId = tailoredResume._id;
      }
    } catch (tailorErr) {
      console.warn(`[App Prep Warning] Tailoring failed, using fallback: ${tailorErr.message}`);
    }

    // 3. Prepare answers for common application questions
    const standardQuestions = [
      'Why do you want to join our company?',
      'Tell me about yourself.',
      'What is your notice period?',
      'Are you willing to relocate?',
      'What is your expected salary?',
    ];

    const answerSnapshot = {};
    const pendingQuestions = [];

    for (const q of standardQuestions) {
      const res = await answerGenerationService.resolveAnswerForQuestion(
        userId,
        q,
        job,
        profile,
        preferences
      );

      if (res.requiresUserExperience) {
        pendingQuestions.push({
          question: q,
          reason: res.reason || 'personal_experience',
        });
      } else {
        answerSnapshot[q] = res.answer;
      }
    }

    application.answerSnapshot = answerSnapshot;

    // 4. If any questions require human experience, create PendingAction and halt auto-apply
    if (pendingQuestions.length > 0) {
      application.status = 'PENDING';
      application.statusHistory.push({
        status: 'PENDING',
        reason: `Pending personal response from candidate for ${pendingQuestions.length} questions.`,
        source: 'agent',
      });
      await application.save();

      for (const pq of pendingQuestions) {
        await PendingAction.create({
          userId,
          applicationId: application._id,
          jobId: job._id,
          reason: pq.reason,
          question: pq.question,
          requiredAction: `Provide your genuine experience or answer for: "${pq.question}"`,
          applicationUrl: job.applicationUrl,
          status: 'pending',
        });
      }

      await Notification.create({
        userId,
        type: 'action_required',
        title: `Action Required for ${job.company}`,
        message: `An application question requires your real personal experience: "${pendingQuestions[0].question}"`,
        relatedEntityId: application._id,
        linkUrl: `/pending-actions`,
      });

      return {
        application,
        tailoredResume,
        requiresHumanAction: true,
        pendingActionsCount: pendingQuestions.length,
      };
    }

    // 5. Ready for review or queue
    application.status = 'READY_FOR_APPROVAL';
    application.statusHistory.push({
      status: 'READY_FOR_APPROVAL',
      reason: 'Application package prepared and validated with truthful answers.',
      source: 'agent',
    });
    await application.save();

    return {
      application,
      tailoredResume,
      requiresHumanAction: false,
    };
  }
}

export const applicationPreparationService = new ApplicationPreparationService();

