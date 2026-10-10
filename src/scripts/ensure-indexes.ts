import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import Participant from '../models/Participant';
import EventSession from '../models/EventSession';
import ParticipantProgress from '../models/ParticipantProgress';
import Submission from '../models/Submission';
import Question from '../models/Question';
import Event from '../models/Event';
import Admin from '../models/Admin';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  console.log('[INDEX SYNC] Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);

  const models = [
    { name: 'Participant', model: Participant },
    { name: 'EventSession', model: EventSession },
    { name: 'ParticipantProgress', model: ParticipantProgress },
    { name: 'Submission', model: Submission },
    { name: 'Question', model: Question },
    { name: 'Event', model: Event },
    { name: 'Admin', model: Admin },
  ];

  for (const { name, model } of models) {
    console.log(`[INDEX SYNC] Building indexes for ${name}...`);
    await model.syncIndexes();
    const indexes = await model.collection.indexes();
    console.log(`  -> ${name} active indexes (${indexes.length}):`);
    indexes.forEach((idx) => {
      console.log(`     - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
  }

  console.log('[INDEX SYNC] All database indexes verified and synchronized successfully.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[INDEX SYNC] Error:', err);
  process.exit(1);
});
