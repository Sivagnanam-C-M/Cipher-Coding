import mongoose, { Schema, Document, Model } from 'mongoose';

export type ProgressStatus = 'available' | 'viewed' | 'solved';

export interface IParticipantProgress extends Document {
  participantId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  status: ProgressStatus;
  firstViewedAt?: Date;
  solvedAt?: Date;
  attempts: number;
  pointsEarned: number;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantProgressSchema = new Schema<IParticipantProgress>(
  {
    participantId: {
      type: Schema.Types.ObjectId,
      ref: 'Participant',
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['available', 'viewed', 'solved'],
      default: 'available',
      index: true,
    },
    firstViewedAt: {
      type: Date,
    },
    solvedAt: {
      type: Date,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    pointsEarned: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

ParticipantProgressSchema.index(
  { participantId: 1, eventId: 1, questionId: 1 },
  { unique: true }
);
ParticipantProgressSchema.index({ eventId: 1, participantId: 1 });
ParticipantProgressSchema.index({ eventId: 1, status: 1, pointsEarned: 1, participantId: 1, solvedAt: 1 });

export const ParticipantProgress: Model<IParticipantProgress> =
  mongoose.models.ParticipantProgress ||
  mongoose.model<IParticipantProgress>('ParticipantProgress', ParticipantProgressSchema);

export default ParticipantProgress;
