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
  private wss: WebSocketServer;
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
    // Enhanced CORS for ngrok support
    const ngrokOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      /^https:\/\/.*\.ngrok\.io$/,
      /^https:\/\/.*\.ngrok-free\.app$/,
      /^https:\/\/.*\.ngrok\.dev$/
    ];

    // Safely handle config.cors.origin
    let existingOrigins: (string | RegExp)[] = [];
    if (config.cors.origin) {
      if (Array.isArray(config.cors.origin)) {
        existingOrigins = config.cors.origin;
      } else if (typeof config.cors.origin === 'string') {
        existingOrigins = [config.cors.origin];
      } else if (typeof config.cors.origin === 'boolean') {
        existingOrigins = config.cors.origin ? ['*'] : [];
      }
    }

    const corsOptions = {
      ...config.cors,
      origin: [...ngrokOrigins, ...existingOrigins],
      credentials: true,
      optionsSuccessStatus: 200
    };

    this.app.use(cors(corsOptions));

    // Ngrok-specific middleware
    this.app.use((req, res, next) => {
      // Skip ngrok browser warning
      res.header('ngrok-skip-browser-warning', 'true');
      
      // Security headers for ngrok
      res.header('X-Frame-Options', 'DENY');
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('X-XSS-Protection', '1; mode=block');
      
      // Handle ngrok forwarded headers (extend req object properly)
      if (req.headers['x-forwarded-proto'] === 'https') {
        Object.defineProperty(req, 'secure', {
          value: true,
          writable: false,
          enumerable: true,
          configurable: true
        });
      }
      
      next();
    });

    // JSON parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Enhanced request logging with ngrok info
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      const method = req.method;
      const path = req.path;
      const userAgent = req.headers['user-agent'];
      const isNgrok = req.headers.host?.includes('ngrok');
      const forwardedFor = req.headers['x-forwarded-for'] || req.ip;
      
      console.log(`${timestamp} - ${method} ${path} ${isNgrok ? '[NGROK]' : '[LOCAL]'} - ${forwardedFor}`);
      
      // Log ESP32 requests specifically
      if (userAgent?.includes('ESP32') || userAgent?.includes('arduino')) {
        console.log(`ESP32 Request: ${method} ${path}`);
      }
      
      next();
    });

    // Health check endpoint for ngrok monitoring
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        ngrok: {
          host: req.headers.host,
          forwarded: !!req.headers['x-forwarded-proto'],
          userAgent: req.headers['user-agent']
        }
      });
    });
  }

  private setupRoutes(): void {
    // API routes
    this.app.use("/api", createRoutes(this.sensorService, this.wsService));

    // Enhanced root endpoint with ngrok info
    this.app.get("/", (req, res) => {
      const isNgrok = req.headers.host?.includes('ngrok');
      
      res.json({
        message: "Chicken Farm Backend Server",
        version: "1.0.0",
        status: "running",
        timestamp: new Date(),
        server: {
          host: req.headers.host,
          protocol: req.headers['x-forwarded-proto'] || req.protocol,
          isNgrok: isNgrok,
          endpoint: `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers.host}`
        },
        endpoints: {
          api: `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers.host}/api`,
          websocket: `${req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws'}://${req.headers.host}${config.websocket.path}`,
          health: `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers.host}/health`
        }
      });
    });

    // ESP32 specific endpoint untuk testing koneksi
    this.app.get("/api/esp32/test", (req, res) => {
      res.json({
        success: true,
        message: "ESP32 connection test successful",
        timestamp: new Date().toISOString(),
        server: {
          host: req.headers.host,
          isNgrok: req.headers.host?.includes('ngrok') || false
        }
      });
    });

    // 404 handler
    this.app.use("*", (req, res) => {
      res.status(404).json({
        success: false,
        message: "Endpoint not found",
        timestamp: new Date(),
        path: req.originalUrl
      });
    });
  }

  private setupWebSocket(): void {
    this.wss = new WebSocketServer({
      server: this.server,
      path: config.websocket.path,
      // Enhanced WebSocket verification for ngrok
      verifyClient: (info) => {
        const origin = info.origin;
        const host = info.req.headers.host;
        
        // Allow localhost and ngrok connections
        if (!origin) return true; // Allow connections without origin (like ESP32)
        
        const allowedOrigins = [
          /^https?:\/\/localhost/,
          /^https:\/\/.*\.ngrok\.io$/,
          /^https:\/\/.*\.ngrok-free\.app$/,
          /^https:\/\/.*\.ngrok\.dev$/
        ];
        
        return allowedOrigins.some(pattern => pattern.test(origin));
      }
    });

    this.wss.on("connection", (ws, req) => {
      const isNgrok = req.headers.host?.includes('ngrok');
      console.log(`WebSocket connection established ${isNgrok ? '[NGROK]' : '[LOCAL]'}`);
      
      this.wsHandlers.handleConnection(ws, req);
    });

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
      console.log("");
      console.log("🌐 Ngrok Ready:");
      console.log(`   Run: ngrok http ${config.server.port}`);
      console.log(`   Then update ESP32 with ngrok URL`);
      console.log("=================================");
    });
  }

  // Helper method untuk mendapatkan ngrok URL jika tersedia
  public getNgrokInfo(): string | null {
    // This would need to be set externally or detected
    return process.env.NGROK_URL || null;
  }
}

// Start server
if (require.main === module) {
  const server = new ChickenFarmServer();
  server.start();
}

export default ChickenFarmServer;