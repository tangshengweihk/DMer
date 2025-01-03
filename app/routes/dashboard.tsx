import { Outlet } from "@remix-run/react";
import { Layout } from "~/components/Layout";

export default function Dashboard() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
} 