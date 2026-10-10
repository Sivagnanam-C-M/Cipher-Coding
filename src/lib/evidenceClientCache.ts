'use client';

// Client-side in-memory cache for ultra-fast question loading and navigation
export const clientQuestionCache = new Map<string, any>();

/**
 * Prefetch question data in the background to achieve 0ms transition latency.
 */
export function prefetchQuestionEvidence(questionId: string) {
  if (!questionId || typeof window === 'undefined') return;
  if (clientQuestionCache.has(questionId)) return;

  fetch(`/api/mission/questions/${questionId}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data?.question) {
        clientQuestionCache.set(questionId, data.question);
        // Pre-warm next chained question in idle time
        if (data.question.nextQuestionId && !clientQuestionCache.has(data.question.nextQuestionId)) {
          setTimeout(() => {
            prefetchQuestionEvidence(data.question.nextQuestionId);
          }, 300);
        }
      }
    })
    .catch(() => {});
}

/**
 * Get question data from client cache if available.
 */
export function getCachedClientQuestion(questionId: string) {
  return clientQuestionCache.get(questionId) || null;
}

/**
 * Update or set question data in client cache.
 */
export function setCachedClientQuestion(questionId: string, questionData: any) {
  clientQuestionCache.set(questionId, questionData);
}
