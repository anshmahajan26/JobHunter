import mongoose from 'mongoose';

const pendingActionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: [
        'captcha',
        'otp',
        'missing_info',
        'personal_experience',
        'unknown_field',
        'manual_approval',
        'unsupported_portal',
        'changed_layout',
        'timeout',
        'uncertain_status',
      ],
      required: true,
      index: true,
    },
    question: {
      type: String,
      default: '',
    },
    requiredAction: {
      type: String,
      required: true,
    },
    applicationUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
    userResponse: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const PendingAction = mongoose.model('PendingAction', pendingActionSchema);

