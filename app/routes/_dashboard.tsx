import { Outlet, Link, useLocation, Form, useLoaderData } from "@remix-run/react";
import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { getUserSession, getUserType } from "~/utils/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  if (!session.has("userId")) {
    return redirect("/login");
  }
  const userType = await getUserType(request);
  return json({ userType });
}

export default function DashboardLayout() {
  const location = useLocation();
  const { userType } = useLoaderData<typeof loader>();

  const navItems = [
    {
      to: "/dashboard/devices",
      label: "设备管理",
      allowedTypes: ["super_admin"]
    },
    {
      to: "/dashboard/entry",
      label: "设备录入",
      allowedTypes: ["super_admin", "admin"]
    },
    {
      to: "/dashboard/search",
      label: "设备查询",
      allowedTypes: ["super_admin", "admin", "user"]
    }
  ];

  return (
    <>
      <nav className="bg-[#0f172a] shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/dashboard" className="text-xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  设备管理系统
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map(item => 
                  item.allowedTypes.includes(userType) && (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`inline-flex items-center px-1 pt-1 text-sm font-medium
                        ${location.pathname.startsWith(item.to)
                          ? "text-blue-400 border-b-2 border-blue-400"
                          : "text-gray-300 hover:text-gray-100 hover:border-b-2 hover:border-gray-300"
                        }`}
                    >
                      {item.label}
                    </Link>
                  )
                )}
              </div>
            </div>
            <div className="flex items-center">
              <Form action="/logout" method="post">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white"
                >
                  退出登录
                </button>
              </Form>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </>
  );
} 