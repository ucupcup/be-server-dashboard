import WebSocket from "ws";
import { SensorDataService } from "../services/SensorDataService";
import { WebSocketService } from "../services/WebSocketService";
import { WebSocketMessage } from "../types";

export class WebSocketHandlers {
  constructor(private sensorService: SensorDataService, private wsService: WebSocketService) {}

  public handleConnection = (ws: WebSocket, req: any): void => {
    this.wsService.addClient(ws);

    // Send current data to new client (only if it's not ESP32)
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
      const isESP32 = this.wsService.isESP32WebSocket(ws);
      
      console.log(`WebSocket message received from ${isESP32 ? 'ESP32' : 'React Client'}: ${message.type}`, message.data);

      switch (message.type) {
        case "sensor_data":
          this.handleSensorData(message.data);
          break;

        case "fan_control":
          // Only allow fan control from React clients, not ESP32
          if (!isESP32) {
            this.handleFanControlFromClient(message.data);
          } else {
            this.handleFanControl(message.data);
          }
          break;

        case "threshold_update":
          this.handleThresholdUpdate(message.data);
          break;

        case "mode_change":
          this.handleModeChange(message.data);
          break;

        case "device_info":
          this.handleDeviceInfo(ws, message.data);
          break;

        case "client_connected":
          this.handleClientConnected(ws, message.data);
          break;

        case "request_status":
          this.handleStatusRequest(ws);
          break;

        case "fan_status":
          // ESP32 sending fan status update
          if (isESP32) {
            this.handleFanStatusFromESP32(message.data);
          }
          break;

        case "notification":
          // ESP32 sending notifications
          if (isESP32) {
            this.handleNotificationFromESP32(message.data);
          }
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

    // Broadcast to React clients only
    this.wsService.broadcastToClients({
      type: "sensor_data",
      data: updatedData,
    });
  };

  // Original fan control handler (for ESP32 responses)
  private handleFanControl = (data: any): void => {
    const updatedData = this.sensorService.updateFanState(data.state, "manual");

    console.log(`Fan control acknowledgment from ESP32: ${data.state ? "ON" : "OFF"}`);

    // Broadcast to React clients only
    this.wsService.broadcastToClients({
      type: "fan_status",
      data: {
        fanState: updatedData.fanState,
        mode: "manual",
      },
    });
  };

  // New method: Handle fan control from React clients
  private handleFanControlFromClient = (data: any): void => {
    console.log(`Fan control command from React client: ${data.state ? "ON" : "OFF"}`);

    // Update service state
    const updatedData = this.sensorService.updateFanState(data.state, "manual");

    // Send command to ESP32
    this.wsService.broadcastToESP32({
      type: "fan_control",
      data: {
        state: data.state,
        deviceId: data.deviceId || 'chicken_farm_001',
        mode: 'manual'
      }
    });

    // Update React clients immediately for responsive UI
    this.wsService.broadcastToClients({
      type: "fan_status",
      data: {
        fanState: updatedData.fanState,
        mode: "manual",
        pending: true // Indicate this is pending ESP32 confirmation
      },
    });
  };

  // New method: Handle fan status update from ESP32
  private handleFanStatusFromESP32 = (data: any): void => {
    console.log(`Fan status update from ESP32: ${data.state ? "ON" : "OFF"}`);

    // Update service state with ESP32 confirmation
    const updatedData = this.sensorService.updateFanState(data.state, data.mode);

    // Broadcast confirmed status to React clients
    this.wsService.broadcastToClients({
      type: "fan_status",
      data: {
        fanState: updatedData.fanState,
        mode: data.mode,
        deviceId: data.deviceId,
        confirmed: true // ESP32 has confirmed the state
      },
    });
  };

  // New method: Handle notifications from ESP32
  private handleNotificationFromESP32 = (data: any): void => {
    console.log(`Notification from ESP32: ${data.eventType} - ${data.message}`);

    // Broadcast notification to React clients
    this.wsService.broadcastToClients({
      type: "notification",
      data: {
        eventType: data.eventType,
        message: data.message,
        deviceId: data.deviceId,
        timestamp: data.timestamp
      },
    });
  };

  private handleThresholdUpdate = (data: any): void => {
    const updatedData = this.sensorService.updateThreshold(data.threshold);

    console.log(`Threshold updated: ${data.threshold}°C`);

    // Send to ESP32 if this came from React client
    this.wsService.broadcastToESP32({
      type: "threshold_update",
      data: {
        threshold: data.threshold,
        deviceId: data.deviceId || 'chicken_farm_001'
      }
    });

    // Broadcast to React clients
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

    // Send to ESP32 if this came from React client
    this.wsService.broadcastToESP32({
      type: "mode_change",
      data: {
        autoMode: data.autoMode,
        manualMode: data.manualMode,
        deviceId: data.deviceId || 'chicken_farm_001'
      }
    });

    // Broadcast to React clients
    this.wsService.broadcastToClients({
      type: "mode_updated",
      data: {
        autoMode: updatedData.autoMode,
        manualMode: updatedData.manualMode,
      },
    });
  };

  // Updated to properly set ESP32 WebSocket connection
  private handleDeviceInfo = (ws: WebSocket, data: any): void => {
    const updatedData = this.sensorService.updateSensorData(data);

    // Set this WebSocket as ESP32 connection
    this.wsService.setESP32WebSocket(ws, data.deviceId);
    console.log(`ESP32 device info received from ${data.deviceId}`);

    // Broadcast device status to React clients only
    this.wsService.broadcastToClients({
      type: "device_status",
      data: {
        status: "online",
        deviceId: data.deviceId,
        deviceName: data.deviceName,
      },
    });

    // Send welcome message back to ESP32 with current settings
    this.wsService.sendToClient(ws, {
      type: "welcome",
      data: {
        message: "ESP32 connected successfully",
        currentSettings: {
          autoMode: updatedData.autoMode,
          manualMode: updatedData.manualMode,
          temperatureThreshold: updatedData.temperatureThreshold,
        }
      }
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
        connectionStats: this.wsService.getConnectionStats(),
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
        connectionStats: this.wsService.getConnectionStats(),
      },
    });
  };
}