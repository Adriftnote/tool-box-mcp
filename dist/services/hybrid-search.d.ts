/**
 * Hybrid Search Service
 *
 * Combines Vector Search (semantic) + Knowledge Graph (relationships)
 * for comprehensive tool discovery.
 */
import { KnowledgeSource, SearchResult, ToolCluster } from "./types.js";
export declare class HybridSearchService {
    private vectorSearch;
    private graphSearch;
    constructor(pythonPath?: string, graphPath?: string);
    /**
     * Search for tools using hybrid approach
     */
    search(query: string, limit?: number, includeGraph?: boolean): Promise<SearchResult>;
    /**
     * Get a complete tool cluster for a query
     */
    getToolCluster(query: string, includeContext?: boolean): Promise<ToolCluster>;
    /**
     * Expand a specific tool to find dependencies
     */
    expandTool(toolName: string, depth?: number, relationTypes?: string[]): Promise<KnowledgeSource[]>;
    /**
     * Find related skills using ChromaDB relatedTo field
     * Returns only metadata (summary, when, tokenSize), NOT full content
     */
    private findRelatedSkills;
    private generateContext;
}
//# sourceMappingURL=hybrid-search.d.ts.map