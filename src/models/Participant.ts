import mongoose, { Schema, Document, Model } from 'mongoose';

export type SupportedLanguage = 'python' | 'java' | 'c' | 'cpp';

export interface IParticipant extends Document {
  name: string;
  email: string;
  college: string;
  participantCode: string;
  preferredLanguage: SupportedLanguage;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    college: {
      type: String,
      required: [true, 'College / Institution is required'],
      trim: true,
    },
    participantCode: {
      type: String,
      required: [true, 'Participant code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    preferredLanguage: {
      type: String,
      enum: ['python', 'java', 'c', 'cpp'],
      default: 'python',
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Never returned by default in queries
    },
  },
  {
    timestamps: true,
  }
);

ParticipantSchema.index({ _id: 1, participantCode: 1, college: 1 });

export const Participant: Model<IParticipant> =
  mongoose.models.Participant || mongoose.model<IParticipant>('Participant', ParticipantSchema);

export default Participant;
