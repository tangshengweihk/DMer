export type DeviceStatus = 'normal' | 'maintenance' | 'broken' | 'scrapped';
export type LogAction = 'create' | 'update' | 'delete';

export interface Device {
  id: number;
  name: string;
  serialNumber: string;
  type: string;
  location: string;
  status: DeviceStatus;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deviceLogs?: DeviceLog[];
}

export interface DeviceLog {
  id: number;
  deviceId: number;
  userId: number;
  action: LogAction;
  details: string;
  createdAt: Date;
  user: {
    username: string;
  };
}

export interface DeviceFormErrors {
  name?: string;
  serialNumber?: string;
  type?: string;
  location?: string;
  status?: string;
}

export interface PaginationData {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
} 