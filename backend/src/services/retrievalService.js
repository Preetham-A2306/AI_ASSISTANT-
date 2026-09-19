import { getDB } from '../models/db.js';
import { STOP_WORDS, SENSITIVE_PATTERNS } from '../config/constants.js';

export function isSensitive(question) {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(question));
}

function clean(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeWord(word) {
  let w = word.toLowerCase();
  if (w.length > 5 && w.endsWith('ies')) {
    w = w.slice(0, -3) + 'y';
  } else if (w.length > 5 && w.endsWith('ing')) {
    w = w.slice(0, -3);
  } else if (w.length > 4 && w.endsWith('ed')) {
    w = w.slice(0, -2);
  } else if (w.length > 4 && w.endsWith('s')) {
    w = w.slice(0, -1);
  }
  return w;
}

export function tokenize(text) {
  return new Set(
    clean(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map(normalizeWord)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word))
  );
}

export function retrieveKnowledge(query) {
  const db = getDB();
  const queryTokens = tokenize(query);

  if (!queryTokens.size) {
    return [];
  }

  const phrase = query.toLowerCase().trim();
  const threshold = Number(process.env.RETRIEVAL_THRESHOLD || 0.15);

  // 1. Search in document chunks
  const chunkMatches = (db.chunks || []).map(chunk => {
    const textTokens = tokenize(`${chunk.documentTitle || ''} ${chunk.section || ''} ${chunk.text || ''}`);
    let exactMatches = 0;
    let partialMatches = 0;

    for (const word of queryTokens) {
      if (textTokens.has(word)) {
        exactMatches++;
      }
      const partial = [...textTokens].some(
        textWord => textWord.includes(word) || word.includes(textWord)
      );
      if (partial) {
        partialMatches++;
      }
    }

    const exactScore = exactMatches / queryTokens.size;
    const partialScore = partialMatches / queryTokens.size;
    const combinedText = `${chunk.documentTitle || ''} ${chunk.section || ''} ${chunk.text || ''}`.toLowerCase();

    let phraseBonus = 0;
    if (phrase.length > 5 && combinedText.includes(phrase)) {
      phraseBonus = 0.3;
    }

    let score = exactScore * 0.6 + partialScore * 0.25 + phraseBonus;

    // Guard against weak coincidental matches (e.g. only 1 generic word matching in a 3+ word question)
    if (queryTokens.size >= 3 && exactScore < 0.45 && phraseBonus === 0) {
      score = 0;
    } else if (queryTokens.size === 2 && exactScore < 0.5 && phraseBonus === 0) {
      score = score * 0.5;
    }

    return {
      type: 'document',
      documentId: chunk.documentId,
      documentTitle: chunk.documentTitle,
      section: chunk.section || 'General',
      text: chunk.text,
      score
    };
  });

  // 2. Search in approved Knowledge Base (HR Approved entries)
  const kbMatches = (db.knowledgeBase || [])
    .filter(kb => kb.status === 'Approved')
    .map(kb => {
      const textTokens = tokenize(`${kb.title} ${kb.content} ${kb.category || ''}`);
      let exactMatches = 0;
      let partialMatches = 0;

      for (const word of queryTokens) {
        if (textTokens.has(word)) {
          exactMatches++;
        }
        const partial = [...textTokens].some(
          textWord => textWord.includes(word) || word.includes(textWord)
        );
        if (partial) {
          partialMatches++;
        }
      }

      const exactScore = exactMatches / queryTokens.size;
      const partialScore = partialMatches / queryTokens.size;
      const combinedText = `${kb.title} ${kb.content} ${kb.category || ''}`.toLowerCase();

      let phraseBonus = 0;
      if (phrase.length > 5 && combinedText.includes(phrase)) {
        phraseBonus = 0.35;
      }

      let score = exactScore * 0.65 + partialScore * 0.25 + phraseBonus + 0.05;

      if (queryTokens.size >= 3 && exactScore < 0.45 && phraseBonus === 0) {
        score = 0;
      } else if (queryTokens.size === 2 && exactScore < 0.5 && phraseBonus === 0) {
        score = score * 0.5;
      }

      return {
        type: 'knowledge_base',
        documentId: kb.id,
        documentTitle: `HR Approved: ${kb.category || 'Company Policy'}`,
        section: kb.title,
        text: kb.content,
        sourceType: 'HR Approved',
        approvedBy: kb.approvedBy,
        score
      };
    });

  const allResults = [...chunkMatches, ...kbMatches];

  return allResults
    .filter(item => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
