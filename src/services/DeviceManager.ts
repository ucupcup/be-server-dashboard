import { SensorData } from "../types";
import { logger } from "../utils/logger";

export interface Device {
  id: string;
  name: string;
  lastSeen: Date;
  status: "online" | "offline" | "error";
  metadata: {
    wifiRSSI?: number;
    uptime?: number;
    version?: string;
  };
}

export class DeviceManager {
  private devices: Map<string, Device> = new Map();
  private readonly offlineTimeout = 30000; // 30 seconds

  public registerDevice(deviceId: string, deviceName?: string, metadata?: any): Device {
    const existingDevice = this.devices.get(deviceId);

    const device: Device = {
      id: deviceId,
      name: deviceName || existingDevice?.name || `Device ${deviceId}`,
      lastSeen: new Date(),
      status: "online",
      metadata: {
        ...existingDevice?.metadata,
        ...metadata,
      },
    };

    this.devices.set(deviceId, device);
    logger.info(`Device registered: ${deviceId}`, device);

    return device;
  }

  public updateDeviceStatus(deviceId: string, metadata?: any): Device | null {
    const device = this.devices.get(deviceId);

    if (!device) {
      logger.warn(`Attempted to update unknown device: ${deviceId}`);
      return null;
    }

    device.lastSeen = new Date();
    device.status = "online";

    if (metadata) {
      device.metadata = { ...device.metadata, ...metadata };
    }

    this.devices.set(deviceId, device);

    return device;
  }

  public getDevice(deviceId: string): Device | null {
    return this.devices.get(deviceId) || null;
  }

  public getAllDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  public getOnlineDevices(): Device[] {
    return this.getAllDevices().filter((device) => device.status === "online");
  }

  public checkDeviceStatus(): Device[] {
    const now = new Date();
    const offlineDevices: Device[] = [];

    this.devices.forEach((device) => {
      const timeDiff = now.getTime() - device.lastSeen.getTime();

      if (timeDiff > this.offlineTimeout && device.status === "online") {
        device.status = "offline";
        offlineDevices.push(device);
        logger.warn(`Device went offline: ${device.id}`);
      }
    });

    return offlineDevices;
  }

  public removeDevice(deviceId: string): boolean {
    const removed = this.devices.delete(deviceId);
    if (removed) {
      logger.info(`Device removed: ${deviceId}`);
    }
    return removed;
  }

  public getDeviceCount(): number {
    return this.devices.size;
  }

  public getOnlineDeviceCount(): number {
    return this.getOnlineDevices().length;
  }
}
