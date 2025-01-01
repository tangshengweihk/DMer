export type UserType = 'super_admin' | 'admin' | 'user';

export interface User {
  id: number;
  username: string;
  password: string;
  user_type: UserType;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  id: number;
  username: string;
  user_type: UserType;
} 