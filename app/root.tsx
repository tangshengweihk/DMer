import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { getUserId, getUserType } from "~/utils/session.server";
import "./tailwind.css";
import { ConfigProvider } from "antd";
import "antd/dist/reset.css";

export const links: LinksFunction = () => {
  return [];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  const url = new URL(request.url);
  
  if (url.pathname === "/") {
    return redirect("/dashboard");
  }

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
    <html lang="zh">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#1677ff',
            },
          }}
        >
          <Outlet />
        </ConfigProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
