import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { db } from "~/utils/db.server";
import { requireUser } from "~/utils/auth.server";
import { ErrorMessage } from "~/components/ErrorMessage";
import { logDeviceOperation } from "~/utils/log.server";
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
  parsedDevices?: Array<{
    serialNumber: string;
    isValid: boolean;
    error?: string;
  }>;
}

// 序列号解析和验证函数
function parseSerialNumbers(input: string): Array<{ serialNumber: string; isValid: boolean; error?: string }> {
  return input
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(serialNumber => {
      // 序列号格式验证规则：字母数字组合，长度8-20位
      const isValid = /^[A-Za-z0-9]{8,20}$/.test(serialNumber);
      return {
        serialNumber,
        isValid,
        error: isValid ? undefined : '序列号格式不正确，应为8-20位字母数字组合'
      };
    });
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
  const intent = formData.get("intent");

  if (intent === "parse") {
    const serialNumbers = formData.get("serialNumbers") as string;
    const parsedDevices = parseSerialNumbers(serialNumbers);
    return json<ActionData>({ parsedDevices });
  }

  if (intent === "create") {
    try {
      const location = formData.get("location") as string;
      const primaryTagId = parseInt(formData.get("primaryTagId") as string);
      const secondaryTagId = parseInt(formData.get("secondaryTagId") as string);
      const serialNumbers = formData.get("serialNumbers") as string;

      if (!location || !primaryTagId || !secondaryTagId || !serialNumbers) {
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

      const parsedDevices = parseSerialNumbers(serialNumbers);
      if (parsedDevices.some(device => !device.isValid)) {
        throw new Error("存在格式不正确的序列号");
      }

      // 批量创建设备
      await db.$transaction(async (tx: PrismaClient) => {
        for (const device of parsedDevices) {
          const newDevice = await tx.device.create({
            data: {
              name: secondaryTag.name,
              serialNumber: device.serialNumber,
              location,
              primaryTagId,
              secondaryTagId,
            },
          });

          await logDeviceOperation(
            newDevice.id,
            user.id,
            "create",
            `创建设备，位置: ${location}`
          );
        }
      });

      return json<ActionData>({ success: true });
    } catch (error) {
      return json<ActionData>({ 
        error: error instanceof Error ? error.message : "创建设备失败" 
      });
    }
  }

  throw new Error("Invalid intent");
}

export default function DeviceEntryPage() {
  const { primaryTags } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [selectedPrimaryTagId, setSelectedPrimaryTagId] = useState("");
  const [serialNumbers, setSerialNumbers] = useState("");

  const selectedPrimaryTag = primaryTags.find(
    tag => tag.id.toString() === selectedPrimaryTagId
  );

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
        设备录入
      </h1>

      <div className="space-y-8">
        {/* 序列号输入和解析 */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-medium text-white mb-4">序列号输入</h2>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="parse" />
            
            <div>
              <label htmlFor="serialNumbers" className="block text-sm font-medium text-gray-300 mb-2">
                序列号（每行一个）
              </label>
              <textarea
                id="serialNumbers"
                name="serialNumbers"
                value={serialNumbers}
                onChange={(e) => setSerialNumbers(e.target.value)}
                rows={5}
                className="mt-1 block w-full rounded-md border-0 bg-gray-900/50 py-1.5 text-white shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                placeholder="请输入序列号，每行一个"
                required
              />
            </div>

            <div>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                解析序列号
              </button>
            </div>
          </Form>
        </div>

        {/* 解析结果展示 */}
        {actionData?.parsedDevices && (
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-medium text-white mb-4">解析结果</h2>
            <div className="space-y-2">
              {actionData.parsedDevices.map((device, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-md ${
                    device.isValid 
                      ? 'bg-green-900/20 border border-green-800/50' 
                      : 'bg-red-900/20 border border-red-800/50'
                  }`}
                >
                  <span className={`text-sm ${device.isValid ? 'text-green-400' : 'text-red-400'}`}>
                    {device.serialNumber}
                  </span>
                  {device.error && (
                    <span className="text-sm text-red-400">{device.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 设备信息表单 */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-medium text-white mb-4">设备信息</h2>
          <Form method="post" className="space-y-6">
            <input type="hidden" name="intent" value="create" />
            <input type="hidden" name="serialNumbers" value={serialNumbers} />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="primaryTagId" className="block text-sm font-medium text-gray-300">
                  一级标签
                </label>
                <select
                  id="primaryTagId"
                  name="primaryTagId"
                  value={selectedPrimaryTagId}
                  onChange={(e) => setSelectedPrimaryTagId(e.target.value)}
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
                <label htmlFor="secondaryTagId" className="block text-sm font-medium text-gray-300">
                  二级标签
                </label>
                <select
                  id="secondaryTagId"
                  name="secondaryTagId"
                  className="mt-1 block w-full rounded-md border-0 bg-gray-900/50 py-1.5 text-white shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 [&>option]:text-gray-900"
                  required
                  disabled={!selectedPrimaryTagId}
                >
                  <option value="">请选择二级标签</option>
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
                <input
                  type="text"
                  id="location"
                  name="location"
                  className="mt-1 block w-full rounded-md border-0 bg-gray-900/50 py-1.5 text-white shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                  required
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={!actionData?.parsedDevices?.every(d => d.isValid)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                批量创建设备
              </button>
            </div>
          </Form>
        </div>

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