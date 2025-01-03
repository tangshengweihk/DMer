import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData, Form } from "@remix-run/react";
import { useState } from "react";
import { db } from "~/utils/db.server";
import { DeviceList } from "~/components/DeviceList";
import { EditDeviceDialog } from "~/components/EditDeviceDialog";
import { EditTagDialog } from "~/components/EditTagDialog";
import { logDeviceOperation, LogLevel } from "~/utils/log.server";
import { requireSuperAdmin } from "~/utils/auth.server";
import { ErrorMessage } from "~/components/ErrorMessage";
import { ConfirmDialog } from "~/components/ConfirmDialog";
import { Layout } from "~/components/Layout";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "~/components/Select";

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
}

interface EditingDevice {
  id: number;
  name: string;
  serialNumber: string;
  location: string;
  primaryTagId: number;
  secondaryTagId: number;
}

interface LoaderData {
  primaryTags: Array<{
    id: number;
    name: string;
    secondaryTags: Array<{
      id: number;
      name: string;
      devices: Array<{
        id: number;
        name: string;
        serialNumber: string;
        location: string;
      }>;
    }>;
  }>;
  devices: Array<{
    id: number;
    name: string;
    serialNumber: string;
    location: string;
    primaryTag: {
      id: number;
      name: string;
    };
    secondaryTag: {
      id: number;
      name: string;
    };
  }>;
}

interface ActionData {
  success?: boolean;
  error?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  await requireSuperAdmin(request);

  // 先获取所有一级标签
  const primaryTags = await db.primaryTag.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  // 自定义排序顺序
  const orderMap = {
    "视频": 1,
    "音频": 2,
    "网络": 3,
  };

  // 对 primaryTags 进行排序
  primaryTags.sort((a, b) => {
    return (orderMap[a.name as keyof typeof orderMap] || 999) - (orderMap[b.name as keyof typeof orderMap] || 999);
  });

  // 获取所有二级标签
  const secondaryTags = await db.secondaryTag.findMany({
    select: {
      id: true,
      name: true,
      primaryTagId: true,
      devices: {
        select: {
          id: true,
          name: true,
          serialNumber: true,
          location: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  // 将二级标签按照 primaryTagId 分组
  const primaryTagsWithSecondary = primaryTags.map(primaryTag => ({
    ...primaryTag,
    secondaryTags: secondaryTags
      .filter(secondaryTag => secondaryTag.primaryTagId === primaryTag.id)
      .map(({ primaryTagId, ...rest }) => rest), // 移除 primaryTagId 字段
  }));

  const devices = await db.device.findMany({
    select: {
      id: true,
      name: true,
      serialNumber: true,
      location: true,
      primaryTag: {
        select: {
          id: true,
          name: true,
        },
      },
      secondaryTag: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return json<LoaderData>({ primaryTags: primaryTagsWithSecondary, devices });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const user = await requireSuperAdmin(request);
    
    const formData = await request.formData();
    const intent = formData.get("intent");
    console.log('Action received:', { intent, formData: Object.fromEntries(formData) });

    switch (intent) {
      case "createTag": {
        const name = formData.get("name") as string;
        const primaryTagId = parseInt(formData.get("primaryTagId") as string);
        
        if (!name || !primaryTagId) {
          return json<ActionData>({ error: "标签名称和一级标签ID不能为空" });
        }

        await db.secondaryTag.create({
          data: {
            name,
            primaryTagId,
          },
        });
        return json<ActionData>({ success: true });
      }

      case "updateTag": {
        const tagId = parseInt(formData.get("tagId") as string);
        const name = formData.get("name") as string;
        if (!name || !tagId) {
          return json<ActionData>({ error: "标签名称和ID不能为空" });
        }

        await db.secondaryTag.update({
          where: { id: tagId },
          data: { name },
        });
        return json<ActionData>({ success: true });
      }

      case "deleteTag": {
        const tagId = parseInt(formData.get("tagId") as string);
        if (!tagId) {
          return json<ActionData>({ error: "标签ID不能为空" });
        }

        const deviceCount = await db.device.count({
          where: { secondaryTagId: tagId },
        });

        if (deviceCount > 0) {
          return json<ActionData>({ error: "该标签下还有关联的设备，无法删除" });
        }

        await db.secondaryTag.delete({
          where: { id: tagId },
        });
        return json<ActionData>({ success: true });
      }

      case "updateDevice": {
        const deviceId = parseInt(formData.get("deviceId") as string);
        const location = formData.get("location") as string;
        const primaryTagId = parseInt(formData.get("primaryTagId") as string);
        const secondaryTagId = parseInt(formData.get("secondaryTagId") as string);
        const serialNumber = formData.get("serialNumber") as string;

        if (!deviceId || !location || !primaryTagId || !secondaryTagId || !serialNumber) {
          return json<ActionData>({ error: "所有字段都是必填的" });
        }

        const secondaryTag = await db.secondaryTag.findUnique({
          where: { id: secondaryTagId },
          select: { name: true },
        });

        if (!secondaryTag) {
          return json<ActionData>({ error: "标签不存在" });
        }

        await db.device.update({
          where: { id: deviceId },
          data: {
            location,
            primaryTagId,
            secondaryTagId,
            serialNumber,
            name: secondaryTag.name,
          },
        });

        await logDeviceOperation(
          deviceId,
          user.id,
          "update",
          `更新设备位置: ${location}`
        );

        return json<ActionData>({ success: true });
      }

      case "deleteDevice": {
        const deviceId = parseInt(formData.get("deviceId") as string);
        if (!deviceId) {
          return json<ActionData>({ error: "设备ID不能为空" });
        }

        await db.device.delete({
          where: { id: deviceId },
        });

        await logDeviceOperation(
          deviceId,
          user.id,
          "delete",
          "删除设备"
        );

        return json<ActionData>({ success: true });
      }

      case "createDevice": {
        const location = formData.get("location") as string;
        const primaryTagId = parseInt(formData.get("primaryTagId") as string);
        const secondaryTagId = parseInt(formData.get("secondaryTagId") as string);
        const serialNumber = formData.get("serialNumber") as string;

        if (!location || !primaryTagId || !secondaryTagId || !serialNumber) {
          return json<ActionData>({ error: "所有字段都是必填的" });
        }

        const secondaryTag = await db.secondaryTag.findUnique({
          where: { id: secondaryTagId },
          select: { name: true },
        });

        if (!secondaryTag) {
          return json<ActionData>({ error: "标签不存在" });
        }

        const device = await db.device.create({
          data: {
            name: secondaryTag.name,
            location,
            primaryTagId,
            secondaryTagId,
            serialNumber,
          },
        });

        await logDeviceOperation(
          device.id,
          user.id,
          "create",
          "创建设备"
        );

        return json<ActionData>({ success: true });
      }

      default:
        return json<ActionData>({ error: "未知的操作类型" });
    }
  } catch (error) {
    console.error('Action error:', error);
    return json<ActionData>({ error: error instanceof Error ? error.message : "操作失败" });
  }
}

export default function DeviceManagePage() {
  const { primaryTags, devices } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  // 状态定义
  const [editingDevice, setEditingDevice] = useState<EditingDevice | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'tag' | 'device';
    id: number;
  } | null>(null);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-6">
          标签管理
        </h2>

        <div className="mb-8 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">添加二级标签</h3>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="createTag" />
            
            <div>
              <label htmlFor="primaryTagId" className="block text-sm font-medium text-white mb-2">
                选择一级标签
              </label>
              <select
                id="primaryTagId"
                name="primaryTagId"
                className="mt-1 block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 [&>option]:text-gray-900"
                required
              >
                <option value="">请选择一级标签</option>
                {primaryTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                二级标签名称
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="mt-1 block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                required
                placeholder="请输入标签名称"
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                添加二级标签
              </button>
            </div>
          </Form>
        </div>

        <div className="grid gap-6">
          {primaryTags.map((primaryTag) => (
            <div key={primaryTag.id} className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  {primaryTag.name}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {primaryTag.secondaryTags.map((secondaryTag) => (
                  <div
                    key={secondaryTag.id}
                    className="group relative bg-gray-900/50 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium text-white">
                        {secondaryTag.name}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <Form method="post" className="inline">
                          <input type="hidden" name="intent" value="deleteTag" />
                          <input type="hidden" name="tagId" value={secondaryTag.id} />
                          <button
                            type="submit"
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            data-testid="delete-tag-button"
                          >
                            <span className="sr-only">删除</span>
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </Form>
                      </div>
                    </div>

                    {secondaryTag.devices.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-400">
                          设备数量: {secondaryTag.devices.length}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-6">
            设备管理
          </h2>
          <DeviceList
            devices={devices}
            onEdit={(device: Device) => {
              const editingDevice: EditingDevice = {
                id: device.id,
                name: device.name,
                serialNumber: device.serialNumber,
                location: device.location,
                primaryTagId: (device as any).primaryTagId,
                secondaryTagId: (device as any).secondaryTagId,
              };
              setEditingDevice(editingDevice);
            }}
          />
        </div>

        {editingDevice && (
          <EditDeviceDialog
            isOpen={true}
            onClose={() => setEditingDevice(null)}
            device={editingDevice}
            primaryTags={primaryTags}
          />
        )}

        <ConfirmDialog
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => {
            if (deleteConfirm) {
              const formData = new FormData();
              formData.append("intent", `delete${deleteConfirm.type === 'tag' ? 'Tag' : 'Device'}`);
              formData.append(`${deleteConfirm.type}Id`, deleteConfirm.id.toString());
              submit(formData, { method: "post" });
            }
          }}
          title={`删除${deleteConfirm?.type === 'tag' ? '标签' : '设备'}`}
          message={`确定要删除这个${deleteConfirm?.type === 'tag' ? '标签' : '设备'}吗？此操作无法撤销。`}
        />

        {actionData?.error && (
          <div className="fixed bottom-4 right-4 z-50">
            <ErrorMessage message={actionData.error} type="error" />
          </div>
        )}

        {actionData?.success && (
          <div className="fixed bottom-4 right-4 z-50">
            <ErrorMessage message="操作成功" type="success" />
          </div>
        )}
      </div>
    </div>
  );
}
