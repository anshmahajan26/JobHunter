import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: [
        'DISCOVERED',
        'MATCHED',
        'PREPARING',
        'READY_FOR_APPROVAL',
        'QUEUED',
        'APPLYING',
        'APPLIED',
        'PENDING',
        'NEEDS_VERIFICATION',
        'FAILED',
        'DISMISSED',
        'INTERVIEW',
        'REJECTED',
        'OFFER',
      ],
      default: 'DISCOVERED',
      index: true,
    },
    submissionMethod: {
      type: String,
      enum: ['automatic', 'manual_user_reported', 'manual_approved', 'none'],
      default: 'none',
    },
    tailoredResumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TailoredResume',
      default: null,
    },
    answerSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'auto_approved'],
      default: 'pending',
    },
    submissionTimestamp: {
      type: Date,
      default: null,
    },
    confirmationDetails: {
      confirmationText: { type: String, default: null },
      confirmationUrl: { type: String, default: null },
      referenceNumber: { type: String, default: null },
      verifiedBy: {
        type: String,
        enum: ['portal_verified', 'user_reported', 'agent', null],
        default: null,
      },
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        reason: { type: String, default: '' },
        source: {
          type: String,
          enum: ['portal_verified', 'user_reported', 'agent'],
          default: 'agent',
        },
      },
    ],
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export const Application = mongoose.model('Application', applicationSchema);

