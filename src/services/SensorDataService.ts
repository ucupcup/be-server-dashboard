import { SensorData, ESP32Data } from "../types";

export class SensorDataService {
  private sensorData: SensorData = {
    temperature: 25.0,
    humidity: 60.0,
    fanState: false,
    autoMode: true,
    manualMode: false,
    temperatureThreshold: 30.0,
    lastUpdate: new Date(),
    deviceStatus: "offline",
  };

  public getCurrentData(): SensorData {
    return { ...this.sensorData };
  }

  public updateSensorData(data: ESP32Data): SensorData {
    this.sensorData = {
      ...this.sensorData,
      temperature: parseFloat(data.temperature.toString()),
      humidity: parseFloat(data.humidity.toString()),
      fanState: Boolean(data.fanState),
      autoMode: Boolean(data.autoMode),
      manualMode: Boolean(data.manualMode),
      temperatureThreshold: parseFloat(data.temperatureThreshold.toString()),
      lastUpdate: new Date(),
      deviceStatus: "online",
      deviceId: data.deviceId,
      deviceName: data.deviceName,
      wifiRSSI: data.wifiRSSI,
      uptime: data.uptime,
    };

    return this.getCurrentData();
  }

  public updateFanState(state: boolean, mode?: "auto" | "manual"): SensorData {
    this.sensorData.fanState = state;

    if (mode) {
      this.sensorData.manualMode = mode === "manual";
      this.sensorData.autoMode = mode === "auto";
    }

    return this.getCurrentData();
  }

  public updateThreshold(threshold: number): SensorData {
    this.sensorData.temperatureThreshold = threshold;
    return this.getCurrentData();
  }

  public updateMode(autoMode: boolean, manualMode: boolean): SensorData {
    this.sensorData.autoMode = autoMode;
    this.sensorData.manualMode = manualMode;
    return this.getCurrentData();
  }

  public setDeviceStatus(status: "online" | "offline" | "error"): SensorData {
    this.sensorData.deviceStatus = status;
    if (status === "offline") {
      this.sensorData.lastUpdate = new Date();
    }
    return this.getCurrentData();
  }

  public isDeviceOnline(): boolean {
    const now = new Date();
    const lastUpdate = new Date(this.sensorData.lastUpdate);
    const timeDiff = now.getTime() - lastUpdate.getTime();

    return timeDiff <= 30000; // 30 seconds
  }
}
