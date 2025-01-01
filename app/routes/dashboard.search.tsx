import { json, type LoaderFunctionArgs, redirect, type ActionFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData, useSearchParams, useNavigate } from "@remix-run/react";
import { getUserType } from "~/utils/session.server";
import { db } from "~/utils/db.server";
import type { Device, DeviceStatus } from "~/types/device";

export async function loader({ request }: LoaderFunctionArgs) {
  const userType = await getUserType(request);
  if (!userType) {
    throw new Error("无权限访问");
  }

  const url = new URL(request.url);
  const name = url.searchParams.get("name") || undefined;
  const serialNumber = url.searchParams.get("serialNumber") || undefined;
  const type = url.searchParams.get("type") || undefined;
  const location = url.searchParams.get("location") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = 10;

  const where = {
    ...(name && { name: { contains: name } }),
    ...(serialNumber && { serialNumber }),
    ...(type && { type }),
    ...(location && { location }),
    ...(status && { status }),
  };

  const [devices, total] = await Promise.all([
    db.device.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
    }),
    db.device.count({ where }),
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

export async function action({ request }: ActionFunctionArgs) {
  const userType = await getUserType(request);
  if (!userType) {
    throw new Error("无权限访问");
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "export") {
    const url = new URL(formData.get("url") as string);
    const name = url.searchParams.get("name") || undefined;
    const serialNumber = url.searchParams.get("serialNumber") || undefined;
    const type = url.searchParams.get("type") || undefined;
    const location = url.searchParams.get("location") || undefined;
    const status = url.searchParams.get("status") || undefined;

    const where = {
      ...(name && { name: { contains: name } }),
      ...(serialNumber && { serialNumber }),
      ...(type && { type }),
      ...(location && { location }),
      ...(status && { status }),
    };

    const devices = await db.device.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    const getStatusText = (status: DeviceStatus): string => {
      const statusMap: Record<DeviceStatus, string> = {
        normal: "正常",
        maintenance: "维护中",
        broken: "故障",
        scrapped: "已报废",
      };
      return statusMap[status];
    };

    const csvContent = [
      ["设备名称", "设备编号", "类型", "位置", "状态", "备注", "更新时间"],
      ...devices.map((device: Device) => [
        device.name,
        device.serialNumber,
        device.type,
        device.location,
        getStatusText(device.status),
        device.notes || "",
        new Date(device.updatedAt).toLocaleString()
      ])
    ].map((row: (string | number)[]) => row.map(cell => `"${cell}"`).join(",")).join("\n");

    const headers = new Headers();
    headers.set("Content-Type", "text/csv; charset=utf-8");
    headers.set("Content-Disposition", `attachment; filename=devices-${new Date().toISOString().split("T")[0]}.csv`);

    return new Response(csvContent, { headers });
  }
}

export default function SearchPage() {
  const { devices, pagination } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
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
          <h1 className="text-xl font-semibold text-white">设备查询</h1>
          <p className="mt-2 text-sm text-gray-300">
            查询设备信息
          </p>
        </div>
      </div>

      <Form method="get" className="mt-8 space-y-6">
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-3">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white">
              设备名称
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="name"
                id="name"
                defaultValue={searchParams.get("name") || ""}
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <label htmlFor="serialNumber" className="block text-sm font-medium text-white">
              设备编号
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="serialNumber"
                id="serialNumber"
                defaultValue={searchParams.get("serialNumber") || ""}
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-white">
              设备类型
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="type"
                id="type"
                defaultValue={searchParams.get("type") || ""}
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-white">
              设备位置
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="location"
                id="location"
                defaultValue={searchParams.get("location") || ""}
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-white">
              设备状态
            </label>
            <div className="mt-2">
              <select
                id="status"
                name="status"
                defaultValue={searchParams.get("status") || ""}
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
              >
                <option value="">全部</option>
                <option value="normal">正常</option>
                <option value="maintenance">维护中</option>
                <option value="broken">故障</option>
                <option value="scrapped">已报废</option>
              </select>
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              查询
            </button>
          </div>
        </div>
      </Form>

      <div className="mt-8 flex justify-end">
        <Form method="post">
          <input type="hidden" name="url" value={`${window.location.pathname}${window.location.search}`} />
          <button
            type="submit"
            name="intent"
            value="export"
            className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
          >
            导出查询结果
          </button>
        </Form>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 分页 */}
      <div className="mt-4 flex items-center justify-between">
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
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNumber) => {
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.set("page", pageNumber.toString());
              return (
                <a
                  key={pageNumber}
                  href={`?${newSearchParams.toString()}`}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    pageNumber === pagination.page
                      ? "bg-gray-700 text-white"
                      : "text-gray-400 hover:bg-gray-700"
                  } focus:z-20 focus:outline-offset-0`}
                >
                  {pageNumber}
                </a>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
} 