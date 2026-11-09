import fs from 'fs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { getGeminiModel } from '../../config/gemini.js';
import { env } from '../../config/environment.js';
import { AIUsage } from '../../models/AIUsage.js';

/**
 * Extracts raw plain text from a resume file on disk (PDF or DOCX)
 */
export const extractRawTextFromFile = async (filePath, fileType) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);

    if (fileType === 'pdf') {
      const parsed = await pdfParse(dataBuffer);
      return parsed.text;
    } else if (fileType === 'docx' || fileType === 'doc') {
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      return result.value;
    } else {
      throw new Error(`Unsupported file type: ${fileType}. Supported types: PDF, DOC, DOCX.`);
    }
  } catch (error) {
    console.error(`[Resume Parser Error] Failed to extract raw text: ${error.message}`);
    throw error;
  }
};

/**
 * Deterministic fallback parser if AI is unavailable or rate-limited
 */
export const deterministicResumeExtractor = (rawText) => {
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/);
  const linkedinMatch = rawText.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  const githubMatch = rawText.match(/https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i);

  // Common technical skills keywords dictionary
  const skillKeywords = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'MongoDB', 'Python',
    'Java', 'C++', 'HTML', 'CSS', 'Tailwind', 'Next.js', 'Git', 'Docker', 'AWS',
    'PostgreSQL', 'MySQL', 'Redis', 'GraphQL', 'REST API', 'Redux', 'Playwright', 'Jest'
  ];

  const foundSkills = skillKeywords.filter((skill) =>
    new RegExp(`\\b${skill}\\b`, 'i').test(rawText)
  );

  return {
    personalDetails: {
      fullName: rawText.split('\n')[0]?.trim().slice(0, 50) || '',
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : '',
      city: '',
      state: '',
      country: 'India',
      linkedinUrl: linkedinMatch ? linkedinMatch[0] : '',
      githubUrl: githubMatch ? githubMatch[0] : '',
      portfolioUrl: '',
    },
    education: [],
    experienceType: 'fresher',
    experience: [],
    skills: {
      technical: foundSkills,
      frameworks: [],
      tools: [],
      soft: [],
    },
    projects: [],
    certifications: [],
    summary: rawText.slice(0, 300).replace(/\s+/g, ' ').trim(),
  };
};

/**
 * Uses Google Gemini AI to parse unstructured resume text into a verified schema.
 * STRICT RULE: Never invent qualifications, experience, skills, or fake project metrics.
 */
export const parseResumeWithAI = async (rawText, userId = null) => {
  const model = getGeminiModel();

  if (!model) {
    console.log('[Resume AI] Gemini API key not present, using deterministic fallback.');
    return deterministicResumeExtractor(rawText);
  }

  const prompt = `You are an expert technical resume parser for JobPilot AI.
Parse the following unstructured resume text into an exact JSON object adhering strictly to the facts present in the text.

CRITICAL RULES:
1. NEVER invent qualifications, degrees, or experience not explicitly written.
2. NEVER fabricate skills, projects, certifications, or metrics.
3. If an item is missing or not mentioned, return empty array [] or empty string "".
4. Preserve factual accuracy at all costs.

JSON Schema to return:
{
  "personalDetails": {
    "fullName": "Full Name",
    "email": "user@example.com",
    "phone": "Phone number",
    "city": "Current City",
    "state": "State",
    "country": "Country",
    "linkedinUrl": "https://linkedin.com/in/...",
    "githubUrl": "https://github.com/...",
    "portfolioUrl": "https://..."
  },
  "education": [
    {
      "degree": "B.Tech in Computer Science / BCA / etc.",
      "fieldOfStudy": "Computer Science / etc.",
      "institution": "University / College name",
      "graduationYear": "2024",
      "cgpaOrPercentage": "8.5 / 85%",
      "tenthPercentage": "",
      "twelfthPercentage": ""
    }
  ],
  "experienceType": "fresher or experienced",
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "employmentType": "full-time or internship",
      "startDate": "Mon YYYY",
      "endDate": "Mon YYYY or Present",
      "isCurrent": false,
      "location": "City / Remote",
      "responsibilities": ["Detailed responsibility points from resume"],
      "projects": [],
      "achievements": []
    }
  ],
  "skills": {
    "technical": ["React", "Node.js", "JavaScript"],
    "frameworks": ["Express", "Next.js"],
    "tools": ["Git", "Docker", "VS Code"],
    "soft": ["Problem Solving", "Collaboration"]
  },
  "projects": [
    {
      "title": "Project Name",
      "description": "Factual project description",
      "technologies": ["React", "Node.js"],
      "liveUrl": "",
      "repoUrl": ""
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Org",
      "issueDate": "",
      "credentialUrl": ""
    }
  ],
  "summary": "Professional summary statement"
}

Resume Text:
"""
${rawText.slice(0, 8000)}
"""

Return ONLY valid raw JSON without markdown code fences or conversational text.`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Clean potential markdown wrap
    const cleanedJson = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedJson);

    // Track AI Usage
    if (userId) {
      await AIUsage.create({
        userId,
        model: env.GEMINI_MODEL,
        requestType: 'resume_parse',
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: Math.ceil(responseText.length / 4),
        estimatedCost: 0.0001,
        success: true,
      }).catch((e) => console.warn('[AI Usage Log]', e.message));
    }

    return parsed;
  } catch (error) {
    console.error(`[Resume AI Error] Gemini parsing failed: ${error.message}. Using deterministic fallback.`);
    return deterministicResumeExtractor(rawText);
  }
};

