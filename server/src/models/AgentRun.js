import mongoose from 'mongoose';

const agentRunSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    runType: {
      type: String,
      enum: ['manual', 'scheduled_github_actions'],
      default: 'manual',
      index: true,
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'paused', 'cancelled'],
      default: 'running',
      index: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    summary: {
      discovered: { type: Number, default: 0 },
      matched: { type: Number, default: 0 },
      prepared: { type: Number, default: 0 },
      submitted: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      dismissed: { type: Number, default: 0 },
    },
    errorSummary: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

export const AgentRun = mongoose.model('AgentRun', agentRunSchema);

