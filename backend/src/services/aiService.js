import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

let geminiClient = null;

try {
  if (GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: GEMINI_API_KEY
    });
    console.log(`[AI] Google GenAI initialized with model: ${GEMINI_MODEL}`);
  } else {
    console.warn('[AI] GEMINI_API_KEY not found in environment; using grounded deterministic fallback.');
  }
} catch (err) {
  console.error('[AI] Initialization error:', err.message);
  geminiClient = null;
}

const SYSTEM_INSTRUCTION = `
You are an AI Onboarding Assistant for a company.

Your job is to answer employee questions using ONLY the supplied company documentation and approved HR knowledge.

RULES:
1. If the documentation contains the answer, answer the employee directly, accurately, and concisely.
2. Do NOT escalate to HR when the documentation already contains the answer.
3. You may combine facts from multiple supplied documents if relevant.
4. NEVER invent company policies, procedures, benefits, dates, names, contacts, salaries, or other company-specific facts.
5. Do NOT use outside world knowledge to invent or assume company policies.
6. If the documentation does not contain enough information to answer with confidence, say exactly:
"I couldn't find an approved company policy that answers this question."
7. Never guess missing facts.
8. Keep the answer clear, helpful, and professional.
9. Mention the relevant source document or policy section where helpful.
10. Never mention internal RAG parameters, embeddings, or retrieval scores.
`;

export async function generateGroundedAnswer(question, retrievedItems) {
  if (!retrievedItems || retrievedItems.length === 0) {
    return {
      answer: "I couldn't find an approved company policy that answers this question. I've automatically forwarded your question to HR so they can provide an accurate answer.",
      escalate: true,
      reason: 'No matching company documentation or approved HR answer found.'
    };
  }

  const context = retrievedItems
    .map((item, index) => `
SOURCE ${index + 1}:
Title: ${item.documentTitle}
Section: ${item.section}
Content:
${item.text}
`)
    .join('\n--------------------\n');

  if (!geminiClient) {
    // Grounded extraction fallback when Gemini API key is missing/offline
    const bestItem = retrievedItems[0];
    const cleanExcerpt = bestItem.text.split('\n').filter(Boolean).slice(0, 4).join(' ');
    return {
      answer: `Based on ${bestItem.documentTitle} (${bestItem.section}):\n\n${cleanExcerpt}`,
      escalate: false,
      reason: ''
    };
  }

  try {
    const response = await geminiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents: `
COMPANY DOCUMENTATION AND APPROVED KNOWLEDGE:
${context}

EMPLOYEE QUESTION:
${question}
`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    const answer = response.text?.trim() || '';

    if (!answer || answer.toLowerCase().includes("couldn't find") || answer.toLowerCase().includes('not mentioned in the provided')) {
      return {
        answer: "I couldn't find an approved company policy that answers this question. I've automatically forwarded your question to HR so they can provide an accurate answer.",
        escalate: true,
        reason: 'Information not sufficiently covered in approved company documents.'
      };
    }

    return {
      answer,
      escalate: false,
      reason: ''
    };
  } catch (error) {
    console.error('[AI] Generation failed:', error.message);
    // Graceful fallback to grounded excerpt rather than a hard failure
    const bestItem = retrievedItems[0];
    if (bestItem) {
      const excerpt = bestItem.text.split('\n').filter(Boolean).slice(0, 3).join(' ');
      return {
        answer: `According to ${bestItem.documentTitle} (${bestItem.section}):\n\n${excerpt}`,
        escalate: false,
        reason: ''
      };
    }

    return {
      answer: "I couldn't find an approved company policy that answers this question. I've automatically forwarded your question to HR so they can provide an accurate answer.",
      escalate: true,
      reason: `AI service temporarily unavailable: ${error.message}`
    };
  }
}
