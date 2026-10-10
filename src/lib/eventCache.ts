import Event, { IEvent } from '@/models/Event';
import connectToDatabase from '@/lib/mongodb';

let cachedEvent: any = null;
let cachedEventTime = 0;
const EVENT_CACHE_TTL_MS = 15000; // 15-second TTL in-memory cache

/**
 * Retrieve the Operation Zero Day event document with high-speed in-memory caching.
 * Saves 100-200ms of MongoDB network round-trip latency on every API request.
 */
export async function getCachedEvent(forceRefresh = false): Promise<any> {
  const now = Date.now();
  if (!forceRefresh && cachedEvent && now - cachedEventTime < EVENT_CACHE_TTL_MS) {
    return cachedEvent;
  }

  await connectToDatabase();
  const event = await Event.findOne({ slug: 'operation-zero-day' }).lean();
  if (event) {
    cachedEvent = event;
    cachedEventTime = now;
  }
  return cachedEvent;
}

/**
 * Invalidate the cached event when administrative changes are applied.
 */
export function invalidateCachedEvent(): void {
  cachedEvent = null;
  cachedEventTime = 0;
}
