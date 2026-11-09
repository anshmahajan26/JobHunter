import mongoose from 'mongoose';

const tailoredResumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
    },
    originalResumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      default: null,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    tailoringMetadata: {
      highlightedSkills: [{ type: String }],
      alignedKeywords: [{ type: String }],
      reorderedSections: [{ type: String }],
      wordingImprovements: [{ type: String }],
      summaryStatement: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

export const TailoredResume = mongoose.model('TailoredResume', tailoredResumeSchema);

