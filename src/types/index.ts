export interface SensorData {
  temperature: number;
  humidity: number;
  fanState: boolean;
  autoMode: boolean;
  manualMode: boolean;
  temperatureThreshold: number;
  lastUpdate: Date;
  deviceStatus: "online" | "offline" | "error";
  deviceId?: string;
  deviceName?: string;
  wifiRSSI?: number;
  uptime?: number;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
  connectionId?: string;
}

export interface ESP32Data {
  deviceId: string;
  deviceName?: string;
  temperature: number;
  humidity: number;
  fanState: boolean;
  autoMode: boolean;
  manualMode: boolean;
  temperatureThreshold: number;
  wifiRSSI?: number;
  uptime?: number;
  timestamp?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp: Date;
  error?: string;
}

export interface FanControlRequest {
  state: boolean;
  mode?: "auto" | "manual";
}

export interface ThresholdUpdateRequest {
  threshold: number;
}

export interface ModeChangeRequest {
  autoMode: boolean;
  manualMode: boolean;
}
