import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs))
}

export function parseSafeDate(timestamp: any): Date {
  if (!timestamp) return new Date();

  let d: Date;

  // If it's already a Date object
  if (timestamp instanceof Date) {
    d = isNaN(timestamp.getTime()) ? new Date() : timestamp;
  } else if (typeof timestamp.toDate === 'function') {
    // If it's a Firestore Timestamp (has a toDate method)
    try {
      const parsed = timestamp.toDate();
      d = parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : new Date();
    } catch (e) {
      d = new Date();
    }
  } else if (timestamp && typeof timestamp.seconds === 'number') {
    // If it's a Firestore Timestamp style object (e.g., from JSON deserialization: { seconds: ..., nanoseconds: ... })
    d = new Date(timestamp.seconds * 1000);
  } else if (timestamp && typeof timestamp._seconds === 'number') {
    // If it's a Firestore Timestamp serialized as {_seconds: ..., _nanoseconds: ...}
    d = new Date(timestamp._seconds * 1000);
  } else if (typeof timestamp === 'number') {
    // If it's a number (timestamp)
    // If it's in seconds (e.g. standard Unix timestamp like 171xxxxxxx) vs milliseconds
    const isSeconds = timestamp < 30000000000;
    d = new Date(isSeconds ? timestamp * 1000 : timestamp);
  } else if (typeof timestamp === 'string') {
    // If it's a string
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) {
      d = parsed;
    } else {
      // Try parsing as number
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

  // Handle double-timezone offset issues (e.g. ESP32 saving local-time epoch instead of UTC-time epoch)
  // If the parsed date is more than 5 minutes in the future compared to the current client clock,
  // we subtract the client's local timezone offset to convert the "local-epoch" back to a standard UTC epoch.
  const now = Date.now();
  if (d.getTime() > now + 5 * 60 * 1000) {
    const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000; // negative for positive offsets like GMT+8 (e.g., -480 min = -8 hours)
    const adjustedTime = d.getTime() + tzOffsetMs;
    if (adjustedTime <= now + 5 * 60 * 1000) {
      return new Date(adjustedTime);
    }
  }

  return d;
}
