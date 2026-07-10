import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"
import { parseRawDate } from "../utils/date"

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
  return parseRawDate(timestamp);
}

export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'GOOD':
    case 'EXCELLENT':
      return '!text-emerald-500';
    case 'WARNING':
    case 'MODERATE':
      return '!text-yellow-500';
    case 'POOR':
      return '!text-orange-500';
    case 'DANGER':
    case 'CRITICAL':
    case 'VERY POOR':
      return '!text-red-500';
    default:
      return 'text-system-muted';
  }
}

export function getStatusBgColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'GOOD':
    case 'EXCELLENT':
      return 'bg-emerald-500/10 border-emerald-500/20 !text-emerald-600';
    case 'WARNING':
    case 'MODERATE':
      return 'bg-yellow-500/10 border-yellow-500/20 !text-yellow-600';
    case 'POOR':
      return 'bg-orange-500/10 border-orange-500/20 !text-orange-600';
    case 'DANGER':
    case 'CRITICAL':
    case 'VERY POOR':
      return 'bg-red-500/10 border-red-500/20 !text-red-600';
    default:
      return 'bg-system-bg border-system-border text-system-muted';
  }
}

export type SensorStatus = 'GOOD' | 'WARNING' | 'POOR' | 'DANGER';

export function getSensorStatus(type: string, value: number): SensorStatus {
  switch (type.toLowerCase()) {
    case 'temperature':
    case 'temp':
    case 'temp.':
      if (value <= 30) return 'GOOD';
      if (value <= 35) return 'WARNING';
      if (value <= 40) return 'POOR';
      return 'DANGER';
    case 'humidity':
    case 'hum':
    case 'hum.':
      if (value <= 70) return 'GOOD';
      if (value <= 85) return 'WARNING';
      if (value <= 90) return 'POOR';
      return 'DANGER';
    case 'co2':
    case 'co2 level':
      if (value <= 800) return 'GOOD';
      if (value <= 1200) return 'WARNING';
      if (value <= 2000) return 'POOR';
      return 'DANGER';
    case 'aqi':
    case 'aqi index':
    case 'aqi status':
      if (value <= 100) return 'GOOD';
      if (value <= 200) return 'WARNING';
      if (value <= 300) return 'POOR';
      return 'DANGER';
    case 'nh3':
    case 'ammonia':
    case 'ammonia nh3':
      if (value < 25) return 'GOOD';
      if (value <= 50) return 'WARNING';
      if (value <= 100) return 'POOR';
      return 'DANGER';
    case 'ch4':
    case 'methane':
    case 'methane ch4':
      if (value <= 50) return 'GOOD';
      if (value <= 100) return 'WARNING';
      if (value <= 500) return 'POOR';
      return 'DANGER';
    case 'pm2_5':
    case 'pm2.5':
    case 'pm2.5 feed dust':
      if (value <= 12) return 'GOOD';
      if (value <= 35.4) return 'WARNING';
      if (value <= 55.4) return 'POOR';
      return 'DANGER';
    case 'pm10':
    case 'pm10 coarse dust':
      if (value <= 54) return 'GOOD';
      if (value <= 154) return 'WARNING';
      if (value <= 254) return 'POOR';
      return 'DANGER';
    default:
      return 'GOOD';
  }
}
