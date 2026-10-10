import { z } from 'zod';

export const RegisterSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Please enter a valid email address').toLowerCase(),
    college: z.string().min(2, 'College/Institution name is required').max(150),
    preferredLanguage: z.enum(['python', 'java', 'c', 'cpp']).optional().default('python'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password must match'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const LanguageUpdateSchema = z.object({
  preferredLanguage: z.enum(['python', 'java', 'c', 'cpp']),
});

export const LoginSchema = z.object({
  identifier: z.string().min(1, 'Email or Participant ID is required'),
  password: z.string().min(1, 'Password is required'),
});

export const AdminLoginSchema = z.object({
  identifier: z.string().min(1, 'Username or Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const SubmitAnswerSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  submittedAnswer: z.string().min(1, 'Answer cannot be empty'),
});

export const QuestionManageSchema = z.object({
  questionNumber: z.coerce.number().int().min(1),
  title: z.string().min(2, 'Title is required').max(200),
  section: z.string().default('CYBER RECONNAISSANCE'),
  storyText: z.string().default(''),
  codeBlock: z.string().default(''),
  codeBlocks: z
    .object({
      python: z.string().optional(),
      java: z.string().optional(),
      c: z.string().optional(),
      cpp: z.string().optional(),
    })
    .optional(),
  questionText: z.string().min(2, 'Question text is required'),
  answerType: z.enum([
    'text',
    'number',
    'case_insensitive_text',
    'exact_text',
    'multiple_choice',
  ]),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  points: z.coerce.number().int().min(1).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard', 'insane']).default('medium'),
  hint: z.string().default(''),
  explanation: z.string().default(''),
  isFinal: z.boolean().default(false),
  isPublished: z.boolean().default(true),
});

export const EventUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().int().min(1).max(300).optional(),
  status: z
    .enum(['draft', 'registration_open', 'ready', 'live', 'paused', 'ended'])
    .optional(),
  leaderboardEnabled: z.boolean().optional(),
  progressionMode: z.enum(['free', 'sequential']).optional(),
  maxAttempts: z.coerce.number().int().min(0).optional(),
});
