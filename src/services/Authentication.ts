import * as bcrypt from "bcrypt";
import { LoginDTO, RegisterDTO } from "../types";

import { PrismaClient } from "@prisma/client";
import { validateField } from "../utils/validate-field";
import { error } from "console";

export const db = new PrismaClient();

const requiredField = {
  login: ["email", "password"],
  register: ["name", "email", "password"],
};

export const loginService = async (body: LoginDTO) => {
  const validate = validateField(requiredField.login, body);
  if (validate.message) {
    return {
      error: true,
      code: validate.code,
      message: validate.message,
    };
  }
  const user = await db.user.findUnique({ where: { email: body.email } });
  if (!user) {
    return {
      error: true,
      code: 404,
      message: "Email / password tidak sesuai",
    };
  }

  const match = await bcrypt.compare(body.password, user.password);
  if (!match) {
    return {
      error: true,
      code: 400,
      message: "Email / password tidak sesuai",
    };
  }

  return {
    error: false,
    code: 200,
    message: "Login berhasil",
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  };
};

export const registerService = async (body: RegisterDTO) => {
  const validate = validateField(requiredField.register, body);
  if (validate.message) {
    return {
      error: true,
      code: validate.code,
      message: validate.message,
    };
  }
  const user = await db.user.findUnique({ where: { email: body.email } });
  if (user) {
    return {
      error: true,
      code: 400,
      message: "User sudah terdaftar",
    };
  }

  const hashPassword = await bcrypt.hash(body.password, 10);

  await db.user.create({
    data: {
      email: body.email,
      password: hashPassword,
      name: body.name,
    },
  });

  return {
    error: false,
    code: 201,
    message: "Register berhasil",
  };
};
