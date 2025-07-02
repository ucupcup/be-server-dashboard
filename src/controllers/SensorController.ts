import { Request, Response } from "express";
import { SensorDataService } from "../services/SensorDataService";
import { WebSocketService } from "../services/WebSocketService";
import { ESP32Data, ApiResponse } from "../types";

export class SensorController {
  constructor(private sensorService: SensorDataService, private wsService: WebSocketService) {}

  public healthCheck = (req: Request, res: Response): void => {
    const response: ApiResponse = {
      success: true,
      data: {
        status: "OK",
        connections: this.wsService.getClientCount(),
        esp32Connected: this.wsService.isESP32Connected(),
        deviceOnline: this.sensorService.isDeviceOnline(),
      },
      timestamp: new Date(),
    };

    res.json(response);
  };

  public getCurrentSensorData = (req: Request, res: Response): void => {
    try {
      const sensorData = this.sensorService.getCurrentData();

      const response: ApiResponse = {
        success: true,
        data: sensorData,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      console.error("Error getting sensor data:", error);

      const response: ApiResponse = {
        success: false,
        message: "Error retrieving sensor data",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };

      res.status(500).json(response);
    }
  };

  public receiveSensorData = (req: Request, res: Response): void => {
    try {
      console.log("Received sensor data from ESP32:", req.body);

      const esp32Data: ESP32Data = req.body;

      // Validate required fields
      if (!esp32Data.deviceId || esp32Data.temperature === undefined || esp32Data.humidity === undefined) {
        const response: ApiResponse = {
          success: false,
          message: "Missing required fields",
          timestamp: new Date(),
        };
        res.status(400).json(response);
        return;
      }

      // Update sensor data
      const updatedData = this.sensorService.updateSensorData(esp32Data);

      // Set ESP32 connection
      this.wsService.setESP32Connection(esp32Data.deviceId);

      // Broadcast to all connected clients
      this.wsService.broadcastToClients({
        type: "sensor_data",
        data: updatedData,
      });

      // Response to ESP32
      const response: ApiResponse = {
        success: true,
        message: "Data received successfully",
        data: {
          fanControl: updatedData.manualMode ? updatedData.fanState : undefined,
          autoMode: updatedData.autoMode,
          temperatureThreshold: updatedData.temperatureThreshold,
        },
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      console.error("Error processing sensor data:", error);

      const response: ApiResponse = {
        success: false,
        message: "Error processing sensor data",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };

      res.status(500).json(response);
    }
  };

  public controlFan = (req: Request, res: Response): void => {
    try {
      const { state, mode }: { state: boolean; mode?: "auto" | "manual" } = req.body;

      if (typeof state !== "boolean") {
        const response: ApiResponse = {
          success: false,
          message: "Invalid fan state. Must be boolean.",
          timestamp: new Date(),
        };
        res.status(400).json(response);
        return;
      }

      const updatedData = this.sensorService.updateFanState(state, mode);

      // Broadcast fan control to ESP32 and clients
      this.wsService.broadcastToClients({
        type: "fan_control",
        data: {
          state: updatedData.fanState,
          mode: mode,
        },
      });

      const response: ApiResponse = {
        success: true,
        message: "Fan control updated",
        data: {
          fanState: updatedData.fanState,
          mode: mode,
        },
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      console.error("Error controlling fan:", error);

      const response: ApiResponse = {
        success: false,
        message: "Error controlling fan",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };

      res.status(500).json(response);
    }
  };

  public updateThreshold = (req: Request, res: Response): void => {
    try {
      const { threshold }: { threshold: number } = req.body;

      if (typeof threshold !== "number" || threshold < 0 || threshold > 100) {
        const response: ApiResponse = {
          success: false,
          message: "Invalid threshold. Must be a number between 0 and 100.",
          timestamp: new Date(),
        };
        res.status(400).json(response);
        return;
      }

      const updatedData = this.sensorService.updateThreshold(threshold);

      // Broadcast threshold update
      this.wsService.broadcastToClients({
        type: "threshold_update",
        data: {
          threshold: updatedData.temperatureThreshold,
        },
      });

      const response: ApiResponse = {
        success: true,
        message: "Threshold updated",
        data: {
          temperatureThreshold: updatedData.temperatureThreshold,
        },
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      console.error("Error updating threshold:", error);

      const response: ApiResponse = {
        success: false,
        message: "Error updating threshold",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };

      res.status(500).json(response);
    }
  };

  public changeMode = (req: Request, res: Response): void => {
    try {
      const { autoMode, manualMode }: { autoMode: boolean; manualMode: boolean } = req.body;

      if (typeof autoMode !== "boolean" || typeof manualMode !== "boolean") {
        const response: ApiResponse = {
          success: false,
          message: "Invalid mode values. Both autoMode and manualMode must be boolean.",
          timestamp: new Date(),
        };
        res.status(400).json(response);
        return;
      }

      const updatedData = this.sensorService.updateMode(autoMode, manualMode);

      // Broadcast mode change
      this.wsService.broadcastToClients({
        type: "mode_change",
        data: {
          autoMode: updatedData.autoMode,
          manualMode: updatedData.manualMode,
        },
      });

      const response: ApiResponse = {
        success: true,
        message: "Mode updated",
        data: {
          autoMode: updatedData.autoMode,
          manualMode: updatedData.manualMode,
        },
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      console.error("Error updating mode:", error);

      const response: ApiResponse = {
        success: false,
        message: "Error updating mode",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };

      res.status(500).json(response);
    }
  };
}
