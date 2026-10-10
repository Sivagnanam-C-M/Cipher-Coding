import crypto from 'crypto';
import Participant from '@/models/Participant';

/**
 * Generate a unique participant code formatted like CYB-XXXX (e.g. CYB-7A42)
 */
export async function generateUniqueParticipantCode(): Promise<string> {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude easily confused chars
  let attempts = 0;

  while (attempts < 10) {
    let suffix = '';
    const bytes = crypto.randomBytes(4);
    for (let i = 0; i < 4; i++) {
      suffix += chars[bytes[i] % chars.length];
    }

    const code = `CYB-${suffix}`;
    const existing = await Participant.findOne({ participantCode: code })
      .select('_id')
      .lean();
    if (!existing) {
      return code;
    }
    attempts++;
  }

  // Fallback to timestamp hex if high collision
  return `CYB-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}
