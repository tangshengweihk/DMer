/**
 * 客户端简单计算序列号数量
 */
export function countSerialNumbers(input: string): number {
  if (!input.trim()) return 0;
  
  const normalized = input.replace(/，/g, ',').trim();
  let count = 0;
  
  const parts = normalized.split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0);
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(num => parseInt(num.trim()));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        count += end - start + 1;
      }
    } else {
      const num = parseInt(part);
      if (!isNaN(num)) {
        count += 1;
      }
    }
  }
  
  return count;
} 