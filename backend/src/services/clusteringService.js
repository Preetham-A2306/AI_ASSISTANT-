import { STOP_WORDS } from '../config/constants.js';

function extractKeyTokens(str) {
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

function calculateSimilarity(tokensA, tokensB) {
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

export function groupSimilarQuestions(questionsList = []) {
  const clusters = [];

  for (const item of questionsList) {
    const rawQuestion = (item.question || '').trim();
    if (!rawQuestion) continue;

    const tokens = extractKeyTokens(rawQuestion);
    const department = item.department || 'Other';
    const timestamp = item.timestamp || new Date().toISOString();

    let matchedCluster = null;

    for (const cluster of clusters) {
      const sim = calculateSimilarity(tokens, cluster.representativeTokens);
      const sharedTokens = cluster.representativeTokens.filter(t => tokens.includes(t));
      const hasKeyTopicNoun = sharedTokens.some(t => t.length >= 4 && !['time', 'have', 'need', 'want', 'make'].includes(t));
      
      // Cluster if Jaccard similarity >= 0.25 or shares primary domain topic noun (e.g. "office", "expense", "review")
      if (sim >= 0.25 || sharedTokens.length >= 2 || hasKeyTopicNoun) {
        matchedCluster = cluster;
        // Expand representative tokens so subsequent related variations match
        cluster.representativeTokens = Array.from(new Set([...cluster.representativeTokens, ...tokens]));
        break;
      }
    }

    if (matchedCluster) {
      matchedCluster.count++;
      matchedCluster.questions.push(rawQuestion);
      matchedCluster.departments[department] = (matchedCluster.departments[department] || 0) + 1;
      if (new Date(timestamp) > new Date(matchedCluster.lastAsked)) {
        matchedCluster.lastAsked = timestamp;
      }
      matchedCluster.escalated = matchedCluster.escalated || Boolean(item.escalated);
    } else {
      clusters.push({
        topic: rawQuestion,
        representativeTokens: tokens,
        count: 1,
        questions: [rawQuestion],
        departments: {
          [department]: 1
        },
        lastAsked: timestamp,
        escalated: Boolean(item.escalated)
      });
    }
  }

  return clusters.sort((a, b) => b.count - a.count);
}
