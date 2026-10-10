import mongoose, { Schema, Document, Model } from 'mongoose';

export type SessionStatus =
  | 'not_attended'
  | 'not_started'
  | 'active'
  | 'completed'
  | 'expired';

export type EndReason =
  | 'time_expired'
  | 'manual_submit'
  | 'tab_switch_exceeded'
  | 'admin_action';

export interface IEventSession extends Document {
  participantId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  startedAt?: Date;
  expiresAt?: Date;
  completedAt?: Date;
  status: SessionStatus;
  tabSwitchCount: number;
  maxTabSwitches: number;
  endReason?: EndReason;
  createdAt: Date;
  updatedAt: Date;
}

const EventSessionSchema = new Schema<IEventSession>(
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
    startedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    completedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['not_attended', 'not_started', 'active', 'completed', 'expired'],
      default: 'not_attended',
      index: true,
    },
    tabSwitchCount: {
      type: Number,
      default: 0,
    },
    maxTabSwitches: {
      type: Number,
      default: 3,
    },
    endReason: {
      type: String,
      enum: ['time_expired', 'manual_submit', 'tab_switch_exceeded', 'admin_action'],
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

EventSessionSchema.index({ participantId: 1, eventId: 1 }, { unique: true });
EventSessionSchema.index({ eventId: 1, status: 1 });
EventSessionSchema.index({ eventId: 1, participantId: 1, status: 1 });

export const EventSession: Model<IEventSession> =
  mongoose.models.EventSession || mongoose.model<IEventSession>('EventSession', EventSessionSchema);

export default EventSession;
