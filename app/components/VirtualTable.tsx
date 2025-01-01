import { useVirtualizer, VirtualItem } from "@tanstack/react-virtual";
import { useRef } from "react";

interface VirtualTableProps<T> {
  data: T[];
  rowHeight: number;
  renderRow: (item: T) => React.ReactNode;
  renderHeader: () => React.ReactNode;
}

export function VirtualTable<T>({
  data,
  rowHeight,
  renderRow,
  renderHeader,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <table className="min-w-full divide-y divide-gray-700">
        {renderHeader()}
        <tbody
          className="divide-y divide-gray-800"
          style={{ height: `${totalSize}px`, position: "relative" }}
        >
          {virtualItems.map((virtualRow: VirtualItem) => (
            <tr
              key={virtualRow.key}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
              }}
            >
              {renderRow(data[virtualRow.index])}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 