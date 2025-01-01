import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData, useSearchParams } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { Layout } from "~/components/Layout";

interface Location {
  location: string;
}

interface DeviceWithTags {
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
}

interface LoaderData {
  primaryTags: Array<{
    id: number;
    name: string;
    secondaryTags: Array<{
      id: number;
      name: string;
    }>;
  }>;
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
  }>;
  locations: string[];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const primaryTagId = url.searchParams.get("primaryTagId");
  const secondaryTagId = url.searchParams.get("secondaryTagId");
  const location = url.searchParams.get("location");

  const [primaryTags, locations] = await Promise.all([
    db.primaryTag.findMany({
      include: {
        secondaryTags: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    db.device.findMany({
      select: { location: true },
      distinct: ["location"],
    }).then((locations: Location[]) => locations.map((l: Location) => l.location)),
  ]);

  // 构建查询条件
  const where = {
    ...(primaryTagId ? { primaryTagId: parseInt(primaryTagId) } : {}),
    ...(secondaryTagId ? { secondaryTagId: parseInt(secondaryTagId) } : {}),
    ...(location ? { location } : {}),
  };

  const devices = await db.device.findMany({
    where,
    include: {
      primaryTag: {
        select: { name: true },
      },
      secondaryTag: {
        select: { name: true },
      },
    },
  });

  return json<LoaderData>({ primaryTags, devices, locations });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "export") {
    const devices = await db.device.findMany({
      include: {
        primaryTag: {
          select: { name: true },
        },
        secondaryTag: {
          select: { name: true },
        },
      },
    });

    // 添加CSV表头
    const header = "设备名称,序列号,存放地点,一级标签,二级标签\n";
    const csvContent = header + devices.map((device: DeviceWithTags) => 
      `${device.name},${device.serialNumber},${device.location},${device.primaryTag.name},${device.secondaryTag.name}`
    ).join("\n");

    const headers = new Headers();
    headers.set("Content-Type", "text/csv; charset=utf-8");
    headers.set("Content-Disposition", 'attachment; filename="devices.csv"');

    return new Response(csvContent, { headers });
  }
}

export default function DeviceSearchPage() {
  const { primaryTags, devices, locations } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPrimaryTagId = searchParams.get("primaryTagId") || "";
  const selectedSecondaryTagId = searchParams.get("secondaryTagId") || "";
  const selectedLocation = searchParams.get("location") || "";

  const selectedPrimaryTag = primaryTags.find(
    tag => tag.id.toString() === selectedPrimaryTagId
  );

  // 按位置分组的设备
  const devicesByLocation = devices.reduce((acc, device) => {
    if (!acc[device.location]) {
      acc[device.location] = [];
    }
    acc[device.location].push(device);
    return acc;
  }, {} as Record<string, typeof devices>);

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          设备查询
        </h1>
        <Form method="post">
          <input type="hidden" name="intent" value="export" />
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            导出CSV
          </button>
        </Form>
      </div>

      <div className="space-y-8">
        {/* 查询表单 */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-medium text-white mb-4">筛选条件</h2>
          <Form method="get" className="space-y-4">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="primaryTagId" className="block text-sm font-medium text-gray-300">
                  一级标签
                </label>
                <select
                  id="primaryTagId"
                  name="primaryTagId"
                  value={selectedPrimaryTagId}
                  onChange={(e) => {
                    const params = new URLSearchParams(searchParams);
                    params.set("primaryTagId", e.target.value);
                    params.delete("secondaryTagId");
                    setSearchParams(params);
                  }}
                  className="mt-1 block w-full rounded-md border-0 bg-gray-900/50 py-1.5 text-white shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 [&>option]:text-gray-900"
                >
                  <option value="">全部</option>
                  {primaryTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="secondaryTagId" className="block text-sm font-medium text-gray-300">
                  二级标签
                </label>
                <select
                  id="secondaryTagId"
                  name="secondaryTagId"
                  value={selectedSecondaryTagId}
                  onChange={(e) => {
                    const params = new URLSearchParams(searchParams);
                    params.set("secondaryTagId", e.target.value);
                    setSearchParams(params);
                  }}
                  className="mt-1 block w-full rounded-md border-0 bg-gray-900/50 py-1.5 text-white shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 [&>option]:text-gray-900"
                  disabled={!selectedPrimaryTagId}
                >
                  <option value="">全部</option>
                  {selectedPrimaryTag?.secondaryTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-300">
                  存放地点
                </label>
                <select
                  id="location"
                  name="location"
                  value={selectedLocation}
                  onChange={(e) => {
                    const params = new URLSearchParams(searchParams);
                    params.set("location", e.target.value);
                    setSearchParams(params);
                  }}
                  className="mt-1 block w-full rounded-md border-0 bg-gray-900/50 py-1.5 text-white shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 [&>option]:text-gray-900"
                >
                  <option value="">全部</option>
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Form>
        </div>

        {/* 查询结果 */}
        <div className="space-y-6">
          {Object.entries(devicesByLocation).map(([location, devices]) => (
            <div key={location} className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-medium text-white mb-4">
                {location} ({devices.length}台设备)
              </h2>
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 