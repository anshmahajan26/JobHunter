import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    personalDetails: {
      fullName: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: 'India' },
      linkedinUrl: { type: String, default: '' },
      githubUrl: { type: String, default: '' },
      portfolioUrl: { type: String, default: '' },
    },
    education: [
      {
        degree: { type: String, default: '' },
        fieldOfStudy: { type: String, default: '' },
        institution: { type: String, default: '' },
        graduationYear: { type: String, default: '' },
        cgpaOrPercentage: { type: String, default: '' },
        tenthPercentage: { type: String, default: '' },
        twelfthPercentage: { type: String, default: '' },
        isVerified: { type: Boolean, default: false },
      },
    ],
    experienceType: {
      type: String,
      enum: ['fresher', 'experienced'],
      default: 'fresher',
    },
    experience: [
      {
        company: { type: String, default: '' },
        title: { type: String, default: '' },
        employmentType: { type: String, default: 'full-time' }, // full-time, internship, contract
        startDate: { type: String, default: '' },
        endDate: { type: String, default: '' },
        isCurrent: { type: Boolean, default: false },
        location: { type: String, default: '' },
        responsibilities: [{ type: String }],
        projects: [{ type: String }],
        achievements: [{ type: String }],
        isVerified: { type: Boolean, default: false },
      },
    ],
    skills: {
      technical: [{ type: String }],
      frameworks: [{ type: String }],
      tools: [{ type: String }],
      soft: [{ type: String }],
    },
    projects: [
      {
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        technologies: [{ type: String }],
        liveUrl: { type: String, default: '' },
        repoUrl: { type: String, default: '' },
        isVerified: { type: Boolean, default: false },
      },
    ],
    certifications: [
      {
        name: { type: String, default: '' },
        issuer: { type: String, default: '' },
        issueDate: { type: String, default: '' },
        credentialUrl: { type: String, default: '' },
        isVerified: { type: Boolean, default: false },
      },
    ],
    summary: {
      type: String,
      default: '',
    },
    verifiedInformation: {
      type: Boolean,
      default: false,
    },
    extractionProvenance: {
      resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
      parsedAt: { type: Date },
      manuallyEditedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

export const UserProfile = mongoose.model('UserProfile', userProfileSchema);

