import { db } from "./db.server";

export async function logDeviceOperation(
  deviceId: number,
  userId: number,
  action: string,
  details: string
) {
  await db.deviceLog.create({
    data: {
      deviceId,
      userId,
      action,
      details,
    },
  });
} 