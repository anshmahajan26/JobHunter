import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    runId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentRun',
      default: null,
      index: true,
    },
    reportUrl: {
      type: String,
      required: true,
    },
    reportType: {
      type: String,
      enum: ['excel'],
      default: 'excel',
    },
    status: {
      type: String,
      enum: ['generated', 'emailed', 'email_failed'],
      default: 'generated',
      index: true,
    },
    summary: {
      discovered: { type: Number, default: 0 },
      matched: { type: Number, default: 0 },
      submitted: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    emailError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Report = mongoose.model('Report', reportSchema);

