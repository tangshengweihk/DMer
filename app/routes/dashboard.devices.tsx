import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { getUserType } from "~/utils/session.server";
import { db } from "~/utils/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userType = await getUserType(request);
  if (userType !== "super_admin") {
    throw new Error("无权限访问");
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = 10;
  const skip = (page - 1) * pageSize;

  const [devices, total] = await Promise.all([
    db.device.findMany({
      skip,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
    }),
    db.device.count(),
  ]);

  return json({
    devices,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export default function DevicesPage() {
  const { devices, pagination } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const statusColors = {
    normal: "bg-green-100 text-green-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    broken: "bg-red-100 text-red-800",
    scrapped: "bg-gray-100 text-gray-800",
  };

  const statusText = {
    normal: "正常",
    maintenance: "维护中",
    broken: "故障",
    scrapped: "已报废",
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-white">设备管理</h1>
          <p className="mt-2 text-sm text-gray-300">
            设备列表，包含所有设备的详细信息
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => navigate("/dashboard/entry")}
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-blue-500"
          >
            添加设备
          </button>
        </div>
      </div>
      
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-0">设备名称</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">设备编号</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">类型</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">位置</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">状态</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">更新时间</th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {devices.map((device) => (
                  <tr key={device.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">
                      {device.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{device.serialNumber}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{device.type}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{device.location}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColors[device.status as keyof typeof statusColors]}`}>
                        {statusText[device.status as keyof typeof statusText]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                      {new Date(device.updatedAt).toLocaleString()}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                      <button
                        onClick={() => navigate(`/dashboard/devices/${device.id}`)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        编辑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 分页 */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => navigate(`?page=${pagination.page - 1}`)}
            disabled={pagination.page === 1}
            className="relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            上一页
          </button>
          <button
            onClick={() => navigate(`?page=${pagination.page + 1}`)}
            disabled={pagination.page === pagination.totalPages}
            className="relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            下一页
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-300">
              显示第 <span className="font-medium">{(pagination.page - 1) * pagination.pageSize + 1}</span> 到{" "}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.pageSize, pagination.total)}
              </span>{" "}
              条，共 <span className="font-medium">{pagination.total}</span> 条
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => navigate(`?page=${pageNumber}`)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    pageNumber === pagination.page
                      ? "bg-gray-700 text-white"
                      : "text-gray-400 hover:bg-gray-700"
                  } focus:z-20 focus:outline-offset-0`}
                >
                  {pageNumber}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
} 