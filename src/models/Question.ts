import mongoose, { Schema, Document, Model } from 'mongoose';

export type AnswerType =
  | 'text'
  | 'number'
  | 'case_insensitive_text'
  | 'exact_text'
  | 'multiple_choice';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'insane';
export type QuestionDifficulty = DifficultyLevel;

export interface QuestionCodeBlocks {
  python?: string;
  java?: string;
  c?: string;
  cpp?: string;
}

export interface IQuestion extends Document {
  eventId: mongoose.Types.ObjectId;
  questionNumber: number;
  title: string;
  section: string;
  storyText: string;
  storyReveal?: string;
  codeBlock: string;
  codeBlocks?: QuestionCodeBlocks;
  questionText: string;
  answerType: AnswerType;
  correctAnswer: string;
  points: number;
  difficulty: DifficultyLevel;
  hint?: string;
  explanation?: string;
  isFinal: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    questionNumber: {
      type: Number,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      default: 'GENERAL INVESTIGATION',
      trim: true,
    },
    storyText: {
      type: String,
      default: '',
    },
    storyReveal: {
      type: String,
      default: '',
    },
    codeBlock: {
      type: String,
      default: '',
    },
    codeBlocks: {
      python: { type: String, default: '' },
      java: { type: String, default: '' },
      c: { type: String, default: '' },
      cpp: { type: String, default: '' },
    },
    questionText: {
      type: String,
      required: true,
    },
    answerType: {
      type: String,
      enum: ['text', 'number', 'case_insensitive_text', 'exact_text', 'multiple_choice'],
      default: 'case_insensitive_text',
    },
    correctAnswer: {
      type: String,
      required: true,
      select: false, // CRITICAL: Excluded by default from client queries
    },
    points: {
      type: Number,
      required: true,
      default: 10,
      min: [1, 'Points must be at least 1'],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'insane'],
      default: 'medium',
    },
    hint: {
      type: String,
      default: '',
    },
    explanation: {
      type: String,
      default: '',
    },
    isFinal: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

QuestionSchema.index({ eventId: 1, questionNumber: 1 });
QuestionSchema.index({ eventId: 1, isPublished: 1, questionNumber: 1 });

export const Question: Model<IQuestion> =
  mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);

export default Question;
