import type { Device, DeviceLog } from "./device";

export interface DeviceWithLogs extends Device {
  deviceLogs: (DeviceLog & {
    user: {
      username: string;
    };
  })[];
}

export interface LogsLoaderData {
  device: DeviceWithLogs;
} 