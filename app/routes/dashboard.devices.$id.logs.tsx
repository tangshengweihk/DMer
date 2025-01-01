import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useNavigation } from "@remix-run/react";
import { getUserType } from "~/utils/session.server";
import { db } from "~/utils/db.server";
import type { LogAction } from "~/types/device";
import type { LogsLoaderData } from "~/types/logs";
import { ErrorBoundary } from "~/components/ErrorBoundary";
import { LoadingSpinner } from "~/components/LoadingSpinner";
import { setCacheControl } from "~/utils/cache.server";
import { VirtualTable } from "~/components/VirtualTable";

export { ErrorBoundary };

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userType = await getUserType(request);
  if (userType !== "super_admin") {
    throw new Response("无权限访问", { status: 403 });
  }

  const deviceId = parseInt(params.id!);
  if (isNaN(deviceId)) {
    throw new Response("无效的设备ID", { status: 400 });
  }

  try {
    const device = await db.device.findUnique({
      where: { id: deviceId },
      include: {
        deviceLogs: {
          include: {
            user: {
              select: {
                username: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!device) {
      throw new Response("设备不存在", { status: 404 });
    }

    const headers = new Headers();
    setCacheControl(headers);

    return json<LogsLoaderData>({ device }, { headers });
  } catch (error) {
    console.error("Error loading device logs:", error);
    throw new Response("加载设备日志失败", { status: 500 });
  }
}

export default function DeviceLogsPage() {
  const { device } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  const getActionText = (action: LogAction): string => {
    const actionMap: Record<LogAction, string> = {
      create: "创建",
      update: "更新",
      delete: "删除",
    };
    return actionMap[action];
  };

  const formatDate = (date: string | Date): string => {
    return new Date(date).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const renderTableContent = () => {
    if (device.deviceLogs.length === 0) {
      return (
        <div className="text-center py-8 text-gray-300">
          暂无操作日志
        </div>
      );
    }

    return (
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          {device.deviceLogs.length > 100 ? (
            <VirtualTable
              data={device.deviceLogs}
              rowHeight={48}
              renderHeader={() => (
                <thead>
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-0">操作类型</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">操作人</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">详情</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">操作时间</th>
                  </tr>
                </thead>
              )}
              renderRow={(log) => (
                <>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">
                    {getActionText(log.action)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                    {log.user.username}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                    {log.details}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                    {formatDate(log.createdAt)}
                  </td>
                </>
              )}
            />
          ) : (
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-0">操作类型</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">操作人</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">详情</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">操作时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {device.deviceLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">
                      {getActionText(log.action)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                      {log.user.username}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                      {log.details}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-white">设备操作日志</h1>
          <p className="mt-2 text-sm text-gray-300">
            {device.name} ({device.serialNumber}) 的操作记录
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => navigate(`/dashboard/devices/${device.id}`)}
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-blue-500"
          >
            返回设备详情
          </button>
        </div>
      </div>

      <div className="mt-8 flow-root">
        {isLoading ? <LoadingSpinner /> : renderTableContent()}
      </div>
    </div>
  );
} 