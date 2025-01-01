import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData, Form } from "@remix-run/react";
import { useState } from "react";
import { db } from "~/utils/db.server";
import { DeviceList } from "~/components/DeviceList";
import { EditDeviceDialog } from "~/components/EditDeviceDialog";
import { logDeviceOperation } from "~/utils/log.server";
import { requireUser } from "~/utils/auth.server";
import { ErrorMessage } from "~/components/ErrorMessage";
import { ConfirmDialog } from "~/components/ConfirmDialog";
import { Layout } from "~/components/Layout";

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
  const [primaryTags, devices] = await Promise.all([
    db.primaryTag.findMany({
      include: {
        secondaryTags: {
          include: {
            devices: {
              select: {
                id: true,
                name: true,
                serialNumber: true,
                location: true,
              },
            },
          },
        },
      },
    }),
    db.device.findMany({
      include: {
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
    }),
  ]);

  return json<LoaderData>({ primaryTags, devices });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const user = await requireUser(request);
    const formData = await request.formData();
    const intent = formData.get("intent");

    switch (intent) {
      case "createTag": {
        const name = formData.get("name") as string;
        const primaryTagId = parseInt(formData.get("primaryTagId") as string);
        if (!name || !primaryTagId) {
          throw new Error("标签名称和一级标签ID不能为空");
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
          throw new Error("标签名称和ID不能为空");
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
          throw new Error("标签ID不能为空");
        }

        // 检查是否有关联的设备
        const deviceCount = await db.device.count({
          where: { secondaryTagId: tagId },
        });

        if (deviceCount > 0) {
          throw new Error("该标签下还有关联的设备，无法删除");
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
          throw new Error("所有字段都是必填的");
        }

        // 获取标签信息
        const secondaryTag = await db.secondaryTag.findUnique({
          where: { id: secondaryTagId },
          select: { name: true },
        });

        if (!secondaryTag) {
          throw new Error("标签不存在");
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
          throw new Error("设备ID不能为空");
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

      default:
        throw new Error("Invalid intent");
    }
  } catch (error) {
    return json<ActionData>({ error: error instanceof Error ? error.message : "操作失败" });
  }
}

interface EditTagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  primaryTagId: number;
  secondaryTag?: {
    id: number;
    name: string;
  };
  onSubmit: (data: { name: string }) => void;
}

function EditTagDialog({ isOpen, onClose, primaryTagId, secondaryTag, onSubmit }: EditTagDialogProps) {
  const [name, setName] = useState(secondaryTag?.name || "");
  const submit = useSubmit();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append("name", name);
    formData.append("primaryTagId", primaryTagId.toString());
    
    if (secondaryTag) {
      formData.append("intent", "updateTag");
      formData.append("tagId", secondaryTag.id.toString());
    } else {
      formData.append("intent", "createTag");
    }

    submit(formData, { method: "post" });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
        <h3 className="text-lg font-medium text-white mb-4">
          {secondaryTag ? "修改二级标签" : "添加二级标签"}
        </h3>
        <Form method="post" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white">
              标签名称
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm text-gray-300 hover:text-white"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              保存
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}

export default function DeviceManagePage() {
  const { primaryTags, devices } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const [editingTag, setEditingTag] = useState<{
    primaryTagId: number;
    secondaryTag?: {
      id: number;
      name: string;
    };
  } | null>(null);
  const [editingDevice, setEditingDevice] = useState<EditingDevice | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'tag' | 'device';
    id: number;
  } | null>(null);

  const handleDelete = (tagId: number) => {
    if (confirm("确定要删除这个标签吗？删除后无法恢复。")) {
      const formData = new FormData();
      formData.append("intent", "deleteTag");
      formData.append("tagId", tagId.toString());
      submit(formData, { method: "post" });
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-6">
          标签管理
        </h2>
        <div className="grid gap-6">
          {primaryTags.map((primaryTag) => (
            <div key={primaryTag.id} className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  {primaryTag.name}
                </h3>
                <button
                  onClick={() => setEditingTag({ primaryTagId: primaryTag.id })}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  添加二级标签
                </button>
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
                        <button
                          onClick={() =>
                            setEditingTag({
                              primaryTagId: primaryTag.id,
                              secondaryTag: {
                                id: secondaryTag.id,
                                name: secondaryTag.name,
                              },
                            })
                          }
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <span className="sr-only">编辑</span>
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'tag', id: secondaryTag.id })}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <span className="sr-only">删除</span>
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
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

      <EditTagDialog
        isOpen={!!editingTag}
        onClose={() => setEditingTag(null)}
        primaryTagId={editingTag?.primaryTagId || 0}
        secondaryTag={editingTag?.secondaryTag}
        onSubmit={() => {}}
      />

      <EditDeviceDialog
        isOpen={!!editingDevice}
        onClose={() => setEditingDevice(null)}
        device={editingDevice || undefined}
        primaryTags={primaryTags}
      />

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
  );
} 