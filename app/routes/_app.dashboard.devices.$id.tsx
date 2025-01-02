import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigate } from "@remix-run/react";
import { useState, useEffect } from "react";
import { db } from "~/utils/db.server";
import { requireUser } from "~/utils/auth.server";
import { ErrorMessage } from "~/components/ErrorMessage";
import { logDeviceOperation } from "~/utils/log.server";

interface LoaderData {
  device: {
    id: number;
    name: string;
    serialNumber: string;
    location: string;
    primaryTagId: number;
    secondaryTagId: number;
  };
  primaryTags: Array<{
    id: number;
    name: string;
    secondaryTags: Array<{
      id: number;
      name: string;
    }>;
  }>;
}

interface ActionData {
  success?: boolean;
  error?: string;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireUser(request);
  const { id } = params;

  if (!id) {
    throw new Error("设备ID是必需的");
  }

  const [device, primaryTags] = await Promise.all([
    db.device.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        serialNumber: true,
        location: true,
        primaryTagId: true,
        secondaryTagId: true,
      },
    }),
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
  ]);

  if (!device) {
    throw new Error("设备不存在");
  }

  return json<LoaderData>({ device, primaryTags });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const { id } = params;

  if (!id) {
    throw new Error("设备ID是必需的");
  }

  const formData = await request.formData();
  const name = formData.get("name") as string;
  const serialNumber = formData.get("serialNumber") as string;
  const location = formData.get("location") as string;
  const primaryTagId = parseInt(formData.get("primaryTagId") as string);
  const secondaryTagId = parseInt(formData.get("secondaryTagId") as string);

  try {
    if (!name || !serialNumber || !location || !primaryTagId || !secondaryTagId) {
      throw new Error("所有字段都是必填的");
    }

    const deviceId = parseInt(id);
    await db.device.update({
      where: { id: deviceId },
      data: {
        name,
        serialNumber,
        location,
        primaryTagId,
        secondaryTagId,
      },
    });

    await logDeviceOperation(
      deviceId,
      user.id,
      "update",
      `更新设备信息`
    );

    return json<ActionData>({ success: true });
  } catch (error) {
    return json<ActionData>({ 
      error: error instanceof Error ? error.message : "更新失败" 
    });
  }
}

export default function EditDevicePage() {
  const { device, primaryTags } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const [selectedPrimaryTagId, setSelectedPrimaryTagId] = useState<number>(device.primaryTagId);

  useEffect(() => {
    if (actionData?.success) {
      navigate("/dashboard/devices");
    }
  }, [actionData?.success, navigate]);

  const selectedPrimaryTag = primaryTags.find(tag => tag.id === selectedPrimaryTagId);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          编辑设备
        </h1>
        <button
          onClick={() => navigate("/dashboard/devices")}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700"
        >
          返回
        </button>
      </div>

      <Form method="post" className="space-y-6 bg-gray-800/50 rounded-lg p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">
              设备名称
            </label>
            <input
              type="text"
              name="name"
              id="name"
              defaultValue={device.name}
              className="mt-1 block w-full rounded-md border-0 bg-gray-700 text-white shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-300">
              序列号
            </label>
            <input
              type="text"
              name="serialNumber"
              id="serialNumber"
              defaultValue={device.serialNumber}
              className="mt-1 block w-full rounded-md border-0 bg-gray-700 text-white shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-300">
              存放地点
            </label>
            <input
              type="text"
              name="location"
              id="location"
              defaultValue={device.location}
              className="mt-1 block w-full rounded-md border-0 bg-gray-700 text-white shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="primaryTagId" className="block text-sm font-medium text-gray-300">
              一级标签
            </label>
            <select
              id="primaryTagId"
              name="primaryTagId"
              value={selectedPrimaryTagId}
              onChange={(e) => setSelectedPrimaryTagId(parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-0 bg-gray-700 text-white shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
              required
            >
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
              defaultValue={device.secondaryTagId}
              className="mt-1 block w-full rounded-md border-0 bg-gray-700 text-white shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
              required
            >
              {selectedPrimaryTag?.secondaryTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard/devices")}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700"
          >
            取消
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </Form>

      {actionData?.error && (
        <div className="fixed bottom-4 right-4">
          <ErrorMessage message={actionData.error} type="error" />
        </div>
      )}
    </div>
  );
} 