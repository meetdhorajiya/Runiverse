import type { Response } from "express";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export const handleError = (err: unknown, res: Response): Response => {
  console.error("❌ Error:", err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  const fallbackMessage = err instanceof Error ? err.message : "Internal Server Error";

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};
