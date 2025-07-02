import WebSocket from "ws";
import { WebSocketMessage } from "../types";
import { config } from "../config";

export class WebSocketService {
  private clients: Set<WebSocket> = new Set();
  private esp32Connection: string | null = null;

  public addClient(ws: WebSocket): void {
    this.clients.add(ws);
    console.log(`New WebSocket client connected. Total clients: ${this.clients.size}`);
  }

  public removeClient(ws: WebSocket): void {
    this.clients.delete(ws);
    console.log(`WebSocket client disconnected. Total clients: ${this.clients.size}`);
  }

  public broadcastToClients(message: WebSocketMessage): void {
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

    console.log(`Broadcasted ${message.type} to ${successCount}/${this.clients.size} clients`);
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

  public setESP32Connection(deviceId: string): void {
    this.esp32Connection = deviceId;
  }

  public getESP32Connection(): string | null {
    return this.esp32Connection;
  }

  public clearESP32Connection(): void {
    this.esp32Connection = null;
  }

  public isESP32Connected(): boolean {
    return this.esp32Connection !== null;
  }
}
