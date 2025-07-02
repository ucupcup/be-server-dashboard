export const config = {
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3001,
    host: process.env.HOST || "localhost",
  },
  websocket: {
    path: "/ws",
    heartbeatInterval: 30000,
    clientTimeout: 60000,
  },
  device: {
    offlineTimeout: 30000, // 30 seconds
    statusCheckInterval: 10000, // 10 seconds
  },
  cors: {
    origin: process.env.NODE_ENV === "production" ? ["http://localhost:3000", "https://your-dashboard.com"] : true,
    credentials: true,
  },
} as const;
