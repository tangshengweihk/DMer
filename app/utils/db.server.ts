import { PrismaClient } from "@prisma/client";
import type { UserType } from "~/types/user";

let db: PrismaClient;

declare global {
  var __db__: PrismaClient | undefined;
}

// 避免在开发环境中创建多个连接
if (process.env.NODE_ENV === "production") {
  db = new PrismaClient();
} else {
  if (!global.__db__) {
    global.__db__ = new PrismaClient();
  }
  db = global.__db__;
}

export async function verifyUser(username: string, password: string) {
  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      password: true,
      user_type: true,
    },
  });

  if (!user) return null;
  
  // 在实际应用中，这里应该使用 bcrypt 等工具来比较密码
  const isValid = user.password === password;
  
  if (!isValid) return null;

  return {
    id: user.id,
    username: user.username,
    user_type: user.user_type as UserType,
  };
}

export { db }; 