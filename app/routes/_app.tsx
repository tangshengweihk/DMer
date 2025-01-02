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

export default function AppLayout() {
  const location = useLocation();
  const { userType } = useLoaderData<typeof loader>();

  const navItems = [
    {
      to: "/dashboard",
      label: "数据展示",
      allowedTypes: ["super_admin", "admin", "user"]
    },
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
    <div className="min-h-screen bg-[#020817]">
      <nav className="bg-[#0f172a] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link 
                  to="/dashboard" 
                  className="text-2xl font-bold"
                  style={{
                    background: 'linear-gradient(90deg, rgb(0, 145, 255) 0%, rgb(0, 255, 119) 20%, rgb(255, 226, 0) 40%, rgb(255, 0, 179) 60%, rgb(255, 0, 255) 80%, rgb(0, 145, 255) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundSize: '200% auto',
                    animation: 'shine 4s linear infinite',
                    textShadow: '0 0 30px rgba(255, 255, 255, 0.1)'
                  }}
                >
                  设备管理系统
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map(item => 
                  item.allowedTypes.includes(userType || '') && (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`inline-flex items-center px-4 pt-1 text-sm font-medium border-b-2 transition-all
                        ${location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to))
                          ? "border-[#0091ff] text-white"
                          : "border-transparent text-gray-300 hover:text-white hover:border-gray-300"
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
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white rounded-lg transition-all hover:bg-[#1e293b]"
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

      <style>{`
        @keyframes shine {
          to {
            background-position: 200% center;
          }
        }
      `}</style>
    </div>
  );
} 