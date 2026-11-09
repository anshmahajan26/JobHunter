import { AutomationSettings } from '../models/AutomationSettings.js';
import { AnswerBank } from '../models/AnswerBank.js';
import { Notification } from '../models/Notification.js';

export const getAutomationSettings = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let settings = await AutomationSettings.findOne({ userId });
    if (!settings) {
      settings = await AutomationSettings.create({ userId });
    }
    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

export const updateAutomationSettings = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    const settings = await AutomationSettings.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Automation settings updated successfully.',
      settings,
    });
  } catch (error) {
    next(error);
  }
};

export const getAnswerBank = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const items = await AnswerBank.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, answerBank: items });
  } catch (error) {
    next(error);
  }
};

export const createAnswerBankItem = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { question, answer, questionCategory = 'general' } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ success: false, message: 'Question and answer are required' });
    }

    const item = await AnswerBank.findOneAndUpdate(
      { userId, question: question.trim() },
      {
        userId,
        question: question.trim(),
        answer: answer.trim(),
        questionCategory,
        verified: true,
        approvedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      message: 'Answer saved to Answer Bank.',
      item,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAnswerBankItem = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await AnswerBank.findOneAndDelete({ _id: req.params.id, userId });
    res.json({ success: true, message: 'Item deleted from Answer Bank' });
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(30);
    const unreadCount = await Notification.countDocuments({ userId, read: false });
    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await Notification.findOneAndUpdate({ _id: req.params.id, userId }, { read: true });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

