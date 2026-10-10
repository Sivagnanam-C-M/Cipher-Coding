import mongoose from 'mongoose';
import dns from 'dns';

// Ensure rock-solid SRV DNS resolution for MongoDB Atlas on Windows environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // safe fallback
}

/**
 * MongoDB connection cache for Next.js hot module reloading
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryServer?: any;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 100,
      minPoolSize: 10,
      maxIdleTimeMS: 60000,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached!.promise = (async () => {
      let uri: string = process.env.MONGODB_URI || '';

      if (!uri) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('[Database] MONGODB_URI environment variable is required in production.');
        }

        // Only if NO URI is configured at all in .env in development, use local memory fallback
        try {
          const { MongoMemoryServer } = await import('mongodb-memory-server');
          if (!cached!.memoryServer) {
            cached!.memoryServer = await MongoMemoryServer.create({
              instance: { launchTimeout: 60000 },
            });
          }
          uri = cached!.memoryServer.getUri();
          console.log('[Database] Connected to dynamic in-memory MongoDB at:', uri);
        } catch (memErr) {
          console.warn('[Database] mongodb-memory-server unavailable, falling back to default localhost URI', memErr);
          uri = 'mongodb://127.0.0.1:27017/cipher_coding';
        }
      }

      try {
        const conn = await mongoose.connect(uri, opts);
        const masked = uri.replace(/:([^:@]+)@/, ':****@');
        console.log('[Database] MongoDB connection established successfully to:', masked);
        return conn;
      } catch (err: any) {
        const masked = uri.replace(/:([^:@]+)@/, ':****@');
        console.error('[Database] Failed to connect to MongoDB URI:', masked, err?.message || err);
        throw err;
      }
    })();
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.conn = null;
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export default connectToDatabase;
