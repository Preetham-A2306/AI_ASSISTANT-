/**
 * Question Clustering Service
 * Robust clustering to group semantic question variants into HR analytics topics.
 * Closes algorithmic flaw: Prevents semantic drift and over-clustering on generic verbs (e.g. "book").
 */
import { STOP_WORDS } from '../config/constants.js';

// Curated set of generic verbs, auxiliary words, and broad workplace fillers that should never act as topic anchors
const GENERIC_TERMS = new Set([
  'book', 'booking', 'booked', 'find', 'help', 'need', 'want', 'make', 'take',
  'know', 'tell', 'give', 'show', 'work', 'workplace', 'company', 'policy',
  'process', 'step', 'steps', 'guide', 'guideline', 'guidelines', 'info',
  'information', 'detail', 'details', 'look', 'check', 'start', 'starting',
  'open', 'opening', 'time', 'times', 'timing', 'timings', 'hour', 'hours',
  'date', 'dates', 'day', 'days', 'week', 'month', 'year', 'request', 'apply',
  'form', 'submit', 'system', 'portal', 'change', 'update', 'view', 'access'
]);

/**
 * Extract normalized content tokens from a question string.
 */
export function extractKeyTokens(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(w => {
      // Basic stemming
      if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
      if (w.endsWith('ies') && w.length > 5) return w.slice(0, -3) + 'y';
      if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
      if (w.endsWith('s') && w.length > 4) return w.slice(0, -1);
      return w;
    })
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Jaccard token similarity.
 */
export function calculateSimilarity(tokensA, tokensB) {
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersection++;
    }
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Groups raw questions into cohesive topic clusters using strict multi-tier matching criteria:
 * 1. Jaccard similarity >= 0.30, OR
 * 2. >= 2 shared content tokens AND Jaccard >= 0.18, OR
 * 3. A single shared topic anchor (length >= 4, not in GENERIC_TERMS) covering >= 33% of incoming question tokens.
 *
 * Prevents semantic drift by only letting genuine topic anchors expand a cluster's token vocabulary.
 */
export function groupSimilarQuestions(questionsList = []) {
  const clusters = [];

  for (const item of questionsList) {
    const rawQuestion = (item.question || '').trim();
    if (!rawQuestion) continue;

    const tokens = extractKeyTokens(rawQuestion);
    if (!tokens.length) continue;

    const department = item.department || 'Other';
    const timestamp = item.timestamp || new Date().toISOString();
    const isEscalated = Boolean(item.escalated);

    let bestCluster = null;
    let bestScore = -1;

    for (const cluster of clusters) {
      const sim = calculateSimilarity(tokens, cluster.representativeTokens);
      const sharedTokens = cluster.representativeTokens.filter(t => tokens.includes(t));
      
      // Topic anchors: tokens >= 4 chars not in GENERIC_TERMS
      const sharedTopicAnchors = sharedTokens.filter(t => t.length >= 4 && !GENERIC_TERMS.has(t));
      const anchorCoverage = tokens.length > 0 ? (sharedTopicAnchors.length / tokens.length) : 0;

      // Condition 1: High overall Jaccard similarity
      const cond1 = sim >= 0.30;

      // Condition 2: Multi-token match with moderate similarity
      const cond2 = sharedTokens.length >= 2 && sim >= 0.18;

      // Condition 3: Topic anchor covering >= 33% of question's tokens
      const cond3 = sharedTopicAnchors.length >= 1 && anchorCoverage >= 0.33;

      if (cond1 || cond2 || cond3) {
        // Scoring formula: prioritize Jaccard, bonus for shared tokens and topic anchors
        const score = sim + (sharedTokens.length * 0.15) + (sharedTopicAnchors.length * 0.25);
        if (score > bestScore) {
          bestScore = score;
          bestCluster = cluster;
        }
      }
    }

    if (bestCluster) {
      bestCluster.count++;
      bestCluster.questions.push(rawQuestion);
      bestCluster.phrasings[rawQuestion] = (bestCluster.phrasings[rawQuestion] || 0) + 1;

      // Surface the most frequent phrasing as the canonical topic title
      let maxCount = 0;
      let topPhrasing = bestCluster.topic;
      for (const [phrase, count] of Object.entries(bestCluster.phrasings)) {
        if (count > maxCount) {
          maxCount = count;
          topPhrasing = phrase;
        }
      }
      bestCluster.topic = topPhrasing;

      // Update departments
      bestCluster.departments[department] = (bestCluster.departments[department] || 0) + 1;
      bestCluster.departmentCount = Object.keys(bestCluster.departments).length;

      // Update timestamps
      if (new Date(timestamp) > new Date(bestCluster.lastAsked)) {
        bestCluster.lastAsked = timestamp;
      }

      // Update escalation tracking
      if (isEscalated) {
        bestCluster.escalatedCount = (bestCluster.escalatedCount || 0) + 1;
      }
      bestCluster.escalated = (bestCluster.escalatedCount || 0) > 0;
      bestCluster.uniquePhrasings = Object.keys(bestCluster.phrasings).length;

      // Only topic anchors widen representative tokens to prevent semantic drift
      const newTopicAnchors = tokens.filter(t => t.length >= 4 && !GENERIC_TERMS.has(t));
      bestCluster.representativeTokens = Array.from(new Set([...bestCluster.representativeTokens, ...newTopicAnchors]));
    } else {
      const topicAnchors = tokens.filter(t => t.length >= 4 && !GENERIC_TERMS.has(t));
      const initialTokens = topicAnchors.length > 0 ? topicAnchors : tokens;

      clusters.push({
        topic: rawQuestion,
        representativeTokens: Array.from(new Set(initialTokens)),
        count: 1,
        questions: [rawQuestion],
        phrasings: {
          [rawQuestion]: 1
        },
        uniquePhrasings: 1,
        departments: {
          [department]: 1
        },
        departmentCount: 1,
        lastAsked: timestamp,
        escalated: isEscalated,
        escalatedCount: isEscalated ? 1 : 0
      });
    }
  }

  return clusters.sort((a, b) => b.count - a.count);
}
