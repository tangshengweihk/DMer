import { createCookieSessionStorage, redirect } from "@remix-run/node";

// 配置会话存储
const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: ["s3cr3t"], // 在生产环境中应该使用环境变量
    secure: process.env.NODE_ENV === "production",
  },
});

// 获取用户会话
export async function getUserSession(request: Request) {
  return await sessionStorage.getSession(request.headers.get("Cookie"));
}

// 创建用户会话
export async function createUserSession(
  userId: number,
  userType: string,
  redirectTo: string
) {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);
  session.set("userType", userType);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

// 获取用户ID
export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "number") return null;
  return userId;
}

// 获取用户类型
export async function getUserType(request: Request) {
  const session = await getUserSession(request);
  const userType = session.get("userType");
  if (!userType || typeof userType !== "string") return null;
  return userType;
}

// 需要用户登录
export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "number") {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

// 退出登录
export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
} 