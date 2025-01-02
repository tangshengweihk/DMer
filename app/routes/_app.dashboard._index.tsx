import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { requireUser } from "~/utils/auth.server";

interface LoaderData {
  totalDevices: number;
  devices: Array<{
    id: number;
    name: string;
    serialNumber: string;
    location: string;
    primaryTag: {
      name: string;
    };
    secondaryTag: {
      name: string;
    };
    createdAt: string;
  }>;
  currentPage: number;
  totalPages: number;
  devicesByLocation: Array<{
    location: string;
    count: number;
  }>;
  devicesByPrimaryTag: Array<{
    tagName: string;
    count: number;
  }>;
}

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUser(request);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = 100;
  const skip = (page - 1) * pageSize;

  const [totalDevices, devices, devicesByLocation, devicesByPrimaryTag] = await Promise.all([
    db.device.count(),
    db.device.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        primaryTag: {
          select: { name: true },
        },
        secondaryTag: {
          select: { name: true },
        },
      },
    }),
    db.device.groupBy({
      by: ['location'],
      _count: true,
    }).then(results => results.map(r => ({
      location: r.location,
      count: r._count,
    }))),
    db.device.groupBy({
      by: ['primaryTagId'],
      _count: true,
    }).then(async (results) => {
      const tagCounts = await Promise.all(
        results.map(async (r) => {
          const tag = await db.primaryTag.findUnique({
            where: { id: r.primaryTagId },
            select: { name: true },
          });
          return {
            tagName: tag?.name || '未知',
            count: r._count,
          };
        })
      );
      return tagCounts;
    }),
  ]);

  return json<LoaderData>({
    totalDevices,
    devices: devices.map(device => ({
      ...device,
      createdAt: device.createdAt.toISOString(),
    })),
    currentPage: page,
    totalPages: Math.ceil(totalDevices / pageSize),
    devicesByLocation,
    devicesByPrimaryTag,
  });
}

export default function DashboardIndex() {
  const { totalDevices, devices, currentPage, totalPages, devicesByLocation, devicesByPrimaryTag } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => {
      prev.set("page", newPage.toString());
      return prev;
    });
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
        数据展示
      </h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400">设备总数</h3>
          <p className="mt-2 text-3xl font-bold text-white">{totalDevices}</p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* 按位置统计 */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-medium text-white mb-4">按位置统计</h2>
          <div className="space-y-4">
            {devicesByLocation.map((item) => (
              <div key={item.location} className="flex items-center justify-between">
                <span className="text-gray-300">{item.location}</span>
                <span className="text-white font-medium">{item.count} 台</span>
              </div>
            ))}
          </div>
        </div>

        {/* 按标签统计 */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-medium text-white mb-4">按标签统计</h2>
          <div className="space-y-4">
            {devicesByPrimaryTag.map((item) => (
              <div key={item.tagName} className="flex items-center justify-between">
                <span className="text-gray-300">{item.tagName}</span>
                <span className="text-white font-medium">{item.count} 台</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 设备列表 */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-medium text-white mb-4">设备列表</h2>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden shadow-sm ring-1 ring-gray-700 ring-opacity-50 rounded-lg">
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
                      存放地点
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                      一级标签
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                      二级标签
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 bg-gray-900/50">
                  {devices.map((device) => (
                    <tr key={device.id} className="hover:bg-gray-800/50">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">
                        {device.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                        {device.serialNumber}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                        {device.location}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                        {device.primaryTag.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                        {device.secondaryTag.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 分页控件 */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            显示 {(currentPage - 1) * 100 + 1}-{Math.min(currentPage * 100, totalDevices)} 条，共 {totalDevices} 条
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <span className="px-3 py-1 text-sm text-gray-300">
              第 {currentPage} 页，共 {totalPages} 页
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 