import { Request, Response } from "express";
import { loginService, registerService } from "../services/Authentication";
import { ApiResponse } from "../types";

export const loginController = async (req: Request, res: Response) => {
  const { body } = req;

  const service = await loginService(body);

  const payload: ApiResponse = {
    success: !service.error,
    timestamp: new Date(),
    message: service.message,
  };

  res.status(service.code).jsonp(payload);
};

export const registerController = async (req: Request, res: Response) => {
  const { body } = req;

  const service = await registerService(body);

  const payload: ApiResponse = {
    success: !service.error,
    timestamp: new Date(),
    message: service.message,
  };

  res.status(service.code).jsonp(payload);
};
