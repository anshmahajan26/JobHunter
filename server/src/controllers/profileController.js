import { UserProfile } from '../models/UserProfile.js';
import { UserPreference } from '../models/UserPreference.js';
import { AutomationSettings } from '../models/AutomationSettings.js';
import { Resume } from '../models/Resume.js';

export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    let profile = await UserProfile.findOne({ userId });
    if (!profile) {
      profile = await UserProfile.create({
        userId,
        personalDetails: { fullName: req.user.name, email: req.user.email },
      });
    }

    let preferences = await UserPreference.findOne({ userId });
    if (!preferences) {
      preferences = await UserPreference.create({ userId });
    }

    let automation = await AutomationSettings.findOne({ userId });
    if (!automation) {
      automation = await AutomationSettings.create({ userId });
    }

    const latestResume = await Resume.findOne({ userId, isOriginal: true }).sort({ createdAt: -1 });

    res.json({
      success: true,
      profile,
      preferences,
      automation,
      resume: latestResume,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { personalDetails, education, experienceType, experience, skills, projects, certifications, summary } = req.body;

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          ...(personalDetails && { personalDetails }),
          ...(education && { education }),
          ...(experienceType && { experienceType }),
          ...(experience && { experience }),
          ...(skills && { skills }),
          ...(projects && { projects }),
          ...(certifications && { certifications }),
          ...(summary !== undefined && { summary }),
          'extractionProvenance.manuallyEditedAt': new Date(),
        },
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      profile,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    const preferences = await UserPreference.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Job preferences updated successfully.',
      preferences,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          verifiedInformation: true,
          'extractionProvenance.manuallyEditedAt': new Date(),
        },
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Profile information verified successfully.',
      profile,
    });
  } catch (error) {
    next(error);
  }
};

