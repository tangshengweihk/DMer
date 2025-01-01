import { useState } from "react";
import { Form } from "@remix-run/react";

interface Tag {
  id: number;
  name: string;
  secondaryTags?: {
    id: number;
    name: string;
  }[];
}

interface EditDeviceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  device?: {
    id: number;
    name: string;
    serialNumber: string;
    location: string;
    primaryTagId: number;
    secondaryTagId: number;
  };
  primaryTags: Tag[];
}

export function EditDeviceDialog({
  isOpen,
  onClose,
  device,
  primaryTags,
}: EditDeviceDialogProps) {
  const [selectedPrimaryTagId, setSelectedPrimaryTagId] = useState(
    device?.primaryTagId?.toString() || ""
  );

  if (!isOpen) return null;

  const selectedPrimaryTag = primaryTags.find(
    tag => tag.id.toString() === selectedPrimaryTagId
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
        <h3 className="text-lg font-medium text-white mb-4">
          {device ? "修改设备" : "添加设备"}
        </h3>
        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value={device ? "updateDevice" : "createDevice"} />
          {device && <input type="hidden" name="deviceId" value={device.id} />}

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-white">
              存放地点
            </label>
            <input
              type="text"
              id="location"
              name="location"
              defaultValue={device?.location}
              className="mt-1 block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
              required
            />
          </div>

          <div>
            <label htmlFor="primaryTagId" className="block text-sm font-medium text-white">
              一级标签
            </label>
            <select
              id="primaryTagId"
              name="primaryTagId"
              value={selectedPrimaryTagId}
              onChange={(e) => setSelectedPrimaryTagId(e.target.value)}
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
            <label htmlFor="secondaryTagId" className="block text-sm font-medium text-white">
              二级标签
            </label>
            <select
              id="secondaryTagId"
              name="secondaryTagId"
              defaultValue={device?.secondaryTagId}
              className="mt-1 block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 [&>option]:text-gray-900"
              required
              disabled={!selectedPrimaryTagId}
            >
              <option value="">请选择二级标签</option>
              {selectedPrimaryTag?.secondaryTags?.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="serialNumber" className="block text-sm font-medium text-white">
              序列号
            </label>
            <input
              type="text"
              id="serialNumber"
              name="serialNumber"
              defaultValue={device?.serialNumber}
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