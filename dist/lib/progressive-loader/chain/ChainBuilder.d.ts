/**
 * ChainBuilder - Build execution chains from Knowledge Graph relationships
 *
 * Uses relationship types to determine execution order:
 * - REQUIRES: Dependencies that must run first
 * - OUTPUTS_TO: Data flow direction (A → B)
 * - WORKS_WITH: Parallel execution candidates
 * - BENEFITS_FROM: Optional enhancements
 * - EXECUTABLE_VIA: Execution method
 */
import { ChainStep } from './types.js';
import { KnowledgeSource, Relation, Entity } from '../types.js';
/**
 * Knowledge Graph structure
 */
interface KnowledgeGraph {
    metadata: {
        created: string;
        description: string;
        version: string;
    };
    entities: Entity[];
    relations: Relation[];
    usage_patterns?: UsagePattern[];
}
interface UsagePattern {
    task: string;
    required_tools: string[];
    workflow: string[];
}
/**
 * Chain building options
 */
export interface ChainBuilderOptions {
    /** Path to knowledge graph JSON file */
    graphPath?: string;
    /** Include BENEFITS_FROM relations (optional tools) */
    includeOptional?: boolean;
}
/**
 * Built chain with metadata
 */
export interface BuiltChain {
    steps: ChainStep[];
    /** Tools in execution order */
    executionOrder: string[];
    /** Detected data flow */
    dataFlow: Array<{
        from: string;
        to: string;
    }>;
    /** Matched usage pattern if any */
    matchedPattern?: UsagePattern;
    /** Argument hints for Claude to fill */
    toolHints?: Record<string, Record<string, string>>;
}
/**
 * ChainBuilder creates execution chains from tool clusters using Knowledge Graph
 */
export declare class ChainBuilder {
    private graph;
    private options;
    constructor(options?: ChainBuilderOptions);
    /**
     * Load knowledge graph from file
     */
    loadGraph(path?: string): void;
    /**
     * Set knowledge graph directly (for testing)
     */
    setGraph(graph: KnowledgeGraph): void;
    /**
     * Build chain from tool cluster
     */
    buildChain(tools: KnowledgeSource[]): BuiltChain;
    /**
     * Extract relations involving the given tools
     */
    private extractRelations;
    /**
     * Topological sort based on REQUIRES and OUTPUTS_TO relations
     */
    private topologicalSort;
    /**
     * Extract data flow from OUTPUTS_TO relations
     */
    private extractDataFlow;
    /**
     * Find matching usage pattern
     */
    private findMatchingPattern;
    /**
     * Build chain steps from execution order
     */
    private buildSteps;
    /**
     * Format tool name for chain execution
     */
    private formatToolName;
    /**
     * Build tool arguments placeholder - Claude should fill actual values
     */
    private buildToolArgs;
    /**
     * Get argument hints for a tool type
     */
    getToolArgHints(toolName: string): Record<string, string>;
    /**
     * Get entity info from knowledge graph
     */
    getEntity(name: string): Entity | undefined;
    /**
     * Get relations for a tool
     */
    getRelations(toolName: string): Relation[];
    /**
     * Suggest chain for a task description
     */
    suggestChain(taskDescription: string): BuiltChain | null;
}
export default ChainBuilder;
//# sourceMappingURL=ChainBuilder.d.ts.map