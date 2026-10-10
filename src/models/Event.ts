import mongoose, { Schema, Document, Model } from 'mongoose';

export type EventStatus =
  | 'draft'
  | 'registration_open'
  | 'ready'
  | 'live'
  | 'paused'
  | 'ended';

export type ProgressionMode = 'free' | 'sequential';

export interface IEvent extends Document {
  name: string;
  slug: string;
  description: string;
  durationMinutes: number;
  status: EventStatus;
  startTime?: Date;
  endTime?: Date;
  leaderboardEnabled: boolean;
  progressionMode: ProgressionMode;
  maxAttempts: number; // 0 for unlimited
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
      default: 'CIPHER CODING — OPERATION ZERO DAY',
    },
    slug: {
      type: String,
      required: [true, 'Event slug is required'],
      unique: true,
      trim: true,
      default: 'operation-zero-day',
      index: true,
    },
    description: {
      type: String,
      default: 'Individual cybersecurity-themed code-deciphering competition.',
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      default: 40,
      min: [1, 'Duration must be at least 1 minute'],
    },
    status: {
      type: String,
      enum: ['draft', 'registration_open', 'ready', 'live', 'paused', 'ended'],
      default: 'registration_open',
      index: true,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    leaderboardEnabled: {
      type: Boolean,
      default: true,
    },
    progressionMode: {
      type: String,
      enum: ['free', 'sequential'],
      default: 'free',
    },
    maxAttempts: {
      type: Number,
      default: 0, // 0 indicates unlimited attempts
    },
  },
  {
    timestamps: true,
  }
);

export const Event: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);

export default Event;
