import express from "express";
import cors from "cors";
import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import { config } from "./config";
import { createRoutes } from "./routes";
import { SensorDataService } from "./services/SensorDataService";
import { WebSocketService } from "./services/WebSocketService";
import { WebSocketHandlers } from "./websocket/handlers";

class ChickenFarmServer {
  private app: express.Application;
  private server: http.Server;
  private wss: WebSocketServer; // Fix: Use WebSocketServer instead of WebSocket.Server
  private sensorService: SensorDataService;
  private wsService: WebSocketService;
  private wsHandlers: WebSocketHandlers;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.sensorService = new SensorDataService();
    this.wsService = new WebSocketService();
    this.wsHandlers = new WebSocketHandlers(this.sensorService, this.wsService);

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupDeviceStatusMonitoring();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(cors(config.cors));

    // JSON parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // API routes
    this.app.use("/api", createRoutes(this.sensorService, this.wsService));

    // Root endpoint
    this.app.get("/", (req, res) => {
      res.json({
        message: "Chicken Farm Backend Server",
        version: "1.0.0",
        status: "running",
        timestamp: new Date(),
      });
    });

    // 404 handler
    this.app.use("*", (req, res) => {
      res.status(404).json({
        success: false,
        message: "Endpoint not found",
        timestamp: new Date(),
      });
    });
  }

  private setupWebSocket(): void {
    // Fix: Use WebSocketServer constructor
    this.wss = new WebSocketServer({
      server: this.server,
      path: config.websocket.path,
    });

    this.wss.on("connection", this.wsHandlers.handleConnection);

    console.log(`WebSocket server configured on path: ${config.websocket.path}`);
  }

  private setupDeviceStatusMonitoring(): void {
    // Check device status periodically
    setInterval(() => {
      const isOnline = this.sensorService.isDeviceOnline();
      const currentData = this.sensorService.getCurrentData();

      if (!isOnline && currentData.deviceStatus !== "offline") {
        this.sensorService.setDeviceStatus("offline");
        this.wsService.clearESP32Connection();

        // Broadcast device offline status
        this.wsService.broadcastToClients({
          type: "device_status",
          data: {
            status: "offline",
            lastSeen: currentData.lastUpdate,
          },
        });

        console.log("Device marked as offline");
      }
    }, config.device.statusCheckInterval);
  }

  private setupErrorHandling(): void {
    // Express error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error("Express error:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
        timestamp: new Date(),
      });
    });

    // Graceful shutdown
    process.on("SIGINT", this.gracefulShutdown);
    process.on("SIGTERM", this.gracefulShutdown);

    // Uncaught exception handler
    process.on("uncaughtException", (error: Error) => {
      console.error("Uncaught Exception:", error);
      process.exit(1);
    });

    // Unhandled rejection handler
    process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      process.exit(1);
    });
  }

  private gracefulShutdown = (): void => {
    console.log("\nShutting down server gracefully...");

    // Close WebSocket server
    this.wss.close(() => {
      console.log("WebSocket server closed");
    });

    // Close HTTP server
    this.server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.log("Force exiting...");
      process.exit(1);
    }, 10000);
  };

  public start(): void {
    this.server.listen(config.server.port, () => {
      console.log("=================================");
      console.log("   Chicken Farm Backend Server   ");
      console.log("=================================");
      console.log(`Server running on port ${config.server.port}`);
      console.log(`HTTP API: http://localhost:${config.server.port}/api`);
      console.log(`WebSocket: ws://localhost:${config.server.port}${config.websocket.path}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log("=================================");
    });
  }
}

// Start server
if (require.main === module) {
  const server = new ChickenFarmServer();
  server.start();
}

export default ChickenFarmServer;
