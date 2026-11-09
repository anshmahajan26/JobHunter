import { PendingAction } from '../models/PendingAction.js';
import { Application } from '../models/Application.js';
import { AnswerBank } from '../models/AnswerBank.js';
import { Job } from '../models/Job.js';
import { answerGenerationService } from '../services/ai/answerGenerationService.js';

export const getPendingActions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status = 'pending' } = req.query;

    const query = { userId };
    if (status !== 'all') {
      query.status = status;
    }

    const actions = await PendingAction.find(query)
      .populate('jobId')
      .populate('applicationId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      pendingActions: actions,
    });
  } catch (error) {
    next(error);
  }
};

export const answerPendingAction = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { responseText } = req.body;

    if (!responseText || !responseText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your genuine experience or answer text.',
      });
    }

    const action = await PendingAction.findOne({ _id: req.params.id, userId }).populate('jobId');
    if (!action) {
      return res.status(404).json({ success: false, message: 'Pending action not found' });
    }

    // Polish the wording with Gemini without fabricating facts
    const polishedAnswer = await answerGenerationService.polishUserExperienceDraft(
      userId,
      action.question,
      responseText.trim(),
      action.jobId?.title || 'Position',
      action.jobId?.company || 'Company'
    );

    // Save to AnswerBank for future reuse
    await AnswerBank.findOneAndUpdate(
      { userId, question: action.question },
      {
        userId,
        question: action.question,
        answer: polishedAnswer,
        questionCategory: 'personal_experience',
        verified: true,
        isCustomExperience: true,
        approvedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    action.status = 'resolved';
    action.userResponse = polishedAnswer;
    action.resolvedAt = new Date();
    await action.save();

    // Check if application has remaining pending actions
    if (action.applicationId) {
      const remaining = await PendingAction.countDocuments({
        applicationId: action.applicationId,
        status: 'pending',
      });

      if (remaining === 0) {
        await Application.findByIdAndUpdate(action.applicationId, {
          status: 'READY_FOR_APPROVAL',
          $push: {
            statusHistory: {
              status: 'READY_FOR_APPROVAL',
              reason: 'All pending personal experience answers approved by candidate.',
              source: 'agent',
              timestamp: new Date(),
            },
          },
        });
      }
    }

    res.json({
      success: true,
      message: 'Experience response recorded, polished and added to verified Answer Bank.',
      polishedAnswer,
      action,
    });
  } catch (error) {
    next(error);
  }
};

export const dismissPendingAction = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const action = await PendingAction.findOneAndUpdate(
      { _id: req.params.id, userId },
      { status: 'dismissed', resolvedAt: new Date() },
      { new: true }
    );

    if (!action) {
      return res.status(404).json({ success: false, message: 'Pending action not found' });
    }

    res.json({
      success: true,
      message: 'Pending action dismissed.',
      action,
    });
  } catch (error) {
    next(error);
  }
};

export const markPendingAsApplied = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const action = await PendingAction.findOne({ _id: req.params.id, userId });

    if (!action) {
      return res.status(404).json({ success: false, message: 'Pending action not found' });
    }

    action.status = 'resolved';
    action.resolvedAt = new Date();
    await action.save();

    if (action.applicationId) {
      await Application.findByIdAndUpdate(action.applicationId, {
        status: 'APPLIED',
        submissionMethod: 'manual_user_reported',
        submissionTimestamp: new Date(),
        confirmationDetails: {
          verifiedBy: 'user_reported',
          confirmationText: 'Candidate resolved pending challenge and marked as applied directly on portal.',
        },
        $push: {
          statusHistory: {
            status: 'APPLIED',
            reason: 'Candidate submitted directly via original application link and marked as applied.',
            source: 'user_reported',
            timestamp: new Date(),
          },
        },
      });
    }

    res.json({
      success: true,
      message: 'Application marked as applied by candidate.',
    });
  } catch (error) {
    next(error);
  }
};

