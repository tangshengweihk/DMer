import { useState, useEffect } from "react";
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
  const [selectedSecondaryTagId, setSelectedSecondaryTagId] = useState(
    device?.secondaryTagId?.toString() || ""
  );

  useEffect(() => {
    if (device) {
      setSelectedPrimaryTagId(device.primaryTagId?.toString() || "");
      setSelectedSecondaryTagId(device.secondaryTagId?.toString() || "");
    } else {
      setSelectedPrimaryTagId("");
      setSelectedSecondaryTagId("");
    }
  }, [device]);

  if (!isOpen) return null;

  const selectedPrimaryTag = primaryTags.find(
    tag => tag.id.toString() === selectedPrimaryTagId
  );

  const handlePrimaryTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPrimaryTagId = e.target.value;
    setSelectedPrimaryTagId(newPrimaryTagId);
    setSelectedSecondaryTagId("");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="relative inline-block align-bottom bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
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
                  onChange={handlePrimaryTagChange}
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
                  value={selectedSecondaryTagId}
                  onChange={(e) => setSelectedSecondaryTagId(e.target.value)}
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

              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                >
                  保存
                </button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
