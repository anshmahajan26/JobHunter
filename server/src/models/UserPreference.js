import mongoose from 'mongoose';

const userPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    preferredRoles: [{ type: String, trim: true }],
    preferredIndustries: [{ type: String, trim: true }],
    preferredLocations: [{ type: String, trim: true }],
    workplaceTypes: {
      type: [String],
      enum: ['remote', 'hybrid', 'onsite'],
      default: ['remote', 'hybrid'],
    },
    employmentTypes: {
      type: [String],
      enum: ['full-time', 'internship', 'contract', 'part-time'],
      default: ['full-time', 'internship'],
    },
    schedulePreference: {
      type: String,
      enum: ['5-day', '4-day', 'flexible'],
      default: '5-day',
    },
    salaryPreference: {
      minimumSalary: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
      isStrict: { type: Boolean, default: false },
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', 'any'],
      default: 'entry',
    },
    preferredTechnologies: [{ type: String, trim: true }],
    technologiesToLearn: [{ type: String, trim: true }],
    preferredCompanyTypes: [{ type: String, trim: true }], // Startup, MNC, Scale-up
    relocationPreference: {
      type: Boolean,
      default: false,
    },
    noticePeriodDays: {
      type: Number,
      default: 0,
    },
    exclusions: {
      unpaidInternships: { type: Boolean, default: true },
      bondJobs: { type: Boolean, default: true },
      companies: [{ type: String, trim: true }],
      previouslyAppliedCompanies: { type: Boolean, default: true },
      unwantedRoles: [{ type: String, trim: true }],
      unwantedLocations: [{ type: String, trim: true }],
      customKeywords: [{ type: String, trim: true }],
    },
    postingAgeLimit: {
      type: Number,
      default: 7, // days
    },
    customInstructions: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const UserPreference = mongoose.model('UserPreference', userPreferenceSchema);

