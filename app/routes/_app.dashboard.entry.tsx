import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { db } from "~/utils/db.server";
import { requireUser } from "~/utils/auth.server";
import { ErrorMessage } from "~/components/ErrorMessage";
import { logDeviceOperation } from "~/utils/log.server";
import { countSerialNumbers } from "~/utils/serialNumber";
import { parseSerialNumbers } from "~/utils/serialNumber.server";
import type { PrismaClient } from "@prisma/client";
import { Layout } from "~/components/Layout";

interface LoaderData {
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

interface DeviceEntry {
  id: number;
  location: string;
  primaryTagId: string;
  secondaryTagId: string;
  serialNumbers: string;
  deviceCount: number;
}

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUser(request);
  
  const primaryTags = await db.primaryTag.findMany({
    include: {
      secondaryTags: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return json<LoaderData>({ primaryTags });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();

  try {
    // 解析表单数据
    const entries: Array<{
      location: string;
      primaryTagId: string;
      secondaryTagId: string;
      serialNumbers: string;
    }> = [];

    // 收集所有条目的数据
    for (const [key, value] of formData.entries()) {
      const match = key.match(/^entries\[(\d+)\]\.(.+)$/);
      if (match) {
        const [, id, field] = match;
        if (!entries[parseInt(id)]) {
          entries[parseInt(id)] = {
            location: "",
            primaryTagId: "",
            secondaryTagId: "",
            serialNumbers: ""
          };
        }
        entries[parseInt(id)][field as keyof typeof entries[0]] = value as string;
      }
    }

    // 过滤掉空条目
    const validEntries = entries.filter(entry => 
      entry && entry.location && entry.primaryTagId && entry.secondaryTagId && entry.serialNumbers
    );

    if (validEntries.length === 0) {
      throw new Error("至少需要一条有效的设备记录");
    }

    // 批量处理所有条目
    await db.$transaction(async (tx) => {
      for (const entry of validEntries) {
        // 获取标签信息
        const secondaryTag = await tx.secondaryTag.findUnique({
          where: { id: parseInt(entry.secondaryTagId) },
          select: { name: true },
        });

        if (!secondaryTag) {
          throw new Error("标签不存在");
        }

        // 解析序列号
        const serialNumbers = parseSerialNumbers(entry.serialNumbers);

        for (const serialNumber of serialNumbers) {
          // 检查设备是否已存在
          const existingDevice = await tx.device.findFirst({
            where: {
              name: secondaryTag.name,
              serialNumber: serialNumber,
            },
          });

          if (existingDevice) {
            // 更新已有设备的位置
            await tx.device.update({
              where: { id: existingDevice.id },
              data: { location: entry.location },
            });

            // 记录更新操作
            await logDeviceOperation(
              existingDevice.id,
              user.id,
              "update",
              `更新设备位置: ${entry.location}`
            );
          } else {
            // 创建新设备
            const newDevice = await tx.device.create({
              data: {
                name: secondaryTag.name,
                serialNumber,
                location: entry.location,
                primaryTagId: parseInt(entry.primaryTagId),
                secondaryTagId: parseInt(entry.secondaryTagId),
              },
            });

            // 记录创建操作
            await logDeviceOperation(
              newDevice.id,
              user.id,
              "create",
              `创建设备，位置: ${entry.location}`
            );
          }
        }
      }
    });

    return json<ActionData>({ success: true });
  } catch (error) {
    return json<ActionData>({ 
      error: error instanceof Error ? error.message : "创建设备失败" 
    });
  }
}

export default function DeviceEntryPage() {
  const { primaryTags } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [entries, setEntries] = useState<DeviceEntry[]>([
    { id: 1, location: "", primaryTagId: "", secondaryTagId: "", serialNumbers: "", deviceCount: 0 }
  ]);

  // 添加新条目
  const addEntry = () => {
    const lastEntry = entries[entries.length - 1];
    setEntries([
      ...entries,
      {
        id: lastEntry.id + 1,
        location: lastEntry.location, // 复用上一条的位置
        primaryTagId: "",
        secondaryTagId: "",
        serialNumbers: "",
        deviceCount: 0
      }
    ]);
  };

  // 删除条目
  const removeEntry = (id: number) => {
    if (entries.length === 1) {
      return; // 不能删除第一条
    }
    setEntries(entries.filter(entry => entry.id !== id));
  };

  // 更新条目
  const updateEntry = (id: number, field: keyof DeviceEntry, value: string) => {
    setEntries(entries.map(entry => {
      if (entry.id === id) {
        if (field === "location") {
          // 当更新位置时，同步更新所有条目的位置
          entries.forEach(e => e.location = value);
        }
        const updatedEntry = { ...entry, [field]: value };
        
        // 如果更新的是序列号，计算设备数量
        if (field === "serialNumbers") {
          updatedEntry.deviceCount = countSerialNumbers(value);
        }
        
        return updatedEntry;
      }
      if (field === "location") {
        return { ...entry, location: value };
      }
      return entry;
    }));
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
        设备录入
      </h1>

      <div className="space-y-8">
        <Form method="post" className="space-y-6">
          {entries.map((entry, index) => (
            <div key={entry.id} className="relative bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                >
                  <span className="sr-only">删除</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <label htmlFor={`primaryTagId-${entry.id}`} className="block text-sm font-medium text-gray-300">
                    一级标签
                  </label>
                  <select
                    id={`primaryTagId-${entry.id}`}
                    name={`entries[${entry.id}].primaryTagId`}
                    value={entry.primaryTagId}
                    onChange={(e) => updateEntry(entry.id, "primaryTagId", e.target.value)}
                    className="mt-1 block w-full rounded-md border-0 bg-gray-900/50 py-1.5 text-white shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 [&>option]:text-gray-900"
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
                  <label htmlFor={`secondaryTagId-${entry.id}`} className="block text-sm font-medium text-gray-300">
                    二级标签
                  </label>
                  <select
                    id={`secondaryTagId-${entry.id}`}
                    name={`entries[${entry.id}].secondaryTagId`}
                    value={entry.secondaryTagId}
                    onChange={(e) => updateEntry(entry.id, "secondaryTagId", e.target.value)}
                    className="mt-1 block w-full rounded-md border-0 bg-gray-900/50 py-1.5 text-white shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 [&>option]:text-gray-900"
                    required
                    disabled={!entry.primaryTagId}
                  >
                    <option value="">请选择二级标签</option>
                    {entry.primaryTagId && primaryTags
                      .find(tag => tag.id.toString() === entry.primaryTagId)
                      ?.secondaryTags.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={`location-${entry.id}`} className="block text-sm font-medium text-gray-300">
                    存放地点
                  </label>
                  <input
                    type="text"
                    id={`location-${entry.id}`}
                    name={`entries[${entry.id}].location`}
                    value={entry.location}
                    onChange={(e) => updateEntry(entry.id, "location", e.target.value)}
                    className="mt-1 block w-full rounded-md border-0 bg-gray-900/50 py-1.5 text-white shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                    required
                  />
                </div>
              </div>

              <div className="mt-4 relative">
                <label htmlFor={`serialNumbers-${entry.id}`} className="block text-sm font-medium text-gray-300">
                  序列号（用逗号分隔或使用-表示范围，例如：1-5,7,9-11）
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id={`serialNumbers-${entry.id}`}
                    name={`entries[${entry.id}].serialNumbers`}
                    value={entry.serialNumbers}
                    onChange={(e) => updateEntry(entry.id, "serialNumbers", e.target.value)}
                    className="block w-full rounded-md border-0 bg-gray-900/50 py-1.5 text-white shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                    required
                  />
                  {entry.deviceCount > 0 && (
                    <span className="absolute right-0 top-0 -mt-6 text-sm text-gray-400">
                      数量: {entry.deviceCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={addEntry}
              className="inline-flex items-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              添加设备
            </button>

            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              提交
            </button>
          </div>
        </Form>

        {/* 操作结果提示 */}
        {actionData?.error && (
          <div className="fixed bottom-4 right-4 z-50">
            <ErrorMessage message={actionData.error} type="error" />
          </div>
        )}
        {actionData?.success && (
          <div className="fixed bottom-4 right-4 z-50">
            <ErrorMessage message="设备创建成功" type="success" />
          </div>
        )}
      </div>
    </div>
  );
} 