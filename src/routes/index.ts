import { Router } from "express";
import { SensorController } from "../controllers/SensorController";
import { SensorDataService } from "../services/SensorDataService";
import { WebSocketService } from "../services/WebSocketService";
import * as authController from "../controllers/Authentication";

export function createRoutes(
  sensorService: SensorDataService,
  wsService: WebSocketService
): Router {
  const router = Router();
  const sensorController = new SensorController(sensorService, wsService);

  // Health check
  router
    .get("/health", sensorController.healthCheck)

    // Sensor data endpoints
    .get("/sensor-data", sensorController.getCurrentSensorData)
    .post("/sensor-data", sensorController.receiveSensorData)

    // Control endpoints
    .post("/fan-control", sensorController.controlFan)
    .post("/threshold", sensorController.updateThreshold)
    .post("/mode", sensorController.changeMode)
    .post("/auth/login", authController.loginController)
    .post("/auth/register", authController.registerController);

  return router;
}
