import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigate, useFetcher, useNavigation } from "@remix-run/react";
import { useState, useEffect } from "react";
import { db } from "~/utils/db.server";
import { requireUser } from "~/utils/auth.server";
import { ErrorMessage } from "~/components/ErrorMessage";
import { logDeviceOperation } from "~/utils/log.server";

interface LoaderData {
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

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUser(request);
  
  const [devices, primaryTags] = await Promise.all([
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
      orderBy: { id: 'desc' },
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

  return json<LoaderData>({ devices, primaryTags });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "deleteDevice") {
      const id = parseInt(formData.get("id") as string);

      if (!id) {
        throw new Error("设备ID是必需的");
      }

      await db.device.delete({
        where: { id },
      });

      await logDeviceOperation(
        id,
        user.id,
        "delete",
        `删除设备`
      );

      return json<ActionData>({ success: true });
    }

    if (intent === "addSecondaryTag") {
      const primaryTagId = parseInt(formData.get("primaryTagId") as string);
      const name = formData.get("name") as string;

      if (!primaryTagId || !name) {
        throw new Error("所有字段都是必填的");
      }

      await db.secondaryTag.create({
        data: {
          name,
          primaryTagId,
        },
      });

      return json<ActionData>({ success: true });
    }

    if (intent === "editSecondaryTag") {
      const id = parseInt(formData.get("id") as string);
      const name = formData.get("name") as string;

      if (!id || !name) {
        throw new Error("所有字段都是必填的");
      }

      await db.secondaryTag.update({
        where: { id },
        data: { name },
      });

      return json<ActionData>({ success: true });
    }

    if (intent === "deleteSecondaryTag") {
      const id = parseInt(formData.get("id") as string);

      if (!id) {
        throw new Error("标签ID是必需的");
      }

      // 检查是否有设备使用此标签
      const devicesCount = await db.device.count({
        where: { secondaryTagId: id },
      });

      if (devicesCount > 0) {
        throw new Error("无法删除已被使用的标签");
      }

      await db.secondaryTag.delete({
        where: { id },
      });

      return json<ActionData>({ success: true });
    }

    throw new Error("无效的操作");
  } catch (error) {
    return json<ActionData>({ 
      error: error instanceof Error ? error.message : "操作失败" 
    });
  }
}

export default function DevicesPage() {
  const { devices, primaryTags } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const [selectedPrimaryTagId, setSelectedPrimaryTagId] = useState<string>("");
  const [editingTag, setEditingTag] = useState<{ id: number; name: string } | null>(null);

  const isProcessing = navigation.state === "submitting" || fetcher.state === "submitting";

  // 处理标签添加
  const handleAddTag = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    fetcher.submit(formData, { method: "post" });
    event.currentTarget.reset();
    setSelectedPrimaryTagId("");
  };

  // 处理标签编辑
  const handleEditTag = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    fetcher.submit(formData, { method: "post" });
    setEditingTag(null);
  };

  // 处理标签删除
  const handleDeleteTag = (event: React.FormEvent<HTMLFormElement>, tagId: number) => {
    event.preventDefault();
    if (!confirm("确定要删除这个标签吗？")) {
      return;
    }
    fetcher.submit(event.currentTarget, { method: "post" });
  };

  // 处理设备删除
  const handleDeleteDevice = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!confirm("确定要删除这个设备吗？")) {
      return;
    }
    fetcher.submit(event.currentTarget, { method: "post" });
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
        设备管理
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 设备列表 */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">设备列表</h2>
          <div className="bg-gray-800/50 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    设备名称
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    序列号
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    存放地点
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    一级标签
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    二级标签
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                {devices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-700/30">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {device.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {device.serialNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {device.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {device.primaryTag.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {device.secondaryTag.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => navigate(`/dashboard/devices/${device.id}`)}
                        className="text-blue-400 hover:text-blue-300 mr-4"
                      >
                        修改
                      </button>
                      <fetcher.Form method="post" className="inline" onSubmit={handleDeleteDevice}>
                        <input type="hidden" name="intent" value="deleteDevice" />
                        <input type="hidden" name="id" value={device.id} />
                        <button
                          type="submit"
                          className="text-red-400 hover:text-red-300"
                          disabled={isProcessing}
                        >
                          删除
                        </button>
                      </fetcher.Form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 标签管理 */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">标签管理</h2>
          <div className="bg-gray-800/50 rounded-lg p-6 space-y-6">
            {/* 添加新标签 */}
            <fetcher.Form method="post" className="space-y-4" onSubmit={handleAddTag}>
              <input type="hidden" name="intent" value="addSecondaryTag" />
              
              <div>
                <label htmlFor="primaryTagId" className="block text-sm font-medium text-gray-300">
                  选择一级标签
                </label>
                <select
                  id="primaryTagId"
                  name="primaryTagId"
                  value={selectedPrimaryTagId}
                  onChange={(e) => setSelectedPrimaryTagId(e.target.value)}
                  className="mt-1 block w-full rounded-md border-0 bg-gray-700 text-white shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
                  required
                  disabled={isProcessing}
                >
                  <option value="">请选择一级标签</option>
                  {primaryTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label htmlFor="newTagName" className="block text-sm font-medium text-gray-300">
                    新标签名称
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="newTagName"
                    className="mt-1 block w-full rounded-md border-0 bg-gray-700 text-white shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
                    required
                    disabled={isProcessing}
                  />
                </div>
                <button
                  type="submit"
                  className="self-end px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  disabled={isProcessing}
                >
                  添加
                </button>
              </div>
            </fetcher.Form>

            {/* 现有标签列表 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">现有标签</h3>
              {primaryTags.map((primaryTag) => (
                <div key={primaryTag.id} className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                  <h4 className="text-md font-medium text-gray-300">{primaryTag.name}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {primaryTag.secondaryTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between p-2 rounded-md bg-gray-600/50"
                      >
                        {editingTag?.id === tag.id ? (
                          <fetcher.Form method="post" className="flex-1 flex gap-2" onSubmit={handleEditTag}>
                            <input type="hidden" name="intent" value="editSecondaryTag" />
                            <input type="hidden" name="id" value={tag.id} />
                            <input
                              type="text"
                              name="name"
                              defaultValue={tag.name}
                              className="block flex-1 rounded-md border-0 bg-gray-500 text-white shadow-sm ring-1 ring-inset ring-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
                              required
                              disabled={isProcessing}
                            />
                            <button
                              type="submit"
                              className="text-green-400 hover:text-green-300 disabled:opacity-50"
                              disabled={isProcessing}
                            >
                              保存
                            </button>
                          </fetcher.Form>
                        ) : (
                          <>
                            <span className="text-sm text-gray-300">{tag.name}</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingTag(tag)}
                                className="text-blue-400 hover:text-blue-300"
                                disabled={isProcessing}
                              >
                                编辑
                              </button>
                              <fetcher.Form 
                                method="post" 
                                className="inline"
                                onSubmit={(e) => handleDeleteTag(e, tag.id)}
                              >
                                <input type="hidden" name="intent" value="deleteSecondaryTag" />
                                <input type="hidden" name="id" value={tag.id} />
                                <button
                                  type="submit"
                                  className="text-red-400 hover:text-red-300 disabled:opacity-50"
                                  disabled={isProcessing}
                                >
                                  删除
                                </button>
                              </fetcher.Form>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {(actionData?.error || fetcher.data?.error) && (
        <div className="fixed bottom-4 right-4">
          <ErrorMessage message={actionData?.error || fetcher.data?.error} type="error" />
        </div>
      )}
      {(actionData?.success || fetcher.data?.success) && (
        <div className="fixed bottom-4 right-4">
          <ErrorMessage message="操作成功" type="success" />
        </div>
      )}
    </div>
  );
} 