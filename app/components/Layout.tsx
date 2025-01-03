import { Form, Link, useLocation, useRouteLoaderData } from "@remix-run/react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const user = useRouteLoaderData("root") as { role: string } | undefined;

  const navigation = [
    { name: "数据展示", href: "/dashboard", roles: ["super_admin", "admin", "user"] },
    { name: "设备管理", href: "/dashboard/manage", roles: ["super_admin"] },
    { name: "设备录入", href: "/dashboard/entry", roles: ["super_admin", "admin"] },
    { name: "设备查询", href: "/dashboard/search", roles: ["super_admin", "admin", "user"] },
  ].filter(item => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-[#020817]">
      {/* 顶部导航栏 */}
      <nav className="sticky top-0 z-50 bg-gray-900/60 backdrop-blur-xl border-b border-gray-800/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  设备管理系统
                </span>
              </div>
              <div className="ml-10 flex items-center space-x-4">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? "bg-gray-800 text-white"
                          : "text-gray-300 hover:bg-gray-800/60 hover:text-white"
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center">
              <Form action="/logout" method="post">
                <button
                  type="submit"
                  className="flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-500 transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  退出登录
                </button>
              </Form>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容区域 */}
      <main className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-900/40 backdrop-blur-xl rounded-xl border border-gray-800/60 shadow-2xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
} 