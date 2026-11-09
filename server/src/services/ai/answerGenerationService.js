import { AnswerBank } from '../../models/AnswerBank.js';
import { getGeminiModel } from '../../config/gemini.js';
import { env } from '../../config/environment.js';
import { AIUsage } from '../../models/AIUsage.js';

let geminiQuotaExceededUntil = 0;

export const PERSONAL_EXPERIENCE_PATTERNS = [
  /challenging experience/i,
  /difficult (situation|challenge|bug|project)/i,
  /conflict (with|between|handled)/i,
  /leadership (experience|situation|role)/i,
  /time you failed/i,
  /failure/i,
  /proudest achievement/i,
  /greatest accomplishment/i,
  /disagreement with (manager|peer|colleague)/i,
  /describe a project/i,
  /tell me about a time/i,
  /give an example of/i,
];

export class AnswerGenerationService {
  /**
   * Checks if question asks for an intimate/personal experience requiring user input
   */
  isPersonalExperienceQuestion(question) {
    if (!question) return false;
    return PERSONAL_EXPERIENCE_PATTERNS.some((pattern) => pattern.test(question));
  }

  /**
   * Generates or retrieves an appropriate answer for an application field/question
   */
  async resolveAnswerForQuestion(userId, questionText, job, profile, preferences) {
    const trimmedQ = questionText.trim();

    // 1. Check AnswerBank for an exact or high-confidence match
    const existingAnswer = await AnswerBank.findOne({
      userId,
      question: { $regex: new RegExp(`^${trimmedQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (existingAnswer && existingAnswer.answer) {
      return {
        answer: existingAnswer.answer,
        source: 'answer_bank_reused',
        verified: existingAnswer.verified,
      };
    }

    // 2. Check for common profile-derived questions
    const qLower = trimmedQ.toLowerCase();

    // Notice Period
    if (qLower.includes('notice period') || qLower.includes('joining availability')) {
      const days = preferences?.noticePeriodDays || 0;
      const answer = days === 0 ? 'Immediate / Available right away' : `${days} days`;
      return { answer, source: 'user_profile' };
    }

    // Relocation
    if (qLower.includes('willing to relocate') || qLower.includes('relocation')) {
      const answer = preferences?.relocationPreference ? 'Yes, willing to relocate.' : 'Prefer remote or current location.';
      return { answer, source: 'user_profile' };
    }

    // Salary Expectations
    if (qLower.includes('expected salary') || qLower.includes('compensation expectation')) {
      const salary = preferences?.salaryPreference?.minimumSalary;
      const currency = preferences?.salaryPreference?.currency || 'INR';
      const answer = salary ? `${currency} ${salary.toLocaleString()}` : 'Negotiable / Commensurate with experience';
      return { answer, source: 'user_profile' };
    }

    // Work authorization / Legal declarations -> ALWAYS require human verification
    if (qLower.includes('sponsorship') || qLower.includes('authorized to work') || qLower.includes('background check') || qLower.includes('disability')) {
      return {
        requiresUserExperience: true,
        reason: 'legal_work_auth',
        question: trimmedQ,
      };
    }

    // 3. Check if this is an experience/situational question requiring human input
    if (this.isPersonalExperienceQuestion(trimmedQ)) {
      return {
        requiresUserExperience: true,
        reason: 'personal_experience',
        question: trimmedQ,
      };
    }

    // 4. For standard questions (e.g. "Why do you want to join?", "Tell me about yourself"),
    // personalize truthfully using candidate's verified background and company info
    const model = getGeminiModel();
    if (!model || Date.now() < geminiQuotaExceededUntil) {
      return {
        answer: `I am interested in the ${job.title} position at ${job.company} as it closely aligns with my software engineering skills and career trajectory.`,
        source: 'default_template',
      };
    }

    const candidateSkills = [
      ...(profile.skills?.technical || []),
      ...(profile.skills?.frameworks || []),
    ];

    const prompt = `You are an AI Application Assistant for JobPilot AI.
Draft a professional, concise, and truthful response for the job application question.

CRITICAL RULES:
1. Do NOT invent achievements, past companies, or fake projects.
2. Rely strictly on the candidate's verified skills and role alignment.
3. Keep the answer direct and natural (2 to 4 sentences).

QUESTION: "${trimmedQ}"
COMPANY: ${job.company}
ROLE: ${job.title}
CANDIDATE NAME: ${profile.personalDetails?.fullName}
CANDIDATE VERIFIED SKILLS: ${candidateSkills.join(', ')}
CANDIDATE SUMMARY: ${profile.summary}

Return only the final answer text without quotes or explanation.`;

    try {
      const result = await model.generateContent(prompt);
      const answerText = result.response.text().trim();

      await AIUsage.create({
        userId,
        model: env.GEMINI_MODEL,
        requestType: 'answer_generation',
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: Math.ceil(answerText.length / 4),
        estimatedCost: 0.00003,
        success: true,
      }).catch(() => {});

      return {
        answer: answerText,
        source: 'ai_personalized',
      };
    } catch (err) {
      if (err.message && (err.message.includes('429') || err.message.includes('Quota exceeded') || err.message.includes('ResourceExhausted'))) {
        geminiQuotaExceededUntil = Date.now() + 15 * 60 * 1000;
        console.warn(`[Answer AI] Gemini Free Tier quota reached (429). Using factual profile template.`);
      } else {
        console.warn(`[Answer AI Warning] ${err.message}`);
      }
      return {
        answer: `My experience in ${candidateSkills.slice(0, 3).join(', ')} directly matches the requirements for ${job.title} at ${job.company}.`,
        source: 'fallback_template',
      };
    }
  }

  /**
   * Refines a candidate's rough experience draft into polished professional wording
   * without introducing any unverified facts.
   */
  async polishUserExperienceDraft(userId, question, userDraft, roleTitle, companyName) {
    const model = getGeminiModel();
    if (!model) return userDraft;

    const prompt = `You are a professional Application Editor.
Polish the candidate's genuine personal experience for an application question.

CRITICAL RULES:
1. Preserve every factual detail, role, outcome, and timeline exactly as given by the candidate.
2. Do NOT add fictional metrics, company names, or accomplishments.
3. Improve sentence structure, professional vocabulary, and clarity.

QUESTION: "${question}"
TARGET ROLE: ${roleTitle} at ${companyName}
CANDIDATE'S ORIGINAL DRAFT:
"""
${userDraft}
"""

Return only the polished response text.`;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      return userDraft;
    }
  }
}

export const answerGenerationService = new AnswerGenerationService();

