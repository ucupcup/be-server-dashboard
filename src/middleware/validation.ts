import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types";

export const validateSensorData = (req: Request, res: Response, next: NextFunction): void => {
  const { deviceId, temperature, humidity } = req.body;

  if (!deviceId || typeof deviceId !== "string") {
    const response: ApiResponse = {
      success: false,
      message: "deviceId is required and must be a string",
      timestamp: new Date(),
    };
    res.status(400).json(response);
    return;
  }

  if (temperature === undefined || typeof temperature !== "number") {
    const response: ApiResponse = {
      success: false,
      message: "temperature is required and must be a number",
      timestamp: new Date(),
    };
    res.status(400).json(response);
    return;
  }

  if (humidity === undefined || typeof humidity !== "number") {
    const response: ApiResponse = {
      success: false,
      message: "humidity is required and must be a number",
      timestamp: new Date(),
    };
    res.status(400).json(response);
    return;
  }

  if (temperature < -50 || temperature > 100) {
    const response: ApiResponse = {
      success: false,
      message: "temperature must be between -50 and 100",
      timestamp: new Date(),
    };
    res.status(400).json(response);
    return;
  }

  if (humidity < 0 || humidity > 100) {
    const response: ApiResponse = {
      success: false,
      message: "humidity must be between 0 and 100",
      timestamp: new Date(),
    };
    res.status(400).json(response);
    return;
  }

  next();
};

export const validateFanControl = (req: Request, res: Response, next: NextFunction): void => {
  const { state } = req.body;

  if (typeof state !== "boolean") {
    const response: ApiResponse = {
      success: false,
      message: "state is required and must be a boolean",
      timestamp: new Date(),
    };
    res.status(400).json(response);
    return;
  }

  next();
};

export const validateThreshold = (req: Request, res: Response, next: NextFunction): void => {
  const { threshold } = req.body;

  if (typeof threshold !== "number") {
    const response: ApiResponse = {
      success: false,
      message: "threshold is required and must be a number",
      timestamp: new Date(),
    };
    res.status(400).json(response);
    return;
  }

  if (threshold < 0 || threshold > 100) {
    const response: ApiResponse = {
      success: false,
      message: "threshold must be between 0 and 100",
      timestamp: new Date(),
    };
    res.status(400).json(response);
    return;
  }

  next();
};
