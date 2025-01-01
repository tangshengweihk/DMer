import { useState } from "react";
import { parseSerialNumbers } from "~/utils/serialNumber.server";

interface DeviceEntry {
  id: number;
  location: string;
  primaryTagId: string;
  secondaryTagId: string;
  serialNumber: string;
}

interface Tag {
  id: number;
  name: string;
  secondaryTags: {
    id: number;
    name: string;
  }[];
}

interface DeviceEntryFormProps {
  primaryTags: Tag[];
  onError: (error: string) => void;
}

interface DeviceCount {
  deviceName: string;
  location: string;
  count: number;
}

export function DeviceEntryForm({ primaryTags, onError }: DeviceEntryFormProps) {
  const [entries, setEntries] = useState<DeviceEntry[]>([
    { id: 1, location: "", primaryTagId: "", secondaryTagId: "", serialNumber: "" }
  ]);
  const [deviceCounts, setDeviceCounts] = useState<Record<string, number>>({});

  const addEntry = () => {
    const lastEntry = entries[entries.length - 1];
    setEntries([
      ...entries,
      {
        id: lastEntry.id + 1,
        location: lastEntry.location, // 复用上一条的位置
        primaryTagId: "",
        secondaryTagId: "",
        serialNumber: ""
      }
    ]);
  };

  const removeEntry = (id: number) => {
    if (entries.length === 1) {
      onError("至少需要保留一条记录");
      return;
    }
    setEntries(entries.filter(entry => entry.id !== id));
  };

  const updateEntry = (id: number, field: keyof DeviceEntry, value: string) => {
    setEntries(entries.map(entry => {
      if (entry.id === id) {
        if (field === "primaryTagId") {
          // 当更新一级标签时，清空二级标签
          return { ...entry, [field]: value, secondaryTagId: "" };
        }
        if (field === "location") {
          // 当更新位置时，同步更新所有条目的位置
          entries.forEach(e => e.location = value);
        }
        return { ...entry, [field]: value };
      }
      if (field === "location") {
        return { ...entry, location: value };
      }
      return entry;
    }));
  };

  const updateSerialNumber = (id: number, value: string) => {
    try {
      const numbers = parseSerialNumbers(value);
      setDeviceCounts(prev => ({
        ...prev,
        [id]: numbers.length
      }));
      updateEntry(id, "serialNumber", value);
    } catch (error) {
      // 序列号格式无效时不更新数量
      updateEntry(id, "serialNumber", value);
    }
  };

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => (
        <div key={entry.id} className="relative border border-gray-700 rounded-lg p-4">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-white">
                存放地点
              </label>
              <input
                type="text"
                name={`entries[${entry.id}].location`}
                value={entry.location}
                onChange={(e) => updateEntry(entry.id, "location", e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white">
                一级标签
              </label>
              <select
                name={`entries[${entry.id}].primaryTagId`}
                value={entry.primaryTagId}
                onChange={(e) => updateEntry(entry.id, "primaryTagId", e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 [&>option]:text-gray-900"
              >
                <option value="" className="text-gray-900">请选择一级标签</option>
                {primaryTags.map((tag) => (
                  <option key={tag.id} value={tag.id} className="text-gray-900">
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white">
                二级标签
              </label>
              <select
                name={`entries[${entry.id}].secondaryTagId`}
                value={entry.secondaryTagId}
                onChange={(e) => updateEntry(entry.id, "secondaryTagId", e.target.value)}
                required
                disabled={!entry.primaryTagId}
                className="mt-1 block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 [&>option]:text-gray-900"
              >
                <option value="" className="text-gray-900">请选择二级标签</option>
                {entry.primaryTagId && primaryTags
                  .find(tag => tag.id.toString() === entry.primaryTagId)
                  ?.secondaryTags.map((tag) => (
                    <option key={tag.id} value={tag.id} className="text-gray-900">
                      {tag.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white">
                序列号
              </label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  name={`entries[${entry.id}].serialNumber`}
                  value={entry.serialNumber}
                  onChange={(e) => updateSerialNumber(entry.id, e.target.value)}
                  required
                  placeholder="例如: 1-5,7,9-11"
                  className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                />
                {deviceCounts[entry.id] > 0 && (
                  <span className="absolute right-0 top-0 -mt-6 text-sm text-gray-400">
                    数量: {deviceCounts[entry.id]}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-center">
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
      </div>
    </div>
  );
} 