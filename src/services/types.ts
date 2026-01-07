/**
 * Shared type definitions for search services
 */

export interface McpCliInfo {
  quickStart: string;
  examples: string[];
  tools: Array<{
    name: string;
    description: string;
    params?: string[];
  }>;
}

export interface SkillMeta {
  summary: string;
  when: string;
  tokenSize: number;
  keywords?: string[];
  relatedTo?: string[];
}

export interface RelatedSkill {
  name: string;
  summary: string;
  when: string;
  tokenSize: number;
}

export interface TemplateInstance {
  name: string;       // 실제 MCP 서버 이름 (sqlite_tiktok)
  alias: string;      // 짧은 별칭 (tiktok)
  description: string; // 인스턴스 설명
}

export interface KnowledgeSource {
  name: string;
  type: 'MCP_Server' | 'MCP_Server_Template' | 'Skill' | 'Tool' | 'Command';
  description: string;
  similarity?: number;
  mcpCli?: McpCliInfo;  // mcp-cli 사용법 정보
  skillMeta?: SkillMeta;  // 스킬 메타데이터
  instances?: TemplateInstance[];  // 템플릿 인스턴스 목록
  mcpCliPattern?: string;  // 템플릿용 CLI 패턴
  metadata?: Record<string, unknown>;
}

export interface GraphEntity {
  name: string;
  type?: string;
  entityType?: string;  // Knowledge Graph uses entityType
  description?: string;
  observations?: string[];  // Knowledge Graph uses observations array
  capabilities?: string[];
}

export interface GraphRelation {
  from: string;
  to: string;
  type: string;
}

export interface KnowledgeGraph {
  version: string;
  created: string;
  entities: GraphEntity[];
  relations: GraphRelation[];
}

export interface SearchResult {
  results: KnowledgeSource[];
  stats: {
    vectorCount: number;
    graphCount: number;
    totalCount: number;
    tokenEstimate: number;
    savingsPercent: number;
  };
}

export interface ToolCluster {
  [key: string]: unknown;  // Index signature for MCP SDK compatibility
  primary: KnowledgeSource[];
  dependencies: KnowledgeSource[];
  relatedSkills?: RelatedSkill[];  // 관련 스킬 (메타데이터만)
  context?: {
    usagePatterns: string[];
    examples: string[];
  };
  stats: {
    totalTools: number;
    tokenEstimate: number;
    savingsPercent: number;
  };
}
