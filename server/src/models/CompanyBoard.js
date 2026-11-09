import mongoose from 'mongoose';

const companyBoardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ['greenhouse', 'lever'],
      required: true,
      index: true,
    },
    boardIdentifier: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    lastJobCount: {
      type: Number,
      default: 0,
    },
    syncStatus: {
      type: String,
      enum: ['idle', 'syncing', 'success', 'error'],
      default: 'idle',
    },
    lastError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

companyBoardSchema.index({ platform: 1, boardIdentifier: 1 }, { unique: true });

export const CompanyBoard = mongoose.model('CompanyBoard', companyBoardSchema);

