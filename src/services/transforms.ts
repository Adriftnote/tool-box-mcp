/**
 * Transform Registry - 쉽게 확장 가능한 데이터 변환 시스템
 *
 * 새 변환 추가 방법:
 * 1. TransformFn 타입에 맞는 함수 작성
 * 2. transformRegistry에 등록
 * 끝!
 */

// =============================================================================
// Types
// =============================================================================

export interface TransformResult {
  transformed: any;
  needsAI: boolean;
  hint?: string;
}

export type TransformFn = (data: any) => TransformResult;

export interface TransformDefinition {
  name: string;
  description: string;
  example?: string;
  fn: TransformFn;
}

// =============================================================================
// Helper Functions
// =============================================================================

function parseIfString(data: any): any {
  return typeof data === 'string' ? JSON.parse(data) : data;
}

function success(transformed: any): TransformResult {
  return { transformed, needsAI: false };
}

function needsAI(data: any, hint: string): TransformResult {
  return { transformed: data, needsAI: true, hint };
}

// =============================================================================
// Transform Registry
// =============================================================================

export const transformRegistry: Map<string, TransformDefinition> = new Map();

/**
 * 새 변환 등록
 */
export function registerTransform(def: TransformDefinition): void {
  transformRegistry.set(def.name, def);
}

/**
 * 변환 목록 조회
 */
export function listTransforms(): Array<{ name: string; description: string; example?: string }> {
  return Array.from(transformRegistry.values()).map(({ name, description, example }) => ({
    name,
    description,
    example
  }));
}

// =============================================================================
// Built-in Transforms
// =============================================================================

// sqlite→2d: SQLite 결과를 2D 배열로 변환
registerTransform({
  name: 'sqlite→2d',
  description: 'Convert [{col:val},...] to [[headers],[row1],[row2],...]',
  example: '[{"a":1,"b":2}] → [["a","b"],[1,2]]',
  fn: (data) => {
    const arr = parseIfString(data);
    if (!Array.isArray(arr) || arr.length === 0) {
      return success(data);
    }
    const headers = Object.keys(arr[0]);
    const rows = arr.map((row: Record<string, any>) => headers.map(h => row[h]));
    return success([headers, ...rows]);
  }
});

// json→object: JSON 문자열을 객체로 파싱
registerTransform({
  name: 'json→object',
  description: 'Parse JSON string to object',
  example: '"{\"a\":1}" → {a:1}',
  fn: (data) => success(parseIfString(data))
});

// object→array: 객체를 배열로 변환
registerTransform({
  name: 'object→array',
  description: 'Convert object to array using Object.values()',
  example: '{a:1,b:2} → [1,2]',
  fn: (data) => {
    const obj = parseIfString(data);
    return success(Object.values(obj));
  }
});

// flatten: 중첩 배열 평탄화
registerTransform({
  name: 'flatten',
  description: 'Flatten nested arrays one level',
  example: '[[1,2],[3,4]] → [1,2,3,4]',
  fn: (data) => {
    const arr = parseIfString(data);
    if (Array.isArray(arr)) {
      return success(arr.flat());
    }
    return success(data);
  }
});

// pick: 특정 필드만 추출 (동적 파라미터)
registerTransform({
  name: 'pick',
  description: 'Pick specific fields from objects. Use pick:field1,field2',
  example: '[{a:1,b:2,c:3}] with pick:a,c → [{a:1,c:3}]',
  fn: (data) => {
    // 기본 동작: 첫 번째 필드만
    const arr = parseIfString(data);
    if (!Array.isArray(arr) || arr.length === 0) return success(data);
    const firstKey = Object.keys(arr[0])[0];
    return success(arr.map((item: any) => item[firstKey]));
  }
});

// 2d→csv: 2D 배열을 CSV 문자열로 변환
registerTransform({
  name: '2d→csv',
  description: 'Convert 2D array to CSV string',
  example: '[["a","b"],[1,2]] → "a,b\\n1,2"',
  fn: (data) => {
    const arr = parseIfString(data);
    if (!Array.isArray(arr)) return success(data);
    const csv = arr.map((row: any[]) =>
      row.map(cell => {
        const str = String(cell ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ).join('\n');
    return success(csv);
  }
});

// csv→2d: CSV 문자열을 2D 배열로 변환
registerTransform({
  name: 'csv→2d',
  description: 'Parse CSV string to 2D array',
  example: '"a,b\\n1,2" → [["a","b"],["1","2"]]',
  fn: (data) => {
    const str = String(data);
    const rows = str.split('\n').map(line => {
      const cells: string[] = [];
      let current = '';
      let inQuotes = false;

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current);
      return cells;
    });
    return success(rows);
  }
});

// keys: 객체에서 키만 추출
registerTransform({
  name: 'keys',
  description: 'Extract keys from object',
  example: '{a:1,b:2} → ["a","b"]',
  fn: (data) => {
    const obj = parseIfString(data);
    return success(Object.keys(obj));
  }
});

// values: 객체에서 값만 추출
registerTransform({
  name: 'values',
  description: 'Extract values from object',
  example: '{a:1,b:2} → [1,2]',
  fn: (data) => {
    const obj = parseIfString(data);
    return success(Object.values(obj));
  }
});

// first: 배열의 첫 번째 요소
registerTransform({
  name: 'first',
  description: 'Get first element of array',
  example: '[1,2,3] → 1',
  fn: (data) => {
    const arr = parseIfString(data);
    return success(Array.isArray(arr) ? arr[0] : data);
  }
});

// last: 배열의 마지막 요소
registerTransform({
  name: 'last',
  description: 'Get last element of array',
  example: '[1,2,3] → 3',
  fn: (data) => {
    const arr = parseIfString(data);
    return success(Array.isArray(arr) ? arr[arr.length - 1] : data);
  }
});

// count: 배열 길이
registerTransform({
  name: 'count',
  description: 'Get array length',
  example: '[1,2,3] → 3',
  fn: (data) => {
    const arr = parseIfString(data);
    return success(Array.isArray(arr) ? arr.length : 1);
  }
});

// stringify: JSON 문자열로 변환
registerTransform({
  name: 'stringify',
  description: 'Convert to JSON string',
  example: '{a:1} → "{\\"a\\":1}"',
  fn: (data) => success(JSON.stringify(data))
});

// wrap-array: 단일 값을 배열로 감싸기
registerTransform({
  name: 'wrap-array',
  description: 'Wrap value in array',
  example: '1 → [1]',
  fn: (data) => success(Array.isArray(data) ? data : [data])
});

// unwrap: 단일 요소 배열에서 값 추출
registerTransform({
  name: 'unwrap',
  description: 'Unwrap single-element array',
  example: '[1] → 1',
  fn: (data) => {
    const arr = parseIfString(data);
    return success(Array.isArray(arr) && arr.length === 1 ? arr[0] : data);
  }
});

// =============================================================================
// Main Transform Function
// =============================================================================

/**
 * 변환 적용 (기존 applyTransform 대체)
 */
export function applyTransform(data: any, transformType?: string): TransformResult {
  if (!transformType || transformType === 'none') {
    return success(data);
  }

  // AI 변환 요청
  if (transformType === '<TRANSFORM_BY_CLAUDE>') {
    return needsAI(data, `Data needs transformation. Current format: ${JSON.stringify(data).slice(0, 200)}...`);
  }

  // 동적 파라미터 처리 (예: pick:field1,field2)
  const [baseName, ...params] = transformType.split(':');

  const def = transformRegistry.get(baseName);
  if (!def) {
    console.warn(`Unknown transform type: ${transformType}`);
    return success(data);
  }

  try {
    // 파라미터가 있는 경우 특수 처리
    if (params.length > 0 && baseName === 'pick') {
      const fields = params.join(':').split(',');
      const arr = parseIfString(data);
      if (!Array.isArray(arr)) return success(data);
      return success(arr.map((item: any) => {
        const picked: Record<string, any> = {};
        fields.forEach(f => { if (f in item) picked[f] = item[f]; });
        return picked;
      }));
    }

    return def.fn(data);
  } catch (error) {
    console.warn(`Transform ${transformType} failed:`, error);
    return needsAI(data, `Transform '${transformType}' failed. Please handle manually.`);
  }
}
