import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './environment.js';

let genAIInstance = null;

export const getGeminiClient = () => {
  if (!env.GEMINI_API_KEY) {
    console.warn('[Gemini] GEMINI_API_KEY is not configured in environment variables.');
    return null;
  }
  if (!genAIInstance) {
    genAIInstance = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return genAIInstance;
};

// Candidate models in preference order supported by Google AI Studio
const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

export const getGeminiModel = (initialModel = env.GEMINI_MODEL) => {
  const client = getGeminiClient();
  if (!client) return null;

  return {
    async generateContent(prompt, ...args) {
      const modelsToTry = [
        initialModel,
        ...FALLBACK_MODELS.filter((m) => m !== initialModel),
      ];

      let lastError = null;

      for (const candidate of modelsToTry) {
        try {
          const modelInstance = client.getGenerativeModel({ model: candidate });
          const response = await modelInstance.generateContent(prompt, ...args);
          return response;
        } catch (err) {
          lastError = err;
          const status = err.status || (err.message && err.message.includes('404') ? 404 : err.message && err.message.includes('503') ? 503 : null);
          
          if (status === 404 || status === 503) {
            console.warn(`[Gemini Engine] Model '${candidate}' returned ${status} (${status === 404 ? 'Not Supported' : 'Spike in Demand'}). Trying next candidate...`);
            // Brief 300ms pause before trying next candidate
            await new Promise((r) => setTimeout(r, 300));
            continue;
          }
          
          throw err;
        }
      }

      throw lastError;
    },
  };
};
