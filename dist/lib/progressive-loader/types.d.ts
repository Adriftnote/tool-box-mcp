/**
 * Progressive Disclosure Types
 */
export interface KnowledgeSource {
    name: string;
    type: 'MCP_Server' | 'MCP_Server_Template' | 'Skill' | 'Tool' | 'Command';
    description: string;
    similarity?: number;
    metadata?: {
        source?: string;
        id?: number;
        [key: string]: any;
    };
}
export interface SearchStrategy {
    search(query: string, limit?: number): Promise<KnowledgeSource[]>;
}
export interface ProgressiveLoaderConfig {
    chromaPath?: string;
    knowledgeGraphPath?: string;
    maxDepth?: number;
    topK?: number;
}
export interface Relation {
    from: string;
    to: string;
    relationType: 'REQUIRES' | 'WORKS_WITH' | 'EXECUTABLE_VIA' | 'OUTPUTS_TO' | 'BENEFITS_FROM';
}
export interface Entity {
    name: string;
    entityType: string;
    observations: string[];
}
//# sourceMappingURL=types.d.ts.map