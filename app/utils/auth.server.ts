import { redirect } from "@remix-run/node";
import { getUserSession } from "./session.server";

export async function requireUser(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  
  if (!userId) {
    const searchParams = new URLSearchParams([
      ["redirectTo", new URL(request.url).pathname],
    ]);
    throw redirect(`/login?${searchParams}`);
  }

  return { id: userId, user_type: session.get("userType") };
}

export async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  
  if (user.user_type !== "admin") {
    throw new Response("Unauthorized", { status: 403 });
  }

  return user;
} 