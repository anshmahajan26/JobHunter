import { Application } from '../models/Application.js';
import { Job } from '../models/Job.js';
import { UserProfile } from '../models/UserProfile.js';
import { TailoredResume } from '../models/TailoredResume.js';
import { Resume } from '../models/Resume.js';
import { AutomationSettings } from '../models/AutomationSettings.js';
import { applicationPreparationService } from '../services/application/applicationPreparationService.js';
import { formMappingService } from '../services/browser/formMappingService.js';
import path from 'path';
import fs from 'fs';

export const getApplications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { userId };
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Application.countDocuments(query);
    const applications = await Application.find(query)
      .populate('jobId')
      .populate('tailoredResumeId')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      applications,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getApplicationById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const application = await Application.findOne({ _id: req.params.id, userId })
      .populate('jobId')
      .populate('tailoredResumeId');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.json({
      success: true,
      application,
    });
  } catch (error) {
    next(error);
  }
};

export const prepareJobApplication = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const jobId = req.params.id;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const result = await applicationPreparationService.prepareApplication(userId, job);

    res.json({
      success: true,
      message: result.requiresHumanAction
        ? 'Application prepared, but requires user input on pending questions.'
        : 'Application successfully prepared and validated.',
      application: result.application,
      tailoredResume: result.tailoredResume,
      requiresHumanAction: result.requiresHumanAction,
    });
  } catch (error) {
    next(error);
  }
};

export const submitApplication = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const application = await Application.findOne({ _id: req.params.id, userId }).populate('jobId');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(400).json({ success: false, message: 'Candidate profile required' });
    }

    // Resolve resume file path
    let resumePath = null;
    if (application.tailoredResumeId) {
      const tailored = await TailoredResume.findById(application.tailoredResumeId);
      if (tailored && tailored.fileUrl.startsWith('/uploads')) {
        const local = path.resolve(`.${tailored.fileUrl}`);
        if (fs.existsSync(local)) resumePath = local;
      }
    }
    if (!resumePath) {
      const original = await Resume.findOne({ userId, isOriginal: true }).sort({ createdAt: -1 });
      if (original && original.originalFileUrl.startsWith('/uploads')) {
        const local = path.resolve(`.${original.originalFileUrl}`);
        if (fs.existsSync(local)) resumePath = local;
      }
    }

    application.status = 'APPLYING';
    application.statusHistory.push({
      status: 'APPLYING',
      reason: 'Automated submission initiated',
      source: 'agent',
    });
    await application.save();

    const candidateData = {
      fullName: profile.personalDetails?.fullName,
      email: profile.personalDetails?.email,
      phone: profile.personalDetails?.phone,
      linkedinUrl: profile.personalDetails?.linkedinUrl,
      githubUrl: profile.personalDetails?.githubUrl,
      portfolioUrl: profile.personalDetails?.portfolioUrl,
    };

    // Execute Playwright browser automation
    const result = await formMappingService.submitApplicationProcess({
      applicationUrl: application.jobId.applicationUrl,
      candidateData,
      resumeLocalPath: resumePath,
      allowSubmit: true,
    });

    application.status = result.status;
    application.statusHistory.push({
      status: result.status,
      reason: result.message,
      source: result.status === 'APPLIED' ? 'portal_verified' : 'agent',
    });

    if (result.status === 'APPLIED') {
      application.submissionTimestamp = new Date();
      application.submissionMethod = 'automatic';
      application.confirmationDetails = {
        confirmationText: result.confirmationText,
        confirmationUrl: result.confirmationUrl,
        verifiedBy: 'portal_verified',
      };
    }

    await application.save();

    res.json({
      success: true,
      message: result.message,
      status: result.status,
      application,
    });
  } catch (error) {
    next(error);
  }
};

export const updateApplicationStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status, notes, reason } = req.body;

    const allowed = ['INTERVIEW', 'REJECTED', 'OFFER', 'APPLIED', 'DISMISSED', 'NEEDS_VERIFICATION'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowed.join(', ')}`,
      });
    }

    const application = await Application.findOne({ _id: req.params.id, userId });
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    application.status = status;
    if (notes) application.notes = notes;
    if (status === 'APPLIED') {
      application.submissionMethod = 'manual_user_reported';
      application.confirmationDetails = {
        verifiedBy: 'user_reported',
        confirmationText: reason || 'Manually reported by candidate',
      };
    }

    application.statusHistory.push({
      status,
      reason: reason || `Updated by candidate to ${status}`,
      source: 'user_reported',
    });

    await application.save();

    res.json({
      success: true,
      message: `Application status updated to ${status}.`,
      application,
    });
  } catch (error) {
    next(error);
  }
};

