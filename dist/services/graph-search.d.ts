/**
 * Knowledge Graph Search Service
 *
 * Traverses the knowledge graph to find related tools and dependencies.
 */
import { KnowledgeSource, GraphEntity, GraphRelation } from "./types.js";
export declare class GraphSearchService {
    private graphPath;
    private graph;
    constructor(graphPath?: string);
    private loadGraph;
    /**
     * Expand a tool to find related dependencies
     */
    expand(toolName: string, depth?: number, relationTypes?: string[]): Promise<KnowledgeSource[]>;
    private traverseGraph;
    /**
     * Get all entities in the graph
     */
    getAllEntities(): GraphEntity[];
    /**
     * Get relations from a specific entity
     */
    getRelations(entityName: string): GraphRelation[];
    /**
     * Get a specific entity by name
     */
    getEntity(entityName: string): GraphEntity | undefined;
    /**
     * Get all relations in the graph
     */
    getAllRelations(): GraphRelation[];
    /**
     * Find entity by name
     */
    findEntity(name: string): GraphEntity | undefined;
    private mapType;
}
//# sourceMappingURL=graph-search.d.ts.map