import mongoose from 'mongoose';

const automationSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    automaticDiscoveryEnabled: {
      type: Boolean,
      default: true,
    },
    automaticSubmissionEnabled: {
      type: Boolean,
      default: false, // Explicit user opt-in required by Section 9
    },
    dailyApplicationLimit: {
      type: Number,
      default: 10,
      min: 1,
      max: 50,
    },
    minimumMatchScore: {
      type: Number,
      default: 80,
      min: 50,
      max: 100,
    },
    postingAgeLimit: {
      type: Number,
      default: 7,
      min: 1,
      max: 60,
    },
    pauseAll: {
      type: Boolean,
      default: false,
    },
    scheduleSettings: {
      enabled: { type: Boolean, default: true },
      cronTime: { type: String, default: '0 8 * * *' }, // 8:00 AM IST
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
  },
  {
    timestamps: true,
  }
);

export const AutomationSettings = mongoose.model('AutomationSettings', automationSettingsSchema);

