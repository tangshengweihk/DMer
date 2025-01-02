import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { getUserSession } from "~/utils/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  if (session.has("userId")) {
    return redirect("/dashboard");
  }
  return redirect("/login");
}

export default function Index() {
  return null;
} 