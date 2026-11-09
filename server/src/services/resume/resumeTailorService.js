import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { getGeminiModel } from '../../config/gemini.js';
import { env } from '../../config/environment.js';
import { TailoredResume } from '../../models/TailoredResume.js';
import { Resume } from '../../models/Resume.js';
import { uploadFile } from '../../config/cloudinary.js';
import { AIUsage } from '../../models/AIUsage.js';

let geminiQuotaExceededUntil = 0;

export class ResumeTailorService {
  /**
   * Generates a tailored PDF document on disk using PDFKit
   */
  async generatePdfFile(tailoredData, outputPath) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      // Header: Name & Contact
      doc.fontSize(22).font('Helvetica-Bold').text(tailoredData.fullName || 'Candidate', { align: 'center' });
      doc.moveDown(0.3);

      const contactItems = [
        tailoredData.email,
        tailoredData.phone,
        tailoredData.location,
        tailoredData.linkedinUrl,
        tailoredData.githubUrl,
      ].filter(Boolean);

      doc.fontSize(9).font('Helvetica').fillColor('#4b5563').text(contactItems.join('  •  '), { align: 'center' });
      doc.moveDown(0.8);
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      // Professional Summary
      if (tailoredData.summary) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text('PROFESSIONAL SUMMARY');
        doc.moveDown(0.2);
        doc.fontSize(9.5).font('Helvetica').fillColor('#334155').text(tailoredData.summary, { lineGap: 2 });
        doc.moveDown(0.6);
      }

      // Technical Skills
      if (tailoredData.skills && tailoredData.skills.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text('TECHNICAL SKILLS & COMPETENCIES');
        doc.moveDown(0.2);
        doc.fontSize(9.5).font('Helvetica').fillColor('#334155').text(tailoredData.skills.join('  •  '), { lineGap: 2 });
        doc.moveDown(0.6);
      }

      // Experience
      if (tailoredData.experience && tailoredData.experience.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text('EXPERIENCE');
        doc.moveDown(0.3);

        tailoredData.experience.forEach((exp) => {
          doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0f172a').text(`${exp.title || 'Role'} | ${exp.company || 'Company'}`);
          doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#64748b').text(`${exp.startDate || ''} – ${exp.endDate || 'Present'} | ${exp.location || 'Remote'}`);
          doc.moveDown(0.2);

          if (Array.isArray(exp.responsibilities)) {
            exp.responsibilities.forEach((resp) => {
              doc.fontSize(9).font('Helvetica').fillColor('#334155').text(`•  ${resp}`, { indent: 10, lineGap: 1.5 });
            });
          }
          doc.moveDown(0.4);
        });
      }

      // Projects
      if (tailoredData.projects && tailoredData.projects.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text('KEY PROJECTS');
        doc.moveDown(0.3);

        tailoredData.projects.forEach((proj) => {
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text(proj.title);
          if (proj.technologies && proj.technologies.length > 0) {
            doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#64748b').text(`Technologies: ${proj.technologies.join(', ')}`);
          }
          doc.fontSize(9).font('Helvetica').fillColor('#334155').text(proj.description, { indent: 5, lineGap: 1.5 });
          doc.moveDown(0.3);
        });
      }

      // Education
      if (tailoredData.education && tailoredData.education.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text('EDUCATION');
        doc.moveDown(0.3);

        tailoredData.education.forEach((edu) => {
          doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(`${edu.degree} — ${edu.institution}`);
          doc.fontSize(8.5).font('Helvetica').fillColor('#64748b').text(`Graduation: ${edu.graduationYear || 'N/A'} | CGPA/Score: ${edu.cgpaOrPercentage || 'N/A'}`);
          doc.moveDown(0.2);
        });
      }

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * Tailors user resume specifically for a job position.
   * Fallback rule: If tailoring fails, uses original uploaded resume.
   */
  async tailorResumeForJob(userId, job, profile, originalResumeId = null) {
    // 1. Locate original resume
    let originalResume = null;
    if (originalResumeId) {
      originalResume = await Resume.findById(originalResumeId);
    }
    if (!originalResume) {
      originalResume = await Resume.findOne({ userId, isOriginal: true }).sort({ createdAt: -1 });
    }

    const outputDir = path.resolve('uploads/tailored');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const uniqueId = `${userId}_${job._id}_${Date.now()}`;
    const localPdfPath = path.join(outputDir, `tailored_${uniqueId}.pdf`);

    // Combine verified user skills
    const candidateSkills = [
      ...(profile.skills?.technical || []),
      ...(profile.skills?.frameworks || []),
      ...(profile.skills?.tools || []),
    ];

    const model = getGeminiModel();

    // Extract ATS keywords from job description aligned with candidate genuine background
    const descLower = job.originalDescription.toLowerCase();
    const commonAtsKeywords = [
      'react', 'node.js', 'javascript', 'typescript', 'python', 'java', 'c++', 'aws', 'docker',
      'kubernetes', 'rest api', 'graphql', 'mongodb', 'postgresql', 'mysql', 'sql', 'redis',
      'ci/cd', 'git', 'microservices', 'agile', 'scrum', 'html5', 'css3', 'tailwind',
      'next.js', 'express', 'system design', 'testing', 'jest', 'unit testing', 'cloud',
      'performance optimization', 'frontend', 'backend', 'full stack', 'api development'
    ];

    const matchedJobKeywords = commonAtsKeywords.filter((kw) => descLower.includes(kw));
    const alignedAtsKeywords = Array.from(new Set([
      ...matchedJobKeywords.filter((kw) => candidateSkills.some((s) => s.toLowerCase().includes(kw) || kw.includes(s.toLowerCase()))),
      ...candidateSkills.filter((s) => descLower.includes(s.toLowerCase())),
    ]));

    let tailoringMetadata = {
      highlightedSkills: candidateSkills.slice(0, 8),
      alignedKeywords: alignedAtsKeywords.length > 0 ? alignedAtsKeywords : candidateSkills.slice(0, 8),
      reorderedSections: ['Summary', 'Skills', 'Experience', 'Projects', 'Education'],
      wordingImprovements: ['Enhanced alignment with target job requirements'],
      summaryStatement: profile.summary || `Software Engineer with demonstrated skills in ${candidateSkills.slice(0, 4).join(', ')}.`,
    };

    let tailoredData = {
      fullName: profile.personalDetails?.fullName || 'Candidate',
      email: profile.personalDetails?.email || '',
      phone: profile.personalDetails?.phone || '',
      location: [profile.personalDetails?.city, profile.personalDetails?.country].filter(Boolean).join(', ') || 'Remote',
      linkedinUrl: profile.personalDetails?.linkedinUrl || '',
      githubUrl: profile.personalDetails?.githubUrl || '',
      summary: tailoringMetadata.summaryStatement,
      skills: candidateSkills,
      experience: profile.experience || [],
      projects: profile.projects || [],
      education: profile.education || [],
    };

    // If Gemini is available and quota not exceeded, optimize phrasing strictly without fabricating experience
    if (model && Date.now() >= geminiQuotaExceededUntil) {
      const prompt = `You are a professional Executive Resume Strategist for JobPilot AI.
Tailor the candidate's verified background specifically for the provided job position.

CRITICAL RULES:
1. NEVER invent qualifications, employment history, degrees, or companies.
2. NEVER fabricate skills the user does not possess.
3. Re-order the candidate's existing real experiences, emphasize the most relevant accomplishments, and refine bullet points to highlight alignment with the job description.
4. Formulate an impactful 2-3 sentence professional summary highlighting candidate's genuine background tailored to ${job.company}'s ${job.title} role.

CANDIDATE FACTS:
- Skills: ${candidateSkills.join(', ')}
- Summary: ${profile.summary}
- Experience: ${JSON.stringify(profile.experience)}
- Projects: ${JSON.stringify(profile.projects)}

TARGET JOB:
- Company: ${job.company}
- Title: ${job.title}
- Description excerpt:
"""
${job.originalDescription.slice(0, 2500)}
"""

JSON SCHEMA TO RETURN:
{
  "summary": "Impactful tailored summary aligned with the role",
  "highlightedSkills": ["Skill1", "Skill2"],
  "alignedKeywords": ["ATS Keyword 1", "ATS Keyword 2"],
  "reorderedExperience": [
    {
      "company": "Company",
      "title": "Title",
      "startDate": "...",
      "endDate": "...",
      "responsibilities": ["Refined professional bullet points preserving factual truth"]
    }
  ],
  "wordingImprovements": ["Emphasized scalable system design experience"]
}`;

      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const cleaned = text
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        const parsed = JSON.parse(cleaned);

        if (parsed.summary) tailoredData.summary = parsed.summary;
        if (Array.isArray(parsed.highlightedSkills) && parsed.highlightedSkills.length > 0) {
          tailoredData.skills = Array.from(new Set([...parsed.highlightedSkills, ...candidateSkills]));
          tailoringMetadata.highlightedSkills = parsed.highlightedSkills;
        }
        if (Array.isArray(parsed.alignedKeywords) && parsed.alignedKeywords.length > 0) {
          tailoringMetadata.alignedKeywords = Array.from(new Set([...parsed.alignedKeywords, ...tailoringMetadata.alignedKeywords]));
        }
        if (Array.isArray(parsed.reorderedExperience) && parsed.reorderedExperience.length > 0) {
          tailoredData.experience = parsed.reorderedExperience;
        }
        if (Array.isArray(parsed.wordingImprovements)) {
          tailoringMetadata.wordingImprovements = parsed.wordingImprovements;
        }

        await AIUsage.create({
          userId,
          model: env.GEMINI_MODEL,
          requestType: 'resume_tailor',
          inputTokens: Math.ceil(prompt.length / 4),
          outputTokens: Math.ceil(text.length / 4),
          estimatedCost: 0.00008,
          success: true,
        }).catch(() => {});
      } catch (err) {
        if (err.message && (err.message.includes('429') || err.message.includes('Quota exceeded') || err.message.includes('ResourceExhausted'))) {
          geminiQuotaExceededUntil = Date.now() + 15 * 60 * 1000;
          console.warn(`[Tailor AI] Gemini Free Tier quota reached (429). Generating clean tailored PDF directly from verified profile.`);
        } else {
          console.warn(`[Tailor AI Warning] Gemini tailoring failed: ${err.message}. Generating clean PDF from verified profile.`);
        }
      }
    }

    try {
      // Generate PDF
      await this.generatePdfFile(tailoredData, localPdfPath);

      // Upload to Cloudinary (or local fallback)
      const uploadResult = await uploadFile(localPdfPath, 'tailored');

      // Clean local file if uploaded remotely
      if (!uploadResult.isLocalFallback && fs.existsSync(localPdfPath)) {
        fs.unlinkSync(localPdfPath);
      }

      // Check existing version count
      const existingCount = await TailoredResume.countDocuments({ userId, jobId: job._id });

      const tailoredResume = await TailoredResume.create({
        userId,
        jobId: job._id,
        originalResumeId: originalResume ? originalResume._id : null,
        fileUrl: uploadResult.url,
        version: existingCount + 1,
        tailoringMetadata,
      });

      return tailoredResume;
    } catch (pdfErr) {
      console.error(`[Tailor PDF Error] Failed to generate tailored PDF: ${pdfErr.message}`);
      // Fallback: If tailoring fails, use original uploaded resume
      if (originalResume) {
        return {
          fileUrl: originalResume.originalFileUrl,
          isOriginalFallback: true,
          originalResumeId: originalResume._id,
        };
      }
      throw pdfErr;
    }
  }
}

export const resumeTailorService = new ResumeTailorService();

