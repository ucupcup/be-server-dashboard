import { Router } from 'express';
import { SensorController } from '../controllers/SensorController';
import { SensorDataService } from '../services/SensorDataService';
import { WebSocketService } from '../services/WebSocketService';

export function createRoutes(
  sensorService: SensorDataService, 
  wsService: WebSocketService
): Router {
  const router = Router();
  const sensorController = new SensorController(sensorService, wsService);

  // Health check
  router.get('/health', sensorController.healthCheck);

  // Sensor data endpoints
  router.get('/sensor-data', sensorController.getCurrentSensorData);
  router.post('/sensor-data', sensorController.receiveSensorData);

  // Control endpoints
  router.post('/fan-control', sensorController.controlFan);
  router.post('/threshold', sensorController.updateThreshold);
  router.post('/mode', sensorController.changeMode);

  return router;
}