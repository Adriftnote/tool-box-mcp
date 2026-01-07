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
    name: string;
    alias: string;
    description: string;
}
export interface KnowledgeSource {
    name: string;
    type: 'MCP_Server' | 'MCP_Server_Template' | 'Skill' | 'Tool' | 'Command';
    description: string;
    similarity?: number;
    mcpCli?: McpCliInfo;
    skillMeta?: SkillMeta;
    instances?: TemplateInstance[];
    mcpCliPattern?: string;
    metadata?: Record<string, unknown>;
}
export interface GraphEntity {
    name: string;
    type?: string;
    entityType?: string;
    description?: string;
    observations?: string[];
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
    [key: string]: unknown;
    primary: KnowledgeSource[];
    dependencies: KnowledgeSource[];
    relatedSkills?: RelatedSkill[];
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
//# sourceMappingURL=types.d.ts.map