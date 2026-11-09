import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalFileUrl: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'doc', 'docx'],
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    rawText: {
      type: String,
      default: '',
    },
    extractedData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    parsedStatus: {
      type: String,
      enum: ['pending', 'parsed', 'failed'],
      default: 'pending',
    },
    parseError: {
      type: String,
      default: null,
    },
    isOriginal: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

export const Resume = mongoose.model('Resume', resumeSchema);

