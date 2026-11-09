import mongoose from 'mongoose';

const answerBankSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    questionCategory: {
      type: String,
      enum: [
        'general',
        'personal_experience',
        'technical',
        'situational',
        'availability',
        'salary',
        'relocation',
        'legal_work_auth',
      ],
      default: 'general',
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: true,
    },
    isCustomExperience: {
      type: Boolean,
      default: false,
    },
    approvedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const AnswerBank = mongoose.model('AnswerBank', answerBankSchema);

