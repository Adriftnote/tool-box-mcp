/**
 * Hybrid Search Service
 *
 * Combines Vector Search (semantic) + Knowledge Graph (relationships)
 * for comprehensive tool discovery.
 */
import { VectorSearchService } from "./vector-search.js";
import { GraphSearchService } from "./graph-search.js";
import { DEFAULT_LIMIT, DEFAULT_GRAPH_DEPTH, AVG_TOKENS_PER_TOOL, FULL_CONTEXT_TOKENS } from "../constants.js";
export class HybridSearchService {
    vectorSearch;
    graphSearch;
    constructor(pythonPath, graphPath) {
        this.vectorSearch = new VectorSearchService(pythonPath);
        this.graphSearch = new GraphSearchService(graphPath);
    }
    /**
     * Search for tools using hybrid approach
     */
    async search(query, limit = DEFAULT_LIMIT, includeGraph = true) {
        // Step 1: Vector search for semantic matches
        const vectorResults = await this.vectorSearch.search(query, Math.min(limit, 5));
        // Step 2: Expand with knowledge graph (if enabled)
        let graphResults = [];
        const seen = new Set(vectorResults.map(r => r.name));
        if (includeGraph) {
            for (const result of vectorResults) {
                const expanded = await this.graphSearch.expand(result.name, DEFAULT_GRAPH_DEPTH);
                for (const dep of expanded) {
                    if (!seen.has(dep.name)) {
                        seen.add(dep.name);
                        graphResults.push(dep);
                    }
                }
            }
        }
        // Step 3: Combine and calculate stats
        const allResults = [...vectorResults, ...graphResults].slice(0, limit);
        const totalCount = allResults.length;
        const tokenEstimate = totalCount * AVG_TOKENS_PER_TOOL;
        const savingsPercent = ((1 - tokenEstimate / FULL_CONTEXT_TOKENS) * 100);
        return {
            results: allResults,
            stats: {
                vectorCount: vectorResults.length,
                graphCount: graphResults.length,
                totalCount,
                tokenEstimate,
                savingsPercent: Math.max(0, savingsPercent)
            }
        };
    }
    /**
     * Get a complete tool cluster for a query
     */
    async getToolCluster(query, includeContext = true) {
        // Get primary tools via vector search
        const primaryResults = await this.vectorSearch.search(query, 3);
        // Expand all primary tools (exclude Skills - they go to relatedSkills instead)
        const dependencies = [];
        const seen = new Set(primaryResults.map(r => r.name));
        for (const primary of primaryResults) {
            const expanded = await this.graphSearch.expand(primary.name, 2);
            for (const dep of expanded) {
                if (!seen.has(dep.name)) {
                    seen.add(dep.name);
                    // Skill은 dependencies에 넣지 않음 (relatedSkills로 별도 관리)
                    if (dep.type !== 'Skill') {
                        dependencies.push(dep);
                    }
                }
            }
        }
        // Find related skills (메타데이터만, 전체 내용 X)
        const relatedSkills = await this.findRelatedSkills(primaryResults, dependencies);
        // Calculate stats
        const totalTools = primaryResults.length + dependencies.length;
        const tokenEstimate = totalTools * AVG_TOKENS_PER_TOOL;
        const savingsPercent = ((1 - tokenEstimate / FULL_CONTEXT_TOKENS) * 100);
        const cluster = {
            primary: primaryResults,
            dependencies,
            relatedSkills: relatedSkills.length > 0 ? relatedSkills : undefined,
            stats: {
                totalTools,
                tokenEstimate,
                savingsPercent: Math.max(0, savingsPercent)
            }
        };
        // Add context if requested
        if (includeContext) {
            cluster.context = this.generateContext(primaryResults, dependencies);
        }
        return cluster;
    }
    /**
     * Expand a specific tool to find dependencies
     */
    async expandTool(toolName, depth = DEFAULT_GRAPH_DEPTH, relationTypes) {
        return this.graphSearch.expand(toolName, depth, relationTypes);
    }
    /**
     * Find related skills using ChromaDB relatedTo field
     * Returns only metadata (summary, when, tokenSize), NOT full content
     */
    async findRelatedSkills(primary, dependencies) {
        // Primary에서만 MCP_Server, Tool 추출 (Dependencies 제외!)
        const toolNames = primary
            .filter(t => t.type !== 'Skill')
            .map(t => t.name);
        if (toolNames.length === 0) {
            return [];
        }
        // ChromaDB에서 relatedTo 필드로 역검색
        try {
            const { execSync } = await import('child_process');
            const toolNamesStr = toolNames.join(',');
            const pythonPath = '/root/.claude-memory/venv/bin/python3';
            const scriptPath = '/root/.claude-memory/search-skills-by-related.py';
            const output = execSync(`${pythonPath} ${scriptPath} "${toolNamesStr}"`, {
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024
            });
            const skills = JSON.parse(output);
            return skills;
        }
        catch (error) {
            console.error('Failed to search related skills:', error);
            return [];
        }
    }
    generateContext(primary, dependencies) {
        const patterns = [];
        const examples = [];
        // Generate usage patterns based on tool types
        const mcpServers = [...primary, ...dependencies].filter(t => t.type === 'MCP_Server');
        const skills = [...primary, ...dependencies].filter(t => t.type === 'Skill');
        if (mcpServers.length > 0) {
            patterns.push(`Use MCP servers (${mcpServers.map(s => s.name).join(', ')}) for data operations`);
        }
        if (skills.length > 0) {
            patterns.push(`Apply skills (${skills.map(s => s.name).join(', ')}) for specialized knowledge`);
        }
        // Generate example based on primary tool
        if (primary.length > 0) {
            const main = primary[0];
            examples.push(`Primary workflow: ${main.name} - ${main.description}`);
        }
        return { usagePatterns: patterns, examples };
    }
}
//# sourceMappingURL=hybrid-search.js.map