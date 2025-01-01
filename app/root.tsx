import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import "./tailwind.css";
import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { getUserId, getUserType } from "~/utils/session.server";

export const links: LinksFunction = () => {
  return [];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  const url = new URL(request.url);
  
  if (!userId && url.pathname !== "/login") {
    throw redirect("/login");
  }
  
  if (userId && url.pathname === "/login") {
    throw redirect("/dashboard");
  }

  const userType = userId ? await getUserType(request) : null;
  return json({ userId, role: userType });
}

export default function App() {
  return (
    <html lang="zh" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        <div id="app" className="h-full">
          <Outlet />
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
