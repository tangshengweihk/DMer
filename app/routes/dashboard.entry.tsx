import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useNavigate } from "@remix-run/react";
import { getUserId, getUserType, requireUserId } from "~/utils/session.server";
import { db } from "~/utils/db.server";
import type { Device, DeviceFormErrors } from "~/types/device";

export async function loader({ request }: LoaderFunctionArgs) {
  const userType = await getUserType(request);
  if (!["super_admin", "admin"].includes(userType)) {
    throw new Error("无权限访问");
  }
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const userType = await getUserType(request);
  if (!["super_admin", "admin"].includes(userType)) {
    throw new Error("无权限访问");
  }

  const userId = await requireUserId(request);
  const formData = await request.formData();
  const name = formData.get("name");
  const serialNumber = formData.get("serialNumber");
  const type = formData.get("type");
  const location = formData.get("location");
  const status = formData.get("status");
  const notes = formData.get("notes");

  const errors: DeviceFormErrors = {};
  if (!name) errors.name = "设备名称是必填项";
  if (!serialNumber) errors.serialNumber = "设备编号是必填项";
  if (!type) errors.type = "设备类型是必填项";
  if (!location) errors.location = "设备位置是必填项";
  if (!status) errors.status = "设备状态是必填项";

  if (Object.keys(errors).length > 0) {
    return json({ errors });
  }

  try {
    const device = await db.device.create({
      data: {
        name: name as string,
        serialNumber: serialNumber as string,
        type: type as string,
        location: location as string,
        status: status as string,
        notes: notes ? String(notes) : null,
      },
    });

    await db.deviceLog.create({
      data: {
        deviceId: device.id,
        userId,
        action: "create",
        details: "创建新设备",
      },
    });

    return redirect("/dashboard/devices");
  } catch (e: unknown) {
    if (e instanceof Error && 'code' in e && e.code === "P2002") {
      return json({
        errors: {
          serialNumber: "设备编号已存在",
        },
      });
    }
    throw e;
  }
}

export default function EntryPage() {
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-white">设备录入</h1>
          <p className="mt-2 text-sm text-gray-300">
            添加新的设备信息到系统中
          </p>
        </div>
      </div>

      <Form method="post" className="mt-8 space-y-6">
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white">
              设备名称
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="name"
                id="name"
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                required
              />
              {actionData?.errors?.name && (
                <p className="mt-2 text-sm text-red-500">{actionData.errors.name}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="serialNumber" className="block text-sm font-medium text-white">
              设备编号
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="serialNumber"
                id="serialNumber"
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                required
              />
              {actionData?.errors?.serialNumber && (
                <p className="mt-2 text-sm text-red-500">{actionData.errors.serialNumber}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-white">
              设备类型
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="type"
                id="type"
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                required
              />
              {actionData?.errors?.type && (
                <p className="mt-2 text-sm text-red-500">{actionData.errors.type}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-white">
              设备位置
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="location"
                id="location"
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                required
              />
              {actionData?.errors?.location && (
                <p className="mt-2 text-sm text-red-500">{actionData.errors.location}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-white">
              设备状态
            </label>
            <div className="mt-2">
              <select
                id="status"
                name="status"
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                defaultValue="normal"
              >
                <option value="normal">正常</option>
                <option value="maintenance">维护中</option>
                <option value="broken">故障</option>
                <option value="scrapped">已报废</option>
              </select>
              {actionData?.errors?.status && (
                <p className="mt-2 text-sm text-red-500">{actionData.errors.status}</p>
              )}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-white">
              备注
            </label>
            <div className="mt-2">
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-x-6">
          <button
            type="button"
            onClick={() => navigate("/dashboard/devices")}
            className="text-sm font-semibold text-white hover:text-gray-300"
          >
            取消
          </button>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            保存
          </button>
        </div>
      </Form>
    </div>
  );
} 