import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData, useNavigate } from "@remix-run/react";
import { getUserType, requireUserId } from "~/utils/session.server";
import { db } from "~/utils/db.server";
import type { Device, DeviceFormErrors } from "~/types/device";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userType = await getUserType(request);
  if (userType !== "super_admin") {
    throw new Error("无权限访问");
  }

  const device = await db.device.findUnique({
    where: { id: parseInt(params.id!) },
  });

  if (!device) {
    throw new Error("设备不存在");
  }

  return json({ device });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userType = await getUserType(request);
  if (userType !== "super_admin") {
    throw new Error("无权限访问");
  }

  const userId = await requireUserId(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await db.device.delete({
      where: { id: parseInt(params.id!) },
    });

    await db.deviceLog.create({
      data: {
        deviceId: parseInt(params.id!),
        userId,
        action: "delete",
        details: "删除设备",
      },
    });

    return redirect("/dashboard/devices");
  }

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
    const device = await db.device.update({
      where: { id: parseInt(params.id!) },
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
        action: "update",
        details: "更新设备信息",
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

export default function EditDevicePage() {
  const { device } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-white">编辑设备</h1>
          <p className="mt-2 text-sm text-gray-300">
            编辑设备信息
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => navigate(`/dashboard/devices/${device.id}/logs`)}
            className="block rounded-md bg-gray-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-gray-500"
          >
            查看操作日志
          </button>
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
                defaultValue={device.name}
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                required
              />
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
                defaultValue={device.serialNumber}
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                required
              />
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
                defaultValue={device.type}
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                required
              />
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
                defaultValue={device.location}
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                required
              />
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
                defaultValue={device.status}
                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
              >
                <option value="normal">正常</option>
                <option value="maintenance">维护中</option>
                <option value="broken">故障</option>
                <option value="scrapped">已报废</option>
              </select>
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
                defaultValue={device.notes || ""}
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
            name="intent"
            value="delete"
            className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
            onClick={(e) => {
              if (!confirm("确定要删除这个设备吗？")) {
                e.preventDefault();
              }
            }}
          >
            删除
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
  );
} 