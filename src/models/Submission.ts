import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubmission extends Document {
  participantId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  submittedAnswer: string;
  isCorrect: boolean;
  pointsAwarded: number;
  attemptNumber: number;
  submittedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
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
    submittedAnswer: {
      type: String,
      required: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
      index: true,
    },
    pointsAwarded: {
      type: Number,
      required: true,
      default: 0,
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

SubmissionSchema.index({ participantId: 1, questionId: 1, attemptNumber: 1 });
SubmissionSchema.index({ eventId: 1, submittedAt: -1 });
SubmissionSchema.index({ participantId: 1, eventId: 1 });

export const Submission: Model<ISubmission> =
  mongoose.models.Submission || mongoose.model<ISubmission>('Submission', SubmissionSchema);

export default Submission;
