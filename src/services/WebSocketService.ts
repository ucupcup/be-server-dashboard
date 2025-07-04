import WebSocket from "ws";
import { WebSocketMessage } from "../types";
import { config } from "../config";

export class WebSocketService {
  private clients: Set<WebSocket> = new Set();
  private esp32Connection: WebSocket | null = null;
  private esp32DeviceId: string | null = null;

  public addClient(ws: WebSocket): void {
    this.clients.add(ws);
    console.log(`New WebSocket client connected. Total clients: ${this.clients.size}`);
  }

  public removeClient(ws: WebSocket): void {
    this.clients.delete(ws);
    
    // If the removed client was ESP32, clear the connection
    if (ws === this.esp32Connection) {
      this.clearESP32Connection();
      console.log('ESP32 connection removed');
    }
    
    console.log(`WebSocket client disconnected. Total clients: ${this.clients.size}`);
  }

  /**
   * Broadcast message to all React clients (excluding ESP32)
   */
  public broadcastToClients(message: WebSocketMessage): void {
    const messageString = JSON.stringify({
      ...message,
      timestamp: Date.now(),
    });

    let successCount = 0;

    this.clients.forEach((client) => {
      // Skip ESP32 connection when broadcasting to clients
      if (client !== this.esp32Connection && client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageString);
          successCount++;
        } catch (error) {
          console.error("Error sending message to client:", error);
          this.clients.delete(client);
        }
      } else if (client.readyState !== WebSocket.OPEN) {
        this.clients.delete(client);
      }
    });

    console.log(`Broadcasted ${message.type} to ${successCount} React clients`);
  }

  /**
   * Send message specifically to ESP32 device
   */
  public broadcastToESP32(message: WebSocketMessage): void {
    if (this.esp32Connection && this.esp32Connection.readyState === WebSocket.OPEN) {
      try {
        const messageString = JSON.stringify({
          ...message,
          timestamp: Date.now(),
        });
        
        this.esp32Connection.send(messageString);
        console.log(`Message sent to ESP32 (${this.esp32DeviceId}): ${message.type}`, message.data);
      } catch (error) {
        console.error('Failed to send message to ESP32:', error);
        this.clearESP32Connection();
      }
    } else {
      console.warn(`ESP32 not connected. Message not sent: ${message.type}`);
    }
  }

  /**
   * Broadcast message to ALL connections (ESP32 + React clients)
   */
  public broadcastToAll(message: WebSocketMessage): void {
    const messageString = JSON.stringify({
      ...message,
      timestamp: Date.now(),
    });

    let successCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageString);
          successCount++;
        } catch (error) {
          console.error("Error sending message to client:", error);
          this.clients.delete(client);
        }
      } else {
        this.clients.delete(client);
      }
    });

    console.log(`Broadcasted ${message.type} to ${successCount}/${this.clients.size} total connections`);
  }

  public sendToClient(ws: WebSocket, message: WebSocketMessage): boolean {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(
          JSON.stringify({
            ...message,
            timestamp: Date.now(),
          })
        );
        return true;
      } catch (error) {
        console.error("Error sending message to specific client:", error);
        this.clients.delete(ws);
        return false;
      }
    }
    return false;
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public getReactClientCount(): number {
    let count = 0;
    this.clients.forEach((client) => {
      if (client !== this.esp32Connection) {
        count++;
      }
    });
    return count;
  }

  /**
   * Set ESP32 connection when device connects
   */
  public setESP32Connection(deviceId: string, ws?: WebSocket): void {
    this.esp32DeviceId = deviceId;
    
    // If WebSocket instance is provided, set it as ESP32 connection
    if (ws) {
      this.esp32Connection = ws;
      console.log(`ESP32 WebSocket connection established for device: ${deviceId}`);
    }
    
    // If no WebSocket provided, try to identify ESP32 from existing connections
    // This is for backward compatibility with your existing code
    if (!ws) {
      // You might need to implement logic to identify ESP32 connection
      // For now, we'll just set the device ID
      console.log(`ESP32 device registered: ${deviceId}`);
    }
  }

  /**
   * Set ESP32 WebSocket connection directly
   */
  public setESP32WebSocket(ws: WebSocket, deviceId: string): void {
    this.esp32Connection = ws;
    this.esp32DeviceId = deviceId;
    console.log(`ESP32 WebSocket connection set for device: ${deviceId}`);
  }

  public getESP32Connection(): string | null {
    return this.esp32DeviceId;
  }

  public getESP32WebSocket(): WebSocket | null {
    return this.esp32Connection;
  }

  public clearESP32Connection(): void {
    this.esp32Connection = null;
    this.esp32DeviceId = null;
    console.log('ESP32 connection cleared');
  }

  public isESP32Connected(): boolean {
    return this.esp32Connection !== null && 
           this.esp32Connection.readyState === WebSocket.OPEN;
  }

  /**
   * Check if a WebSocket connection is the ESP32
   */
  public isESP32WebSocket(ws: WebSocket): boolean {
    return ws === this.esp32Connection;
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): {
    totalClients: number;
    reactClients: number;
    esp32Connected: boolean;
    esp32DeviceId: string | null;
  } {
    return {
      totalClients: this.clients.size,
      reactClients: this.getReactClientCount(),
      esp32Connected: this.isESP32Connected(),
      esp32DeviceId: this.esp32DeviceId
    };
  }
}