import path from 'path';
import fs from 'fs';
import { Resume } from '../models/Resume.js';
import { UserProfile } from '../models/UserProfile.js';
import { Job } from '../models/Job.js';
import { TailoredResume } from '../models/TailoredResume.js';
import { uploadFile } from '../config/cloudinary.js';
import { extractRawTextFromFile, parseResumeWithAI } from '../services/resume/resumeParser.js';
import { resumeTailorService } from '../services/resume/resumeTailorService.js';

export const uploadResume = async (req, res, next) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No resume file uploaded. Please upload a PDF, DOC, or DOCX file.',
      });
    }

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Invalid file format. Only PDF, DOC, and DOCX are supported.',
      });
    }

    // Upload to Cloudinary (falls back to local if not configured)
    const uploadResult = await uploadFile(req.file.path, 'resumes');

    // Extract raw text from file
    let rawText = '';
    try {
      rawText = await extractRawTextFromFile(req.file.path, ext);
    } catch (parseErr) {
      console.warn(`[Resume Extraction Warning] ${parseErr.message}`);
    }

    // Determine version
    const count = await Resume.countDocuments({ userId });
    const version = count + 1;

    // Create Resume Record
    const resume = await Resume.create({
      userId,
      originalFileUrl: uploadResult.url,
      fileName: req.file.originalname,
      fileType: ext,
      fileSize: req.file.size,
      rawText,
      version,
      parsedStatus: 'pending',
    });

    // Clean up temporary local file if uploaded to remote Cloudinary
    if (!uploadResult.isLocalFallback && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Trigger AI parsing automatically in the background or immediately
    let extractedData = {};
    if (rawText) {
      try {
        extractedData = await parseResumeWithAI(rawText, userId);
        resume.extractedData = extractedData;
        resume.parsedStatus = 'parsed';
        await resume.save();

        // Update UserProfile with extracted data if verifiedInformation is not yet locked
        const existingProfile = await UserProfile.findOne({ userId });
        if (existingProfile && !existingProfile.verifiedInformation) {
          if (extractedData.personalDetails) {
            existingProfile.personalDetails = {
              ...existingProfile.personalDetails.toObject(),
              ...extractedData.personalDetails,
            };
          }
          if (extractedData.education && extractedData.education.length > 0) {
            existingProfile.education = extractedData.education;
          }
          if (extractedData.experience && extractedData.experience.length > 0) {
            existingProfile.experience = extractedData.experience;
          }
          if (extractedData.skills) {
            existingProfile.skills = extractedData.skills;
          }
          if (extractedData.projects && extractedData.projects.length > 0) {
            existingProfile.projects = extractedData.projects;
          }
          if (extractedData.certifications && extractedData.certifications.length > 0) {
            existingProfile.certifications = extractedData.certifications;
          }
          if (extractedData.summary) {
            existingProfile.summary = extractedData.summary;
          }
          existingProfile.extractionProvenance = {
            resumeId: resume._id,
            parsedAt: new Date(),
          };
          await existingProfile.save();
        }
      } catch (err) {
        resume.parsedStatus = 'failed';
        resume.parseError = err.message;
        await resume.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Resume uploaded and parsed successfully.',
      resume,
      extractedData,
    });
  } catch (error) {
    next(error);
  }
};

export const getResumes = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const resumes = await Resume.find({ userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      resumes,
    });
  } catch (error) {
    next(error);
  }
};

export const getResumeById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const resume = await Resume.findOne({ _id: req.params.id, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found.',
      });
    }

    res.json({
      success: true,
      resume,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteResume = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const resume = await Resume.findOneAndDelete({ _id: req.params.id, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found.',
      });
    }

    res.json({
      success: true,
      message: 'Resume deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const reparseResume = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const resume = await Resume.findOne({ _id: req.params.id, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found.',
      });
    }

    if (!resume.rawText) {
      return res.status(400).json({
        success: false,
        message: 'No text extracted from this resume to re-parse.',
      });
    }

    const extracted = await parseResumeWithAI(resume.rawText, userId);
    resume.extractedData = extracted;
    resume.parsedStatus = 'parsed';
    await resume.save();

    res.json({
      success: true,
      message: 'Resume re-parsed successfully.',
      extractedData: extracted,
    });
  } catch (error) {
    next(error);
  }
};

export const tailorResumeForJob = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job listing not found.' });
    }

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(400).json({
        success: false,
        message: 'Candidate profile required. Please complete your profile first.',
      });
    }

    const tailoredResume = await resumeTailorService.tailorResumeForJob(userId, job, profile);

    res.json({
      success: true,
      message: 'ATS-friendly resume tailored successfully with aligned keywords.',
      tailoredResume,
    });
  } catch (error) {
    next(error);
  }
};

export const getTailoredResumeForJob = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { jobId } = req.params;

    const tailoredResume = await TailoredResume.findOne({ userId, jobId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      tailoredResume: tailoredResume || null,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadTailoredResume = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const tailoredResume = await TailoredResume.findOne({ _id: id, userId }).populate('jobId');
    if (!tailoredResume) {
      return res.status(404).json({ success: false, message: 'Tailored resume not found.' });
    }

    // Remote Cloudinary URL
    if (tailoredResume.fileUrl.startsWith('http')) {
      return res.redirect(tailoredResume.fileUrl);
    }

    // Local file fallback
    const fileName = path.basename(tailoredResume.fileUrl);
    let localPath = path.resolve('uploads/tailored', fileName);
    if (!fs.existsSync(localPath)) {
      localPath = path.resolve('uploads', fileName);
    }
    if (!fs.existsSync(localPath)) {
      localPath = path.resolve(`.${tailoredResume.fileUrl}`);
    }

    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ success: false, message: 'Resume PDF file not found on disk.' });
    }

    const companyName = (tailoredResume.jobId?.company || 'Job').replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Tailored_Resume_${companyName}.pdf"`);
    fs.createReadStream(localPath).pipe(res);
  } catch (error) {
    next(error);
  }
};



