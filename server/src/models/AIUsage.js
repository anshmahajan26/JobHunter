import mongoose from 'mongoose';

const aiUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    runId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentRun',
      default: null,
    },
    model: {
      type: String,
      required: true,
      default: 'gemini-3.5-flash',
    },
    requestType: {
      type: String,
      enum: ['scoring', 'resume_tailor', 'answer_generation', 'resume_parse', 'general'],
      required: true,
      index: true,
    },
    inputTokens: {
      type: Number,
      default: 0,
    },
    outputTokens: {
      type: Number,
      default: 0,
    },
    estimatedCost: {
      type: Number,
      default: 0, // In USD
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const AIUsage = mongoose.model('AIUsage', aiUsageSchema);

