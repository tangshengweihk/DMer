/**
 * 解析序列号字符串，支持以下格式：
 * 1. 单个序列号: "1"
 * 2. 连续序列号: "1-5"
 * 3. 逗号分隔: "1,2,3" 或 "1，2，3"
 * 4. 混合格式: "1-3,5,7-9"
 */
export function parseSerialNumbers(input: string): string[] {
  // 统一处理中英文逗号
  const normalized = input.replace(/，/g, ',').trim();
  
  // 分割逗号分隔的部分
  const parts = normalized.split(',').filter(part => part.trim());
  
  const result: string[] = [];
  
  for (const part of parts) {
    const trimmed = part.trim();
    
    // 处理连续序列号 (例如: "1-5")
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(num => parseInt(num.trim()));
      
      // 验证起始和结束数字
      if (isNaN(start) || isNaN(end)) {
        throw new Error(`无效的序列号范围: ${trimmed}`);
      }
      
      if (start > end) {
        throw new Error(`无效的序列号范围: ${start} 大于 ${end}`);
      }
      
      // 生成连续序列号
      for (let i = start; i <= end; i++) {
        result.push(i.toString());
      }
    } 
    // 处理单个序列号
    else {
      const num = parseInt(trimmed);
      if (isNaN(num)) {
        throw new Error(`无效的序列号: ${trimmed}`);
      }
      result.push(num.toString());
    }
  }
  
  // 去重并排序
  return [...new Set(result)].sort((a, b) => parseInt(a) - parseInt(b));
}

/**
 * 验证序列号格式
 */
export function validateSerialNumberFormat(input: string): boolean {
  try {
    parseSerialNumbers(input);
    return true;
  } catch {
    return false;
  }
} 