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

  // If it's already a Date object
  if (timestamp instanceof Date) {
    return isNaN(timestamp.getTime()) ? new Date() : timestamp;
  }

  // If it's a Firestore Timestamp (has a toDate method)
  if (typeof timestamp.toDate === 'function') {
    try {
      const d = timestamp.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) {
        return d;
      }
    } catch (e) {
      console.error('Error parsing timestamp.toDate()', e);
    }
  }

  // If it's a Firestore Timestamp style object (e.g., from JSON deserialization: { seconds: ..., nanoseconds: ... })
  if (timestamp && typeof timestamp.seconds === 'number') {
    const d = new Date(timestamp.seconds * 1000);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  // If it's a Firestore Timestamp serialized as {_seconds: ..., _nanoseconds: ...}
  if (timestamp && typeof timestamp._seconds === 'number') {
    const d = new Date(timestamp._seconds * 1000);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  // If it's a number (timestamp)
  if (typeof timestamp === 'number') {
    // If it's in seconds (e.g. standard Unix timestamp like 171xxxxxxx) vs milliseconds
    const isSeconds = timestamp < 30000000000;
    const d = new Date(isSeconds ? timestamp * 1000 : timestamp);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  // If it's a string
  if (typeof timestamp === 'string') {
    // Try native Date parsing
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return d;
    }

    // Try parsing as number
    const num = Number(timestamp);
    if (!isNaN(num) && timestamp.trim() !== '') {
      const isSeconds = num < 30000000000;
      const d2 = new Date(isSeconds ? num * 1000 : num);
      if (!isNaN(d2.getTime())) {
        return d2;
      }
    }
  }

  // Fallback
  return new Date();
}
