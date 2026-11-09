import mongoose from 'mongoose';

const jobMatchSchema = new mongoose.Schema(
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
    matchScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true,
    },
    matchingSkills: [{ type: String }],
    missingSkills: [{ type: String }],
    relevantExperience: [{ type: String }],
    strengths: [{ type: String }],
    gaps: [{ type: String }],
    explanation: {
      type: String,
      required: true,
    },
    eligibility: {
      type: Boolean,
      default: false,
    },
    isSaved: {
      type: Boolean,
      default: false,
    },
    isDismissed: {
      type: Boolean,
      default: false,
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

jobMatchSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export const JobMatch = mongoose.model('JobMatch', jobMatchSchema);

