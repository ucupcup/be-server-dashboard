import WebSocket from "ws";
import { SensorDataService } from "../services/SensorDataService";
import { WebSocketService } from "../services/WebSocketService";
import { WebSocketMessage } from "../types";

export class WebSocketHandlers {
  constructor(private sensorService: SensorDataService, private wsService: WebSocketService) {}

  public handleConnection = (ws: WebSocket, req: any): void => {
    this.wsService.addClient(ws);

    // Send current data to new client
    const currentData = this.sensorService.getCurrentData();
    this.wsService.sendToClient(ws, {
      type: "sensor_data",
      data: currentData,
    });

    ws.on("message", (data: WebSocket.Data) => {
      this.handleMessage(ws, data);
    });

    ws.on("close", () => {
      this.wsService.removeClient(ws);
    });

    ws.on("error", (error: Error) => {
      console.error("WebSocket error:", error);
      this.wsService.removeClient(ws);
    });

    // Send ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  };

  private handleMessage = (ws: WebSocket, data: WebSocket.Data): void => {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      console.log("WebSocket message received:", message.type, message.data);

      switch (message.type) {
        case "sensor_data":
          this.handleSensorData(message.data);
          break;

        case "fan_control":
          this.handleFanControl(message.data);
          break;

        case "threshold_update":
          this.handleThresholdUpdate(message.data);
          break;

        case "mode_change":
          this.handleModeChange(message.data);
          break;

        case "device_info":
          this.handleDeviceInfo(message.data);
          break;

        case "client_connected":
          this.handleClientConnected(ws, message.data);
          break;

        case "request_status":
          this.handleStatusRequest(ws);
          break;

        default:
          console.warn("Unknown WebSocket message type:", message.type);
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
      this.wsService.sendToClient(ws, {
        type: "error",
        data: { message: "Invalid message format" },
      });
    }
  };

  private handleSensorData = (data: any): void => {
    const updatedData = this.sensorService.updateSensorData(data);

    // Broadcast to React clients
    this.wsService.broadcastToClients({
      type: "sensor_data",
      data: updatedData,
    });
  };

  private handleFanControl = (data: any): void => {
    const updatedData = this.sensorService.updateFanState(data.state, "manual");

    console.log(`Fan control: ${data.state ? "ON" : "OFF"}`);

    // Broadcast to all clients
    this.wsService.broadcastToClients({
      type: "fan_status",
      data: {
        fanState: updatedData.fanState,
        mode: "manual",
      },
    });
  };

  private handleThresholdUpdate = (data: any): void => {
    const updatedData = this.sensorService.updateThreshold(data.threshold);

    console.log(`Threshold updated: ${data.threshold}°C`);

    // Broadcast to all clients
    this.wsService.broadcastToClients({
      type: "threshold_updated",
      data: {
        threshold: updatedData.temperatureThreshold,
      },
    });
  };

  private handleModeChange = (data: any): void => {
    const updatedData = this.sensorService.updateMode(data.autoMode, data.manualMode);

    console.log(`Mode changed - Auto: ${data.autoMode}, Manual: ${data.manualMode}`);

    // Broadcast to all clients
    this.wsService.broadcastToClients({
      type: "mode_updated",
      data: {
        autoMode: updatedData.autoMode,
        manualMode: updatedData.manualMode,
      },
    });
  };

  private handleDeviceInfo = (data: any): void => {
    const updatedData = this.sensorService.updateSensorData(data);

    this.wsService.setESP32Connection(data.deviceId);
    console.log(`Device info received from ${data.deviceId}`);

    // Broadcast device status
    this.wsService.broadcastToClients({
      type: "device_status",
      data: {
        status: "online",
        deviceId: data.deviceId,
        deviceName: data.deviceName,
      },
    });
  };

  private handleClientConnected = (ws: WebSocket, data: any): void => {
    console.log(`Client connected: ${data.clientType}, ID: ${data.connectionId}`);

    // Send welcome message with current status
    this.wsService.sendToClient(ws, {
      type: "welcome",
      data: {
        message: "Connected to Chicken Farm Backend",
        currentData: this.sensorService.getCurrentData(),
        esp32Connected: this.wsService.isESP32Connected(),
      },
    });
  };

  private handleStatusRequest = (ws: WebSocket): void => {
    const currentData = this.sensorService.getCurrentData();

    this.wsService.sendToClient(ws, {
      type: "status_response",
      data: {
        sensorData: currentData,
        esp32Connected: this.wsService.isESP32Connected(),
        deviceOnline: this.sensorService.isDeviceOnline(),
      },
    });
  };
}
