import { AgentRun } from '../models/AgentRun.js';
import { AutomationSettings } from '../models/AutomationSettings.js';
import { runJobHuntCycleForUser, cancelUserRun } from '../agents/jobHuntAgent.js';
import { isGeminiQuotaExceeded, getGeminiQuotaStatus } from '../services/ai/jobScoringService.js';

export const stopAgentRun = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await cancelUserRun(userId);
    res.json({
      success: true,
      message: 'Agent execution stopped successfully.',
      result,
    });
  } catch (error) {
    next(error);
  }
};

export const triggerAgentRun = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Check if run already in progress
    const ongoing = await AgentRun.findOne({
      userId,
      status: 'running',
      startTime: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
    });

    if (ongoing) {
      return res.status(409).json({
        success: false,
        message: 'An agent execution cycle is already running. Please wait for it to complete.',
      });
    }

    // Trigger asynchronous run and return immediate confirmation, or execute inline
    // In dev / small loads, we execute inline so user gets instant updated statistics
    const result = await runJobHuntCycleForUser(userId, 'manual');

    res.json({
      success: true,
      message: result.quotaExceeded
        ? 'Job hunt cycle completed. (Notice: Gemini AI tokens are 0 today; built-in deterministic skill matching was used).'
        : 'Job hunt cycle completed successfully.',
      result,
      quotaExceeded: result.quotaExceeded,
    });
  } catch (error) {
    next(error);
  }
};

export const getAgentStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const latestRun = await AgentRun.findOne({ userId }).sort({ createdAt: -1 });
    const settings = await AutomationSettings.findOne({ userId });

    res.json({
      success: true,
      status: latestRun?.status || 'idle',
      latestRun,
      settings,
      quotaExceeded: isGeminiQuotaExceeded(),
      quotaDetails: getGeminiQuotaStatus(),
    });
  } catch (error) {
    next(error);
  }
};

export const getAgentHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const history = await AgentRun.find({ userId }).sort({ createdAt: -1 }).limit(20);

    res.json({
      success: true,
      history,
    });
  } catch (error) {
    next(error);
  }
};

export const pauseAgent = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const settings = await AutomationSettings.findOneAndUpdate(
      { userId },
      { pauseAll: true },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'All automated application workflows paused.',
      settings,
    });
  } catch (error) {
    next(error);
  }
};

export const resumeAgent = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const settings = await AutomationSettings.findOneAndUpdate(
      { userId },
      { pauseAll: false },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Automated application workflows resumed.',
      settings,
    });
  } catch (error) {
    next(error);
  }
};

