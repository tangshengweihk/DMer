import { json, type LoaderFunctionArgs, type SerializeFrom } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { requireUser } from "~/utils/auth.server";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";

interface Device {
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
  createdAt: Date;
  updatedAt: Date;
  status: string;
  notes: string | null;
  primaryTagId: number;
  secondaryTagId: number;
}

interface LoaderData {
  devices: Device[];
  totalDevices: number;
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
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = 100;
  const skip = (page - 1) * pageSize;

  const [totalDevices, devicesByLocation, devicesByPrimaryTag, devices] = await Promise.all([
    db.device.count(),
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
  ]);

  return json<LoaderData>({
    totalDevices,
    devicesByLocation,
    devicesByPrimaryTag,
    devices,
  });
}

export default function DashboardIndex() {
  const { totalDevices, devicesByLocation, devicesByPrimaryTag, devices } = useLoaderData<typeof loader>();

  const columns: ColumnsType<SerializeFrom<Device>> = [
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '序列号',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
    },
    {
      title: '存放地点',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '一级标签',
      dataIndex: ['primaryTag', 'name'],
      key: 'primaryTag',
    },
    {
      title: '二级标签',
      dataIndex: ['secondaryTag', 'name'],
      key: 'secondaryTag',
    },
  ];

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
        <Table
          columns={columns}
          dataSource={devices}
          rowKey="id"
          pagination={{
            total: totalDevices,
            pageSize: 100,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: true }}
          style={{ 
            background: 'transparent',
            color: 'white'
          }}
        />
      </div>
    </div>
  );
} 