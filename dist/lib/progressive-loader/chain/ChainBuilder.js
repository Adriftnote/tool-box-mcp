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
import * as fs from 'fs';
/**
 * ChainBuilder creates execution chains from tool clusters using Knowledge Graph
 */
export class ChainBuilder {
    graph = null;
    options;
    constructor(options = {}) {
        this.options = {
            includeOptional: false,
            ...options
        };
    }
    /**
     * Load knowledge graph from file
     */
    loadGraph(path) {
        const graphPath = path || this.options.graphPath;
        if (!graphPath) {
            throw new Error('Knowledge graph path not specified');
        }
        try {
            const content = fs.readFileSync(graphPath, 'utf-8');
            this.graph = JSON.parse(content);
        }
        catch (error) {
            throw new Error(`Failed to load knowledge graph: ${error.message}`);
        }
    }
    /**
     * Set knowledge graph directly (for testing)
     */
    setGraph(graph) {
        this.graph = graph;
    }
    /**
     * Build chain from tool cluster
     */
    buildChain(tools) {
        if (!this.graph) {
            this.loadGraph();
        }
        const toolNames = tools.map(t => t.name);
        // Extract relevant relations
        const relations = this.extractRelations(toolNames);
        // Build execution order using topological sort
        const executionOrder = this.topologicalSort(toolNames, relations);
        // Detect data flow
        const dataFlow = this.extractDataFlow(relations);
        // Find matching usage pattern
        const matchedPattern = this.findMatchingPattern(toolNames);
        // Build chain steps
        const steps = this.buildSteps(executionOrder, relations, tools);
        // Build tool hints for Claude
        const toolHints = {};
        for (const step of steps) {
            toolHints[step.toolName] = this.getToolArgHints(step.toolName);
        }
        return {
            steps,
            executionOrder,
            dataFlow,
            matchedPattern,
            toolHints
        };
    }
    /**
     * Extract relations involving the given tools
     */
    extractRelations(toolNames) {
        if (!this.graph)
            return [];
        const toolSet = new Set(toolNames);
        return this.graph.relations.filter(rel => {
            const fromIncluded = toolSet.has(rel.from);
            const toIncluded = toolSet.has(rel.to);
            // Include relation if both endpoints are in our tool set
            if (fromIncluded && toIncluded) {
                // Optionally filter out BENEFITS_FROM
                if (!this.options.includeOptional && rel.relationType === 'BENEFITS_FROM') {
                    return false;
                }
                return true;
            }
            return false;
        });
    }
    /**
     * Topological sort based on REQUIRES and OUTPUTS_TO relations
     */
    topologicalSort(toolNames, relations) {
        const inDegree = new Map();
        const adjList = new Map();
        // Initialize
        for (const name of toolNames) {
            inDegree.set(name, 0);
            adjList.set(name, []);
        }
        // Build graph from REQUIRES and OUTPUTS_TO relations
        // REQUIRES: A requires B means B should run before A
        // OUTPUTS_TO: A outputs to B means A should run before B
        for (const rel of relations) {
            if (rel.relationType === 'REQUIRES') {
                // B (to) should come before A (from)
                const deps = adjList.get(rel.to) || [];
                deps.push(rel.from);
                adjList.set(rel.to, deps);
                inDegree.set(rel.from, (inDegree.get(rel.from) || 0) + 1);
            }
            else if (rel.relationType === 'OUTPUTS_TO') {
                // A (from) should come before B (to)
                const deps = adjList.get(rel.from) || [];
                deps.push(rel.to);
                adjList.set(rel.from, deps);
                inDegree.set(rel.to, (inDegree.get(rel.to) || 0) + 1);
            }
        }
        // Kahn's algorithm
        const queue = [];
        const result = [];
        // Start with nodes that have no dependencies
        for (const [name, degree] of inDegree) {
            if (degree === 0) {
                queue.push(name);
            }
        }
        while (queue.length > 0) {
            const node = queue.shift();
            result.push(node);
            for (const neighbor of adjList.get(node) || []) {
                const newDegree = (inDegree.get(neighbor) || 1) - 1;
                inDegree.set(neighbor, newDegree);
                if (newDegree === 0) {
                    queue.push(neighbor);
                }
            }
        }
        // Add any remaining tools (no explicit order)
        for (const name of toolNames) {
            if (!result.includes(name)) {
                result.push(name);
            }
        }
        return result;
    }
    /**
     * Extract data flow from OUTPUTS_TO relations
     */
    extractDataFlow(relations) {
        return relations
            .filter(rel => rel.relationType === 'OUTPUTS_TO')
            .map(rel => ({ from: rel.from, to: rel.to }));
    }
    /**
     * Find matching usage pattern
     */
    findMatchingPattern(toolNames) {
        if (!this.graph?.usage_patterns)
            return undefined;
        const toolSet = new Set(toolNames);
        // Find pattern where all required tools are present
        for (const pattern of this.graph.usage_patterns) {
            const requiredSet = new Set(pattern.required_tools);
            const intersection = [...requiredSet].filter(t => toolSet.has(t));
            // Match if we have at least 70% of required tools
            if (intersection.length >= requiredSet.size * 0.7) {
                return pattern;
            }
        }
        return undefined;
    }
    /**
     * Build chain steps from execution order
     */
    buildSteps(executionOrder, relations, tools) {
        const steps = [];
        const toolMap = new Map(tools.map(t => [t.name, t]));
        // Find OUTPUTS_TO relations for chaining
        const outputsTo = new Map();
        for (const rel of relations) {
            if (rel.relationType === 'OUTPUTS_TO') {
                const targets = outputsTo.get(rel.from) || [];
                targets.push(rel.to);
                outputsTo.set(rel.from, targets);
            }
        }
        // Filter to only MCP_Server types (executable tools)
        const executableTools = executionOrder.filter(name => {
            const tool = toolMap.get(name);
            return tool?.type === 'MCP_Server';
        });
        for (let i = 0; i < executableTools.length; i++) {
            const toolName = executableTools[i];
            const tool = toolMap.get(toolName);
            if (!tool)
                continue;
            // Build step
            const step = {
                toolName: this.formatToolName(toolName),
                toolArgs: this.buildToolArgs(toolName, i === 0)
            };
            // Add inputPath if this tool receives data from previous
            if (i > 0) {
                const prevTool = executableTools[i - 1];
                const hasDataFlow = outputsTo.get(prevTool)?.includes(toolName);
                if (hasDataFlow) {
                    step.inputPath = '$.data'; // Default input path
                }
            }
            // Add outputPath if this tool outputs to next
            if (i < executableTools.length - 1) {
                const nextTool = executableTools[i + 1];
                const hasDataFlow = outputsTo.get(toolName)?.includes(nextTool);
                if (hasDataFlow) {
                    step.outputPath = '$.result'; // Default output path
                }
            }
            steps.push(step);
        }
        return steps;
    }
    /**
     * Format tool name for chain execution
     */
    formatToolName(name) {
        // Convert to underscore format for MCP
        return name.replace(/-/g, '_');
    }
    /**
     * Build tool arguments placeholder - Claude should fill actual values
     */
    buildToolArgs(toolName, isFirst) {
        // For subsequent steps, use CHAIN_RESULT placeholder
        if (!isFirst) {
            return JSON.stringify({ data: "CHAIN_RESULT" });
        }
        // First step: provide empty placeholder for Claude to fill
        return "<FILL_BY_CLAUDE>";
    }
    /**
     * Get argument hints for a tool type
     */
    getToolArgHints(toolName) {
        const name = toolName.toLowerCase();
        if (name.includes('sqlite') && name.includes('read')) {
            return {
                query: "SQL SELECT statement",
                example: '{"query": "SELECT * FROM table_name LIMIT 10"}'
            };
        }
        if (name.includes('sqlite') && name.includes('write')) {
            return {
                query: "SQL INSERT/UPDATE statement",
                example: '{"query": "INSERT INTO table_name VALUES (...)"}'
            };
        }
        if (name.includes('excel') || name.includes('document')) {
            return {
                data: "Data from previous step (CHAIN_RESULT)",
                path: "Output file path",
                example: '{"data": "CHAIN_RESULT", "path": "/output/report.xlsx"}'
            };
        }
        if (name.includes('n8n')) {
            return {
                workflow_data: "Workflow configuration",
                example: '{"name": "workflow_name", "nodes": [...]}'
            };
        }
        return { note: "Check tool documentation for required parameters" };
    }
    /**
     * Get entity info from knowledge graph
     */
    getEntity(name) {
        return this.graph?.entities.find(e => e.name === name);
    }
    /**
     * Get relations for a tool
     */
    getRelations(toolName) {
        if (!this.graph)
            return [];
        return this.graph.relations.filter(rel => rel.from === toolName || rel.to === toolName);
    }
    /**
     * Suggest chain for a task description
     */
    suggestChain(taskDescription) {
        if (!this.graph?.usage_patterns)
            return null;
        // Simple keyword matching
        const keywords = taskDescription.toLowerCase().split(/\s+/);
        for (const pattern of this.graph.usage_patterns) {
            const patternKeywords = pattern.task.toLowerCase().split(/\s+/);
            const matches = keywords.filter(k => patternKeywords.some(pk => pk.includes(k) || k.includes(pk)));
            if (matches.length >= 2) {
                // Convert to KnowledgeSource format
                const tools = pattern.required_tools.map(name => {
                    const entity = this.getEntity(name);
                    return {
                        name,
                        type: entity?.entityType || 'Tool',
                        description: entity?.observations[0] || ''
                    };
                });
                return this.buildChain(tools);
            }
        }
        return null;
    }
}
export default ChainBuilder;
//# sourceMappingURL=ChainBuilder.js.map