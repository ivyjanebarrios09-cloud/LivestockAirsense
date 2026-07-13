/**
 * Unified Date and Time Utility for the AIRSENSE platform
 * Ensures all timestamps are styled and displayed consistently in the 'Asia/Manila' timezone (GMT+8)
 * without manual offset addition or subtraction.
 */

/**
 * Safely parses various input types into a standard JavaScript Date object.
 * Directly extracts the raw UTC epoch from Firebase and JS/number values.
 * Corrects local-time epoch offsets if they appear in the future.
 */
export function parseRawDate(timestamp: any): Date {
  if (!timestamp) return new Date();

  let d: Date;

  // If already a Date object
  if (timestamp instanceof Date) {
    d = isNaN(timestamp.getTime()) ? new Date() : timestamp;
  } else if (typeof timestamp.toDate === 'function') {
    // If it's a Firestore Timestamp (has toDate method)
    try {
      const parsed = timestamp.toDate();
      d = parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : new Date();
    } catch (e) {
      d = new Date();
    }
  } else if (timestamp && typeof timestamp.seconds === 'number') {
    // Firestore Timestamp style serialized object { seconds: ..., nanoseconds: ... }
    d = new Date(timestamp.seconds * 1000);
  } else if (timestamp && typeof timestamp._seconds === 'number') {
    // Firestore Timestamp serialized as {_seconds: ..., _nanoseconds: ...}
    d = new Date(timestamp._seconds * 1000);
  } else if (typeof timestamp === 'number') {
    // Number timestamp (seconds or milliseconds)
    const isSeconds = timestamp < 30000000000;
    d = new Date(isSeconds ? timestamp * 1000 : timestamp);
  } else if (typeof timestamp === 'string') {
    // String timestamp
    let cleanStr = timestamp.trim();
    // Normalize " at " (e.g., "July 13, 2026 at 11:48:19 PM UTC+8")
    cleanStr = cleanStr.replace(/\s+at\s+/i, ' ');
    // Clean weird unicode space characters like U+202F
    cleanStr = cleanStr.replace(/[\u202F\u00A0\u2000-\u200A]/g, ' ');

    let parsed = new Date(cleanStr);

    // Fallback for YYYYMMDD_HHMMSS
    if (isNaN(parsed.getTime())) {
      const match = cleanStr.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})$/);
      if (match) {
        parsed = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`);
      }
    }

    if (!isNaN(parsed.getTime())) {
      d = parsed;
    } else {
      // Attempt parsing as numeric string
      const num = Number(timestamp);
      if (!isNaN(num) && timestamp.trim() !== '') {
        const isSeconds = num < 30000000000;
        d = new Date(isSeconds ? num * 1000 : num);
      } else {
        d = new Date();
      }
    }
  } else {
    d = new Date();
  }

  // Fallback for unset/invalid/uptime device clocks (e.g. epoch 0, 1970, 1972)
  // Any date before 2025 is considered invalid for this application and falls back to current time.
  if (d.getFullYear() < 2025) {
    return new Date();
  }

  return d;
}

/**
 * Formats a raw UTC timestamp from Firebase or JS into 'Asia/Manila' timezone.
 * Uses Intl.DateTimeFormat directly without adding or subtracting manual offsets.
 *
 * @param timestamp - The raw timestamp (Date, number, string, or Firestore Timestamp object)
 * @param options - Custom Intl.DateTimeFormatOptions. If omitted, defaults to a full DateTime representation.
 */
export function formatPHDate(timestamp: any, options?: Intl.DateTimeFormatOptions): string {
  if (timestamp === undefined || timestamp === null || timestamp === 0) return '';

  const d = parseRawDate(timestamp);

  // If no specific layout is requested, default to full standard date-time layout (akin to toLocaleString)
  const finalOptions: Intl.DateTimeFormatOptions = options || {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };

  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      ...finalOptions
    }).format(d);
  } catch (error) {
    console.error('[formatPHDate] Formatting error:', error);
    // Fallback standard format if formatting fails
    return d.toString();
  }
}
