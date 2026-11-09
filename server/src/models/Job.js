import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ['greenhouse', 'lever', 'custom'],
      required: true,
      index: true,
    },
    sourceJobId: {
      type: String,
      required: true,
      index: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    companyIdentifier: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    originalDescription: {
      type: String,
      required: true,
    },
    originalSourceData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    location: {
      type: String,
      default: 'Remote',
      trim: true,
    },
    workplaceType: {
      type: String,
      enum: ['remote', 'hybrid', 'onsite'],
      default: 'remote',
    },
    employmentType: {
      type: String,
      default: 'Full-time',
    },
    salaryInfo: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      currency: { type: String, default: null },
      rawText: { type: String, default: null },
    },
    applicationUrl: {
      type: String,
      required: true,
    },
    postedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    discoveredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index so the exact job from the source is never duplicated
jobSchema.index({ source: 1, sourceJobId: 1 }, { unique: true });

export const Job = mongoose.model('Job', jobSchema);

