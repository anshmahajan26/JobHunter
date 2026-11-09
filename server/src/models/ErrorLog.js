import mongoose from 'mongoose';

const errorLogSchema = new mongoose.Schema(
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
      index: true,
    },
    module: {
      type: String,
      required: true,
      index: true,
    },
    errorType: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    stackTrace: {
      type: String,
      default: null,
    },
    contextData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const ErrorLog = mongoose.model('ErrorLog', errorLogSchema);

