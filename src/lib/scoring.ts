import { AnswerType } from '@/models/Question';

export interface AnswerValidationResult {
  isCorrect: boolean;
  normalizedSubmitted: string;
}

/**
 * Validates submitted answer against server-stored correct answer
 * according to question answer type.
 */
export function validateAnswer(
  submitted: string,
  correct: string,
  type: AnswerType
): AnswerValidationResult {
  if (!submitted || !correct) {
    return { isCorrect: false, normalizedSubmitted: submitted || '' };
  }

  const cleanSubmitted = submitted.trim();
  const cleanCorrect = correct.trim();

  let isCorrect = false;

  switch (type) {
    case 'exact_text':
      isCorrect = cleanSubmitted === cleanCorrect;
      break;

    case 'number': {
      const numSubmitted = Number(cleanSubmitted);
      const numCorrect = Number(cleanCorrect);
      isCorrect = !isNaN(numSubmitted) && !isNaN(numCorrect) && numSubmitted === numCorrect;
      break;
    }

    case 'case_insensitive_text':
    case 'text':
    case 'multiple_choice':
    default: {
      // Normalize dashes (em-dash, en-dash, hyphen) and multi-spaces for forgiving evaluation
      const normalize = (s: string) =>
        s.toLowerCase().replace(/[\u2014\u2013—–]/g, '-').replace(/\s+/g, ' ').trim();
      const normSub = normalize(cleanSubmitted);
      const possibleAnswers = cleanCorrect.split('|').map(normalize);
      isCorrect = possibleAnswers.some((ans) => ans === normSub);
      break;
    }
  }

  return {
    isCorrect,
    normalizedSubmitted: cleanSubmitted,
  };
}
