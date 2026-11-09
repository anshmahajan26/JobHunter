import { User } from '../models/User.js';
import { CompanyBoard } from '../models/CompanyBoard.js';
import { AIUsage } from '../models/AIUsage.js';
import { AgentRun } from '../models/AgentRun.js';
import { Application } from '../models/Application.js';
import { ErrorLog } from '../models/ErrorLog.js';
import { greenhouseService } from '../services/discovery/greenhouseService.js';
import { leverService } from '../services/discovery/leverService.js';

export const getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalApplications = await Application.countDocuments();
    const submittedApplications = await Application.countDocuments({ status: 'APPLIED' });
    const totalRuns = await AgentRun.countDocuments();

    // AI Token & Cost Aggregation
    const aiStats = await AIUsage.aggregate([
      {
        $group: {
          _id: null,
          totalInputTokens: { $sum: '$inputTokens' },
          totalOutputTokens: { $sum: '$outputTokens' },
          totalCost: { $sum: '$estimatedCost' },
          totalRequests: { $sum: 1 },
        },
      },
    ]);

    const activeBoards = await CompanyBoard.find();

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalApplications,
        submittedApplications,
        totalRuns,
        aiUsage: aiStats[0] || { totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, totalRequests: 0 },
        boardsCount: activeBoards.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User account ${user.isActive ? 'activated' : 'deactivated'}.`,
      user: { id: user._id, email: user.email, isActive: user.isActive },
    });
  } catch (error) {
    next(error);
  }
};

export const getCompanyBoards = async (req, res, next) => {
  try {
    const boards = await CompanyBoard.find().sort({ platform: 1, name: 1 });
    res.json({ success: true, boards });
  } catch (error) {
    next(error);
  }
};

export const addCompanyBoard = async (req, res, next) => {
  try {
    const { name, platform, boardIdentifier } = req.body;

    if (!name || !platform || !boardIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Name, platform (greenhouse/lever), and boardIdentifier are required.',
      });
    }

    const board = await CompanyBoard.create({
      name: name.trim(),
      platform,
      boardIdentifier: boardIdentifier.trim(),
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Company job board registered.',
      board,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleCompanyBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const board = await CompanyBoard.findById(id);

    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    board.isActive = !board.isActive;
    await board.save();

    res.json({
      success: true,
      message: `Board '${board.name}' ${board.isActive ? 'enabled' : 'disabled'}.`,
      board,
    });
  } catch (error) {
    next(error);
  }
};

export const checkBoardHealth = async (req, res, next) => {
  try {
    const { id } = req.params;
    const board = await CompanyBoard.findById(id);

    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    let health = { healthy: false };
    if (board.platform === 'greenhouse') {
      health = await greenhouseService.checkHealth(board.boardIdentifier);
    } else if (board.platform === 'lever') {
      health = await leverService.checkHealth(board.boardIdentifier);
    }

    res.json({
      success: true,
      board: board.name,
      platform: board.platform,
      health,
    });
  } catch (error) {
    next(error);
  }
};

export const getAIUsage = async (req, res, next) => {
  try {
    const usage = await AIUsage.find().populate('userId', 'name email').sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, usage });
  } catch (error) {
    next(error);
  }
};

export const getSystemErrors = async (req, res, next) => {
  try {
    const errors = await ErrorLog.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, errors });
  } catch (error) {
    next(error);
  }
};

