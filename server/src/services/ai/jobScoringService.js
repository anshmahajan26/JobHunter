import { getGeminiModel } from '../../config/gemini.js';
import { env } from '../../config/environment.js';
import { JobMatch } from '../../models/JobMatch.js';
import { AIUsage } from '../../models/AIUsage.js';

// Circuit breaker to avoid hammering Gemini API when quota is exceeded
let geminiQuotaExceededUntil = 0;

export const isGeminiQuotaExceeded = () => Date.now() < geminiQuotaExceededUntil;

export const getGeminiQuotaStatus = () => {
  const isExceeded = Date.now() < geminiQuotaExceededUntil;
  return {
    isExceeded,
    message: isExceeded
      ? 'Gemini AI token quota is currently 0 (Daily Free Tier limit reached). Please upgrade your Gemini plan at https://ai.google.dev or wait for quota reset.'
      : 'Normal / Operational',
  };
};

export class JobScoringService {
  /**
   * Deterministic pre-filter: checks hard user exclusion rules
   * Returns { excluded: boolean, reason?: string }
   */
  checkHardExclusions(job, preferences) {
    if (!preferences || !preferences.exclusions) {
      return { excluded: false };
    }

    const { exclusions } = preferences;

    // 1. Excluded companies
    if (Array.isArray(exclusions.companies) && exclusions.companies.length > 0) {
      const isBannedCompany = exclusions.companies.some((comp) =>
        job.company.toLowerCase().includes(comp.toLowerCase().trim())
      );
      if (isBannedCompany) {
        return { excluded: true, reason: `Company '${job.company}' is in user exclusion list.` };
      }
    }

    // 2. Unwanted roles
    if (Array.isArray(exclusions.unwantedRoles) && exclusions.unwantedRoles.length > 0) {
      const isUnwantedRole = exclusions.unwantedRoles.some((role) =>
        job.title.toLowerCase().includes(role.toLowerCase().trim())
      );
      if (isUnwantedRole) {
        return { excluded: true, reason: `Job title matches unwanted role rule.` };
      }
    }

    // 3. Unwanted locations
    if (Array.isArray(exclusions.unwantedLocations) && exclusions.unwantedLocations.length > 0) {
      const isUnwantedLoc = exclusions.unwantedLocations.some((loc) =>
        job.location.toLowerCase().includes(loc.toLowerCase().trim())
      );
      if (isUnwantedLoc) {
        return { excluded: true, reason: `Location '${job.location}' matches unwanted location rule.` };
      }
    }

    // 4. Unpaid internships
    if (exclusions.unpaidInternships) {
      const descLower = job.originalDescription.toLowerCase();
      if (descLower.includes('unpaid') || descLower.includes('no compensation') || descLower.includes('without stipend')) {
        return { excluded: true, reason: 'Unpaid internships or roles without compensation are excluded.' };
      }
    }

    // 5. Bond-based jobs
    if (exclusions.bondJobs) {
      const descLower = job.originalDescription.toLowerCase();
      if (descLower.includes('service bond') || descLower.includes('employment bond') || descLower.includes('training agreement fee')) {
        return { excluded: true, reason: 'Bond-based employment agreements are excluded.' };
      }
    }

    return { excluded: false };
  }

  /**
   * Evaluates job relevance using deterministic rules + Gemini AI structured scoring
   */
  async evaluateJobMatch(userId, job, profile, preferences, minimumScore = 80) {
    // 1. Check hard exclusions
    const exclusionCheck = this.checkHardExclusions(job, preferences);
    if (exclusionCheck.excluded) {
      return await JobMatch.findOneAndUpdate(
        { userId, jobId: job._id },
        {
          userId,
          jobId: job._id,
          matchScore: 0,
          matchingSkills: [],
          missingSkills: [],
          relevantExperience: [],
          strengths: [],
          gaps: [exclusionCheck.reason],
          explanation: `Job automatically excluded: ${exclusionCheck.reason}`,
          eligibility: false,
          evaluatedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    // 2. Prepare profile summary for evaluation
    const userSkills = [
      ...(profile.skills?.technical || []),
      ...(profile.skills?.frameworks || []),
      ...(profile.skills?.tools || []),
    ];

    // 3. Check if Gemini quota circuit breaker is active
    if (Date.now() < geminiQuotaExceededUntil) {
      return this.heuristicMatch(userId, job, profile, preferences, userSkills, minimumScore);
    }

    const model = getGeminiModel();

    if (!model) {
      // Deterministic heuristic fallback when Gemini API key is not yet set
      return this.heuristicMatch(userId, job, profile, preferences, userSkills, minimumScore);
    }

    const prompt = `You are the chief AI Job Evaluation Engine for JobPilot AI.
Evaluate the suitability of the candidate for the given job listing accurately and objectively.

CRITICAL INSTRUCTIONS:
- Do NOT hallucinate candidate experience. Use only the provided candidate facts.
- Do NOT arbitrarily invent scores. Score realistically between 0 and 100 based on genuine skill overlap, experience level, and role alignment.
- Return ONLY valid JSON adhering strictly to the schema.

CANDIDATE PROFILE:
- Name: ${profile.personalDetails?.fullName || 'Candidate'}
- Experience Level: ${profile.experienceType || 'fresher'}
- Summary: ${profile.summary || 'N/A'}
- Verified Skills: ${userSkills.join(', ') || 'General software development'}
- Projects: ${JSON.stringify((profile.projects || []).map((p) => ({ title: p.title, tech: p.technologies })))}
- Experience: ${JSON.stringify((profile.experience || []).map((e) => ({ company: e.company, title: e.title, desc: e.responsibilities })))}
- User Custom Instructions: "${preferences.customInstructions || 'Find relevant software engineering roles.'}"
- Preferred Roles: ${(preferences.preferredRoles || []).join(', ') || 'Software Engineer'}
- Preferred Locations: ${(preferences.preferredLocations || []).join(', ') || 'Any / Remote'}

JOB LISTING:
- Company: ${job.company}
- Title: ${job.title}
- Location: ${job.location} (${job.workplaceType})
- Description:
"""
${job.originalDescription.slice(0, 4000)}
"""

JSON SCHEMA TO RETURN:
{
  "matchScore": 85,
  "matchingSkills": ["React", "Node.js", "JavaScript"],
  "missingSkills": ["Docker", "GraphQL"],
  "relevantExperience": ["Built full-stack React/Express application in previous role/project"],
  "strengths": ["Strong frontend fundamentals matching the required UI responsibilities"],
  "gaps": ["Requires 3 years of Kubernetes experience which candidate has not worked with"],
  "eligibility": true,
  "explanation": "Clear, objective breakdown of why this candidate is or is not a match."
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

      // Track AI Usage
      await AIUsage.create({
        userId,
        model: env.GEMINI_MODEL,
        requestType: 'scoring',
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: Math.ceil(text.length / 4),
        estimatedCost: 0.00005,
        success: true,
      }).catch(() => {});

      const finalScore = Math.min(100, Math.max(0, parseInt(parsed.matchScore, 10) || 0));
      const isEligible = finalScore >= minimumScore;

      return await JobMatch.findOneAndUpdate(
        { userId, jobId: job._id },
        {
          userId,
          jobId: job._id,
          matchScore: finalScore,
          matchingSkills: Array.isArray(parsed.matchingSkills) ? parsed.matchingSkills : [],
          missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
          relevantExperience: Array.isArray(parsed.relevantExperience) ? parsed.relevantExperience : [],
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
          gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
          explanation: parsed.explanation || 'Evaluated by JobPilot AI Matching Engine.',
          eligibility: isEligible,
          evaluatedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      if (err.message && (err.message.includes('429') || err.message.includes('Quota exceeded') || err.message.includes('ResourceExhausted'))) {
        geminiQuotaExceededUntil = Date.now() + 15 * 60 * 1000;
        console.warn(`[Matching AI] Gemini Free Tier quota reached (429). Activating deterministic keyword & skill matching engine for remaining jobs.`);
      } else {
        console.warn(`[Matching AI Warning] Gemini scoring failed: ${err.message}. Using deterministic fallback.`);
      }
      return this.heuristicMatch(userId, job, profile, preferences, userSkills, minimumScore);
    }
  }

  /**
   * Deterministic heuristic matching fallback
   */
  async heuristicMatch(userId, job, profile, preferences, userSkills, minimumScore) {
    const titleLower = job.title.toLowerCase();
    const descLower = job.originalDescription.toLowerCase();
    const jobText = `${titleLower} ${descLower}`;

    // 1. Check matching skills
    const matching = [];
    const missing = [];

    for (const skill of userSkills) {
      const sLower = skill.toLowerCase().trim();
      if (!sLower) continue;
      if (
        jobText.includes(sLower) ||
        (sLower === 'react' && (jobText.includes('react.js') || jobText.includes('reactjs'))) ||
        (sLower === 'node.js' && (jobText.includes('nodejs') || jobText.includes('node js'))) ||
        (sLower === 'mern' && (jobText.includes('mongo') || jobText.includes('react') || jobText.includes('node')))
      ) {
        matching.push(skill);
      } else {
        missing.push(skill);
      }
    }

    // 2. Semantic title & role relevance
    let titleBonus = 0;
    const preferredRoles = preferences?.preferredRoles || [];

    const roleConcepts = [
      { pattern: /full\s*stack/i, label: 'Full Stack' },
      { pattern: /frontend|front\s*end|ui|client/i, label: 'Frontend' },
      { pattern: /backend|back\s*end|api|server/i, label: 'Backend' },
      { pattern: /react/i, label: 'React' },
      { pattern: /software\s*(engineer|developer)|sde/i, label: 'Software Engineer' },
      { pattern: /web\s*(developer|engineer)/i, label: 'Web Developer' },
      { pattern: /mern/i, label: 'MERN Stack' },
      { pattern: /ai|llm|machine\s*learning/i, label: 'AI/LLM' },
    ];

    const userConcepts = roleConcepts.filter((c) =>
      preferredRoles.some((r) => c.pattern.test(r)) || userSkills.some((s) => c.pattern.test(s))
    );

    const matchesUserConcept = userConcepts.some((c) => c.pattern.test(titleLower));

    const matchesDirectRole = preferredRoles.some((role) => {
      const rLower = role.toLowerCase().trim();
      const words = rLower.split(/\s+/).filter((w) => w.length > 3);
      return titleLower.includes(rLower) || words.some((w) => titleLower.includes(w));
    });

    if (matchesUserConcept) {
      titleBonus = 35;
    } else if (matchesDirectRole) {
      titleBonus = 25;
    } else if (/engineer|developer|architect|programmer/i.test(titleLower)) {
      titleBonus = 15;
    }

    // 3. Location bonus
    let locationBonus = 0;
    const preferredLocations = preferences?.preferredLocations || [];
    const jobLocLower = (job.location || '').toLowerCase();
    if (
      jobLocLower.includes('remote') ||
      job.workplaceType === 'remote' ||
      preferredLocations.some((loc) => jobLocLower.includes(loc.toLowerCase()))
    ) {
      locationBonus = 10;
    }

    // Skill scoring: each matched skill is worth 12 points up to 50 points
    const skillScore = Math.min(50, matching.length * 12);

    const totalScore = Math.min(98, Math.max(10, skillScore + titleBonus + locationBonus + 10));
    const isEligible = totalScore >= (minimumScore || 70);

    return await JobMatch.findOneAndUpdate(
      { userId, jobId: job._id },
      {
        userId,
        jobId: job._id,
        matchScore: totalScore,
        matchingSkills: matching,
        missingSkills: missing,
        relevantExperience: [`Overlap with ${matching.length} verified technical skills`],
        strengths: matching.length > 0 ? [`Direct alignment in ${matching.slice(0, 3).join(', ')}`] : ['Role domain overlap'],
        gaps: missing.length > 0 ? [`Additional requirements: ${missing.slice(0, 2).join(', ')}`] : [],
        explanation: `Algorithmic analysis identified ${matching.length} matching verified skills and role alignment for '${job.title}'.`,
        eligibility: isEligible,
        evaluatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
  }
}

export const jobScoringService = new JobScoringService();

