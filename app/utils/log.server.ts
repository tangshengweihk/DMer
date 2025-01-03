import { db } from "./db.server";

export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export async function logDeviceOperation(
  deviceId: number,
  userId: number,
  action: string,
  details: string,
  level: LogLevel = LogLevel.INFO
) {
  try {
    const logEntry = await db.deviceLog.create({
      data: {
        deviceId,
        userId,
        action,
        details,
        level,
        timestamp: new Date(),
      },
    });

    // Also log to console for development
    if (process.env.NODE_ENV === "development") {
      console.log(`[${level}] Device ${deviceId} - ${action}: ${details}`);
    }

    return logEntry;
  } catch (error) {
    console.error("Failed to log device operation:", error);
    throw new Error("Failed to log device operation");
  }
}
