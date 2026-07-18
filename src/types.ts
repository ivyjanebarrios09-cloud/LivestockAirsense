export interface SensorReading {
  id?: string;
  timestamp: number;
  temperature: number;
  humidity: number;
  ammonia: number;
  methane: number;
  co2: number;
  pm25: number;
  pm10: number;
  aqi: number;
}

export type AlertSeverity = 'Warning' | 'High Risk' | 'Critical' | 'Normal';

export interface Alert {
  id?: string;
  timestamp: number;
  alertType: string;
  severity: AlertSeverity;
  message: string;
  isRead: boolean;
  currentStatus?: string;
  reading?: number | string | null;
  value?: number | string | null;
  location?: string;
  time?: string;
  resolved?: boolean;
}

export interface SystemSettings {
  refreshInterval: number;
  tempThreshold: number;
  co2Threshold: number;
  aqiThreshold: number;
}
