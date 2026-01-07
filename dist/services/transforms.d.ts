/**
 * Transform Registry - 쉽게 확장 가능한 데이터 변환 시스템
 *
 * 새 변환 추가 방법:
 * 1. TransformFn 타입에 맞는 함수 작성
 * 2. transformRegistry에 등록
 * 끝!
 */
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
export declare const transformRegistry: Map<string, TransformDefinition>;
/**
 * 새 변환 등록
 */
export declare function registerTransform(def: TransformDefinition): void;
/**
 * 변환 목록 조회
 */
export declare function listTransforms(): Array<{
    name: string;
    description: string;
    example?: string;
}>;
/**
 * 변환 적용 (기존 applyTransform 대체)
 */
export declare function applyTransform(data: any, transformType?: string): TransformResult;
//# sourceMappingURL=transforms.d.ts.map