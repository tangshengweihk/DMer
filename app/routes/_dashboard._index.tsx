import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { requireUserId } from "~/utils/session.server";
import { db } from "~/utils/db.server";
import type { Device } from "~/types/device";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request);
  
  // 获取第一页的设备数据
  const [devices, totalCount] = await Promise.all([
    db.device.findMany({
      take: 10,
      orderBy: {
        updatedAt: 'desc',
      },
    }),
    db.device.count(),
  ]);

  return json({ devices, totalCount });
}

export default function Dashboard() {
  const { devices, totalCount } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">设备列表</h1>
          <p className="mt-2 text-sm text-gray-400">
            共 {totalCount} 条记录
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle">
            <div className="overflow-hidden shadow-sm ring-1 ring-white/10 rounded-lg">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">
                      设备名称
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                      序列号
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                      类型
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                      存放地点
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                      状态
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                      更新时间
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 bg-[#0f172a]">
                  {devices.map((device) => (
                    <tr key={device.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-300 sm:pl-6">
                        {device.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                        {device.serialNumber}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                        {device.type}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                        {device.location}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                          device.status === 'normal' ? 'bg-green-400/10 text-green-400' :
                          device.status === 'maintenance' ? 'bg-yellow-400/10 text-yellow-400' :
                          device.status === 'broken' ? 'bg-red-400/10 text-red-400' :
                          'bg-gray-400/10 text-gray-400'
                        }`}>
                          {device.status === 'normal' ? '正常' :
                           device.status === 'maintenance' ? '维护中' :
                           device.status === 'broken' ? '故障' :
                           device.status === 'scrapped' ? '已报废' : '未知'}
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
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          显示 1-{Math.min(10, totalCount)} 条，共 {totalCount} 条
        </div>
        {/* 这里可以添加分页控件 */}
      </div>
    </div>
  );
} 