#!/usr/bin/env node
/**
 * Tool Hub MCP Server
 *
 * Central registry for all AI tools - MCP servers, skills, and commands.
 * Uses Vector Search + Knowledge Graph for intelligent tool discovery.
 *
 * Tools:
 * - toolhub_search: Semantic search for relevant tools
 * - toolhub_expand: Expand tool dependencies via Knowledge Graph
 * - toolhub_cluster: Get complete tool cluster for a task
 * - toolhub_register: Register new tools
 * - toolhub_delete: Delete tools
 * - toolhub_list: List all registered tools
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { HybridSearchService } from "./services/hybrid-search.js";
import { SearchToolsInputSchema, ExpandGraphInputSchema, GetToolClusterInputSchema, RegisterToolInputSchema, DeleteToolInputSchema, ListToolsInputSchema, ExecuteChainInputSchema, PrepareChainInputSchema, ToolhubChainInputSchema, EmptyInputSchema, ResponseFormat } from "./schemas/input.js";
import { ChainBuilder, ChainExecutor } from "./lib/progressive-loader/index.js";
import { execSync } from "child_process";
import { CHARACTER_LIMIT } from "./constants.js";
import { ToolDiscoveryService, executeChain } from "./services/tool-discovery.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
// Path configuration (use env vars or project-relative defaults)
const PATHS = {
    knowledgeGraph: process.env.TOOLHUB_GRAPH_PATH || resolve(PROJECT_ROOT, 'data', 'knowledge-graph.json'),
    mcpChainerConfig: process.env.TOOLHUB_MCP_CONFIG || resolve(PROJECT_ROOT, 'data', 'mcp-config.json'),
    registerScript: process.env.TOOLHUB_REGISTER_SCRIPT || resolve(PROJECT_ROOT, 'scripts', 'register-tool.py'),
    pythonPath: process.env.TOOLHUB_PYTHON_PATH || 'python3'
};
// Initialize services
const hybridSearch = new HybridSearchService();
const chainBuilder = new ChainBuilder({
    graphPath: PATHS.knowledgeGraph,
    includeOptional: false
});
const chainExecutor = new ChainExecutor({
    trace: false,
    stepTimeout: 60000
});
// Tool Discovery Service for chain execution
const discoveryService = new ToolDiscoveryService(PATHS.mcpChainerConfig);
let discoveryInitialized = false;
// Lazy initialization of discovery service
async function ensureDiscoveryInitialized() {
    if (!discoveryInitialized) {
        try {
            await discoveryService.discoverTools();
            discoveryInitialized = true;
            console.error(`Tool discovery completed: ${discoveryService.getTools().length} tools found`);
        }
        catch (error) {
            console.error("Tool discovery failed:", error);
            throw error;
        }
    }
}
// Create MCP server
const server = new McpServer({
    name: "tool-hub",
    version: "1.0.0"
});
// =============================================================================
// Tool 1: toolhub_search
// =============================================================================
server.registerTool("toolhub_search", {
    title: "Search Tools",
    description: `Search for relevant tools using Vector Search + Knowledge Graph.

This tool finds the most relevant MCP servers, skills, and tools for a given query.
It uses semantic similarity (ChromaDB) to find matches and optionally expands
results using the Knowledge Graph to include dependencies.

Args:
  - query (string): Natural language query (e.g., "n8n workflow automation")
  - limit (number): Maximum tools to return (default: 10, max: 50)
  - include_graph (boolean): Expand with Knowledge Graph (default: true)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  JSON format:
  {
    "results": [
      {
        "name": "n8n-workflow-builder",
        "type": "MCP_Server",
        "description": "Create and manage n8n workflows",
        "similarity": 0.89
      }
    ],
    "stats": {
      "vectorCount": 3,
      "graphCount": 4,
      "totalCount": 7,
      "tokenEstimate": 7000,
      "savingsPercent": 92.1
    }
  }

Examples:
  - "n8n 워크플로우 자동화" → n8n-workflow-builder, n8n-node-templates, ...
  - "TikTok 데이터 분석" → sqlite_tiktok_analytics, pandas-excel, ...
  - "Excel 리포트 생성" → pandas-excel, 데이터-구조-파악, ...

Use this tool when you need to find which tools are relevant for a task.`,
    inputSchema: SearchToolsInputSchema,
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
    }
}, async (params) => {
    try {
        const result = await hybridSearch.search(params.query, params.limit, params.include_graph);
        const output = {
            results: result.results,
            stats: result.stats
        };
        let textContent;
        if (params.response_format === ResponseFormat.MARKDOWN) {
            textContent = formatSearchResultsMarkdown(result);
        }
        else {
            textContent = JSON.stringify(output, null, 2);
        }
        // Truncate if needed
        if (textContent.length > CHARACTER_LIMIT) {
            const truncated = {
                ...output,
                results: output.results.slice(0, Math.ceil(output.results.length / 2)),
                truncated: true,
                message: `Response truncated. Use smaller 'limit' or more specific query.`
            };
            textContent = JSON.stringify(truncated, null, 2);
        }
        return {
            content: [{ type: "text", text: textContent }],
            structuredContent: output
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{
                    type: "text",
                    text: `Error searching tools: ${error instanceof Error ? error.message : String(error)}`
                }]
        };
    }
});
// =============================================================================
// Tool 2: toolhub_expand
// =============================================================================
server.registerTool("toolhub_expand", {
    title: "Expand Tool Graph",
    description: `Expand a tool to find its dependencies via Knowledge Graph.

Given a tool name, traverse the Knowledge Graph to find related tools,
requirements, and dependencies. Useful for understanding what other tools
are needed to complete a task.

Args:
  - tool_name (string): Name of the tool to expand (e.g., 'n8n-workflow-builder')
  - depth (number): Traversal depth (default: 2, max: 4)
  - relation_types (string[]): Filter by relation types (optional)
  - response_format ('json' | 'markdown'): Output format

Relation types:
  - REQUIRES: Tool A requires Tool B to function
  - WORKS_WITH: Tools that commonly work together
  - EXECUTABLE_VIA: Tool can be executed via another tool
  - OUTPUTS_TO: Tool outputs data to another tool
  - BENEFITS_FROM: Tool benefits from using another tool

Returns:
  {
    "tool": "n8n-workflow-builder",
    "dependencies": [
      {
        "name": "n8n-node-templates",
        "type": "Skill",
        "relation": "BENEFITS_FROM"
      }
    ],
    "totalCount": 4
  }

Use this tool when you know a primary tool and need to find related tools.`,
    inputSchema: ExpandGraphInputSchema,
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
    }
}, async (params) => {
    try {
        const dependencies = await hybridSearch.expandTool(params.tool_name, params.depth, params.relation_types);
        const output = {
            tool: params.tool_name,
            dependencies: dependencies.map(d => ({
                name: d.name,
                type: d.type,
                description: d.description,
                relation: d.metadata?.relationType || 'RELATED'
            })),
            totalCount: dependencies.length
        };
        let textContent;
        if (params.response_format === ResponseFormat.MARKDOWN) {
            textContent = formatExpandResultMarkdown(params.tool_name, dependencies);
        }
        else {
            textContent = JSON.stringify(output, null, 2);
        }
        return {
            content: [{ type: "text", text: textContent }],
            structuredContent: output
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{
                    type: "text",
                    text: `Error expanding graph: ${error instanceof Error ? error.message : String(error)}`
                }]
        };
    }
});
// =============================================================================
// Tool 3: toolhub_cluster
// =============================================================================
server.registerTool("toolhub_cluster", {
    title: "Get Tool Cluster",
    description: `Get a complete tool cluster for a task query.

This combines vector search and graph expansion to return a complete set
of tools needed for a task. Includes primary tools (semantic matches) and
their dependencies (graph expansion), plus usage context.

Args:
  - query (string): Natural language task description
  - include_context (boolean): Include usage patterns and examples (default: true)
  - response_format ('json' | 'markdown'): Output format

Returns:
  {
    "primary": [
      { "name": "n8n-workflow-builder", "type": "MCP_Server", ... }
    ],
    "dependencies": [
      { "name": "n8n-node-templates", "type": "Skill", ... }
    ],
    "context": {
      "usagePatterns": ["Use MCP servers for data operations", ...],
      "examples": ["Primary workflow: n8n-workflow-builder - ...", ...]
    },
    "stats": {
      "totalTools": 7,
      "tokenEstimate": 7000,
      "savingsPercent": 92.1
    }
  }

Use this tool for complete task setup - returns everything needed to start working.`,
    inputSchema: GetToolClusterInputSchema,
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
    }
}, async (params) => {
    try {
        const cluster = await hybridSearch.getToolCluster(params.query, params.include_context);
        let textContent;
        if (params.response_format === ResponseFormat.MARKDOWN) {
            textContent = formatClusterMarkdown(cluster);
        }
        else {
            textContent = JSON.stringify(cluster, null, 2);
        }
        return {
            content: [{ type: "text", text: textContent }],
            structuredContent: cluster
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{
                    type: "text",
                    text: `Error getting tool cluster: ${error instanceof Error ? error.message : String(error)}`
                }]
        };
    }
});
// =============================================================================
// Formatting Helpers
// =============================================================================
function formatSearchResultsMarkdown(result) {
    const lines = [
        `# Search Results`,
        '',
        `**Stats**: ${result.stats.totalCount} tools found (${result.stats.savingsPercent.toFixed(1)}% token savings)`,
        `- Vector matches: ${result.stats.vectorCount}`,
        `- Graph expansions: ${result.stats.graphCount}`,
        `- Estimated tokens: ${result.stats.tokenEstimate.toLocaleString()}`,
        ''
    ];
    for (const tool of result.results) {
        const similarity = tool.similarity ? ` (${(tool.similarity * 100).toFixed(0)}%)` : '';
        lines.push(`## ${tool.name}${similarity}`);
        lines.push(`- **Type**: ${tool.type}`);
        lines.push(`- **Description**: ${tool.description}`);
        lines.push('');
    }
    return lines.join('\n');
}
function formatExpandResultMarkdown(toolName, dependencies) {
    const lines = [
        `# Dependencies for ${toolName}`,
        '',
        `Found ${dependencies.length} related tools:`,
        ''
    ];
    for (const dep of dependencies) {
        const relation = dep.metadata?.relationType || 'RELATED';
        lines.push(`## ${dep.name}`);
        lines.push(`- **Type**: ${dep.type}`);
        lines.push(`- **Relation**: ${relation}`);
        lines.push(`- **Description**: ${dep.description}`);
        lines.push('');
    }
    return lines.join('\n');
}
function formatClusterMarkdown(cluster) {
    const lines = [
        `# Tool Cluster`,
        '',
        `**Total**: ${cluster.stats.totalTools} tools (${cluster.stats.savingsPercent.toFixed(1)}% token savings)`,
        '',
        `## Primary Tools`,
        ''
    ];
    for (const tool of cluster.primary) {
        lines.push(`- **${tool.name}** (${tool.type}): ${tool.description}`);
    }
    lines.push('', `## Dependencies`, '');
    for (const dep of cluster.dependencies) {
        lines.push(`- **${dep.name}** (${dep.type}): ${dep.description}`);
    }
    if (cluster.context) {
        lines.push('', `## Usage Context`, '');
        if (cluster.context.usagePatterns.length > 0) {
            lines.push('**Patterns**:');
            for (const pattern of cluster.context.usagePatterns) {
                lines.push(`- ${pattern}`);
            }
        }
        if (cluster.context.examples.length > 0) {
            lines.push('', '**Examples**:');
            for (const example of cluster.context.examples) {
                lines.push(`- ${example}`);
            }
        }
    }
    return lines.join('\n');
}
// =============================================================================
// Tool 4: toolhub_register
// =============================================================================
server.registerTool("toolhub_register", {
    title: "Register Tool",
    description: `Register a new MCP server or skill to Progressive Loader.

Use this to add tools that can be discovered via toolhub_search.

Args:
  - name: Unique tool name (e.g., 'markitdown', 'my-skill')
  - type: 'MCP_Server', 'Skill', 'Tool', or 'Command'
  - description: What the tool does
  - mcpCli: (for MCP_Server) mcp-cli usage info with quickStart, examples, tools
  - skillMeta: (for Skill) metadata with summary, when, tokenSize, keywords

Example for MCP_Server:
{
  "name": "markitdown",
  "type": "MCP_Server",
  "description": "Convert files to markdown",
  "mcpCli": {
    "quickStart": "mcp-cli markitdown convert_to_markdown --uri 'file:///path'",
    "examples": ["# Convert PDF", "mcp-cli markitdown convert_to_markdown --uri 'file:///doc.pdf'"],
    "tools": [{"name": "convert_to_markdown", "params": ["uri"]}]
  }
}`,
    inputSchema: RegisterToolInputSchema,
    annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
    }
}, async (params) => {
    try {
        const data = JSON.stringify(params);
        const command = `${PATHS.pythonPath} ${PATHS.registerScript} register '${data.replace(/'/g, "'\\''")}'`;
        const output = execSync(command, {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
            timeout: 30000
        });
        const result = JSON.parse(output);
        return {
            content: [{
                    type: "text",
                    text: result.success
                        ? `✅ Tool "${params.name}" ${result.action} successfully`
                        : `❌ Error: ${result.error}`
                }],
            structuredContent: result
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{
                    type: "text",
                    text: `Error registering tool: ${error instanceof Error ? error.message : String(error)}`
                }]
        };
    }
});
// =============================================================================
// Tool 5: toolhub_delete
// =============================================================================
server.registerTool("toolhub_delete", {
    title: "Delete Tool",
    description: `Delete a tool from Progressive Loader.

Args:
  - tool_id: ID of the tool to delete (usually the tool name)

Use toolhub_list to find tool IDs.`,
    inputSchema: DeleteToolInputSchema,
    annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false
    }
}, async (params) => {
    try {
        const command = `${PATHS.pythonPath} ${PATHS.registerScript} delete "${params.tool_id}"`;
        const output = execSync(command, {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
            timeout: 30000
        });
        const result = JSON.parse(output);
        return {
            content: [{
                    type: "text",
                    text: result.success
                        ? `✅ Tool "${params.tool_id}" deleted successfully`
                        : `❌ Error: ${result.error}`
                }],
            structuredContent: result
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{
                    type: "text",
                    text: `Error deleting tool: ${error instanceof Error ? error.message : String(error)}`
                }]
        };
    }
});
// =============================================================================
// Tool 6: toolhub_list
// =============================================================================
server.registerTool("toolhub_list", {
    title: "List Registered Tools",
    description: `List all tools registered in Progressive Loader.

Args:
  - type_filter: Filter by type ('MCP_Server', 'Skill', 'Tool', 'Command', 'all')

Returns count by type and full tool list.`,
    inputSchema: ListToolsInputSchema,
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
    }
}, async (params) => {
    try {
        const command = `${PATHS.pythonPath} ${PATHS.registerScript} list`;
        const output = execSync(command, {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
            timeout: 30000
        });
        const result = JSON.parse(output);
        // Apply filter
        let tools = result.tools;
        if (params.type_filter !== 'all') {
            tools = tools.filter((t) => t.type === params.type_filter);
        }
        const summary = {
            total: tools.length,
            byType: {},
            tools: tools
        };
        for (const tool of tools) {
            summary.byType[tool.type] = (summary.byType[tool.type] || 0) + 1;
        }
        // Format output
        const lines = [
            `📊 Registered Tools: ${summary.total}`,
            '',
            '**By Type:**'
        ];
        for (const [type, count] of Object.entries(summary.byType)) {
            lines.push(`- ${type}: ${count}`);
        }
        lines.push('', '**Tools with mcp-cli:**');
        for (const tool of tools.filter((t) => t.hasMcpCli)) {
            lines.push(`- ${tool.name} (${tool.type})`);
        }
        return {
            content: [{
                    type: "text",
                    text: lines.join('\n')
                }],
            structuredContent: summary
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{
                    type: "text",
                    text: `Error listing tools: ${error instanceof Error ? error.message : String(error)}`
                }]
        };
    }
});
// =============================================================================
// Tool 7: toolhub_execute
// =============================================================================
server.registerTool("toolhub_execute", {
    title: "Execute Tool Chain",
    description: `Execute a tool chain based on cluster results or manual definition.

This tool combines search, chain building, and execution in one call.
It can auto-generate chains from a query using Knowledge Graph relationships,
or execute a manually defined chain.

Args:
  - query (string, optional): Natural language query for auto chain generation
  - mcpPath (ChainStep[], optional): Manual chain definition
  - autoChain (boolean): If true, generate chain from query (default: true)
  - trace (boolean): Enable execution trace for debugging (default: false)

ChainStep format:
  {
    "toolName": "sqlite_tiktok_read_query",
    "toolArgs": "{\\"query\\": \\"SELECT * FROM daily_metrics\\"}",
    "inputPath": "$.data",      // Optional: JSONPath for input
    "outputPath": "$.results"   // Optional: JSONPath for output
  }

Examples:
  Auto chain:
    { "query": "TikTok 데이터 → Excel 리포트" }

  Manual chain:
    {
      "mcpPath": [
        { "toolName": "sqlite_tiktok_read_query", "toolArgs": "{\\"query\\": \\"SELECT * FROM daily_metrics\\"}" },
        { "toolName": "pandas_excel_create", "toolArgs": "{\\"data\\": \\"CHAIN_RESULT\\"}" }
      ],
      "autoChain": false
    }

Returns:
  {
    "success": true,
    "result": "...",
    "chain": { "steps": [...], "executionOrder": [...] },
    "trace": [...] // if trace enabled
  }`,
    inputSchema: ExecuteChainInputSchema,
    annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
    }
}, async (params) => {
    try {
        let steps;
        let builtChain = null;
        if (params.autoChain && params.query) {
            // Auto-generate chain from query
            // First, get tool cluster
            const cluster = await hybridSearch.getToolCluster(params.query, true);
            // Build chain using ChainBuilder
            const allTools = [...cluster.primary, ...cluster.dependencies];
            builtChain = chainBuilder.buildChain(allTools);
            steps = builtChain.steps;
            if (steps.length === 0) {
                return {
                    content: [{
                            type: "text",
                            text: `No executable chain could be built for query: "${params.query}"\n\nTools found:\n${allTools.map(t => `- ${t.name} (${t.type})`).join('\n')}\n\nNote: Only MCP_Server type tools can be executed in chains.`
                        }]
                };
            }
        }
        else if (params.mcpPath) {
            // Use manually provided chain
            steps = params.mcpPath;
        }
        else {
            return {
                isError: true,
                content: [{
                        type: "text",
                        text: "Either 'query' (with autoChain=true) or 'mcpPath' must be provided"
                    }]
            };
        }
        // Execute the chain
        // Note: ChainExecutor needs registered tools to execute
        // For now, we'll return the built chain for manual execution
        // Full execution requires MCP server config integration
        const toolHints = builtChain?.toolHints || {};
        const output = {
            success: true,
            chain: {
                steps: steps,
                executionOrder: builtChain?.executionOrder || steps.map(s => s.toolName),
                dataFlow: builtChain?.dataFlow || []
            },
            toolHints,
            message: "Chain structure provided. Claude should fill toolArgs for steps marked <FILL_BY_CLAUDE>.",
            mcpChainFormat: {
                mcpPath: steps.map(s => ({
                    toolName: s.toolName,
                    toolArgs: s.toolArgs,
                    inputPath: s.inputPath,
                    outputPath: s.outputPath
                }))
            }
        };
        // Build hint text for Claude
        const hintLines = [];
        for (const [toolName, hints] of Object.entries(toolHints)) {
            if (hints.example) {
                hintLines.push(`  - ${toolName}: ${hints.example}`);
            }
        }
        const textLines = [
            `✅ Chain structure built`,
            '',
            `**Execution Order**: ${output.chain.executionOrder.join(' → ')}`,
            '',
            `**Steps** (${steps.length}):`,
            ...steps.map((s, i) => `  ${i + 1}. ${s.toolName} → toolArgs: ${s.toolArgs}`),
            '',
            `**Argument Hints** (fill <FILL_BY_CLAUDE>):`,
            ...hintLines,
            '',
            `**Data Flow**:`,
            ...output.chain.dataFlow.map(f => `  ${f.from} → ${f.to}`),
            '',
            `Claude: Fill the toolArgs for first step, then use mcp_chain with mcpPath.`
        ];
        return {
            content: [{
                    type: "text",
                    text: textLines.join('\n')
                }],
            structuredContent: output
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{
                    type: "text",
                    text: `Error executing chain: ${error instanceof Error ? error.message : String(error)}`
                }]
        };
    }
});
// =============================================================================
// Tool 8: toolhub_chain (replaces mcp_chain from Tool-Chainer)
// =============================================================================
server.registerTool("toolhub_chain", {
    title: "Execute Tool Chain",
    description: `Execute a chain of MCP tools sequentially.

Each tool receives the result from the previous tool via CHAIN_RESULT placeholder.

Args:
  - mcpPath: Array of tool configurations with:
    - toolName: Full tool name (e.g., 'sqlite_tiktok_read_query')
    - toolArgs: JSON string with arguments
    - inputPath: Optional JSONPath for input filtering
    - outputPath: Optional JSONPath for output filtering
    - outputTransform: Optional data transformation

Example:
  {
    "mcpPath": [
      { "toolName": "sqlite_tiktok_read_query", "toolArgs": "{\\"query\\": \\"SELECT * FROM daily_metrics\\"}", "outputTransform": "sqlite→2d" },
      { "toolName": "document_edit_create_excel_file", "toolArgs": "{\\"filepath\\": \\"/tmp/report.xlsx\\", \\"content\\": \\"CHAIN_RESULT\\"}" }
    ]
  }

Returns the final result from the chain execution.`,
    inputSchema: ToolhubChainInputSchema,
    annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
    }
}, async (params) => {
    try {
        await ensureDiscoveryInitialized();
        const steps = params.mcpPath.map(s => ({
            toolName: s.toolName,
            toolArgs: s.toolArgs,
            inputPath: s.inputPath,
            outputPath: s.outputPath,
            outputTransform: s.outputTransform
        }));
        const result = await executeChain(steps, discoveryService);
        if (result.success) {
            return {
                content: [{ type: "text", text: result.result }],
                structuredContent: { success: true, result: result.result, trace: result.trace }
            };
        }
        else {
            return {
                content: [{ type: "text", text: JSON.stringify(result.result, null, 2) }],
                structuredContent: result.result
            };
        }
    }
    catch (error) {
        return {
            isError: true,
            content: [{
                    type: "text",
                    text: `Chain execution error: ${error instanceof Error ? error.message : String(error)}`
                }]
        };
    }
});
// =============================================================================
// Tool 9: toolhub_discover
// =============================================================================
server.registerTool("toolhub_discover", {
    title: "Discover Chainable Tools",
    description: `Rediscover tools from all configured MCP servers.

Call this to refresh the list of available tools for chaining.
Useful after adding new MCP servers or if tools seem unavailable.

Returns the count and list of discovered tools.`,
    inputSchema: EmptyInputSchema,
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
    }
}, async () => {
    try {
        // Force re-discovery
        discoveryInitialized = false;
        await discoveryService.loadConfig();
        await discoveryService.discoverTools();
        discoveryInitialized = true;
        const tools = discoveryService.getTools();
        const toolsWithSchema = tools.map(t => ({
            name: t.name,
            description: t.tool.description || '',
            inputSchema: t.tool.inputSchema
        }));
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({ count: tools.length, tools: toolsWithSchema }, null, 2)
                }],
            structuredContent: {
                count: tools.length,
                tools: toolsWithSchema
            }
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{
                    type: "text",
                    text: `Discovery error: ${error instanceof Error ? error.message : String(error)}`
                }]
        };
    }
});
// =============================================================================
// Tool 10: toolhub_chainable
// =============================================================================
server.registerTool("toolhub_chainable", {
    title: "List Chainable Tools",
    description: `List all tools available for chain execution.

Returns the names of all discovered MCP tools that can be used with toolhub_chain.`,
    inputSchema: EmptyInputSchema,
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
    }
}, async () => {
    try {
        await ensureDiscoveryInitialized();
        const toolNames = discoveryService.getToolNames();
        return {
            content: [{ type: "text", text: toolNames }]
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{
                    type: "text",
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`
                }]
        };
    }
});
// =============================================================================
// Tool 11: toolhub_prepare_chain
// =============================================================================
server.registerTool("toolhub_prepare_chain", {
    title: "Prepare Chain with Skill Context",
    description: `Analyze a tool chain and provide related skills, schemas, and transform recommendations.

Call this BEFORE executing a chain to get:
1. Related skills from Knowledge Graph (for reference/patterns)
2. Input schemas for each tool (for correct argument formatting)
3. Recommended transforms between steps (for data compatibility)

Args:
  - mcpPath: Array of chain steps to analyze
  - include_skills: Include related skills (default: true)
  - include_schemas: Include tool schemas (default: true)
  - include_transforms: Include transform recommendations (default: true)

Returns:
  {
    "steps": [
      {
        "toolName": "sqlite_tiktok_read_query",
        "inputSchema": {...},
        "relatedSkills": [
          { "name": "데이터-구조-파악", "summary": "...", "relation": "BENEFITS_FROM" }
        ],
        "recommendedTransform": "sqlite→2d"
      }
    ],
    "skillsToLoad": ["n8n-node-templates", "pandas-excel-작업"],
    "chainValidation": { "valid": true, "warnings": [] }
  }

Use this to prepare context before toolhub_chain execution.`,
    inputSchema: PrepareChainInputSchema,
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
    }
}, async (params) => {
    try {
        await ensureDiscoveryInitialized();
        const steps = [];
        const allRelatedSkills = new Set();
        const warnings = [];
        const discoveredTools = discoveryService.getTools();
        for (let i = 0; i < params.mcpPath.length; i++) {
            const step = params.mcpPath[i];
            const stepInfo = { toolName: step.toolName };
            // 1. Find tool schema
            if (params.include_schemas) {
                const tool = discoveredTools.find(t => t.name === step.toolName);
                if (tool) {
                    stepInfo.inputSchema = tool.tool.inputSchema;
                }
                else {
                    warnings.push(`Tool "${step.toolName}" not found in discovered tools`);
                }
            }
            // 2. Find related skills via Knowledge Graph
            if (params.include_skills) {
                try {
                    // Extract base tool name (e.g., "sqlite_tiktok" from "sqlite_tiktok_read_query")
                    const baseName = step.toolName.split('_').slice(0, 2).join('_');
                    const expanded = await hybridSearch.expandTool(baseName, 2, ['BENEFITS_FROM', 'WORKS_WITH']);
                    const skills = expanded.filter(e => e.type === 'Skill');
                    if (skills.length > 0) {
                        stepInfo.relatedSkills = skills.map(s => ({
                            name: s.name,
                            summary: s.description || '',
                            relation: s.metadata?.relationType || 'RELATED'
                        }));
                        skills.forEach(s => allRelatedSkills.add(s.name));
                    }
                }
                catch {
                    // Skill lookup failed, continue without
                }
            }
            // 3. Recommend transform based on tool type
            if (params.include_transforms && i < params.mcpPath.length - 1) {
                const nextStep = params.mcpPath[i + 1];
                stepInfo.recommendedTransform = recommendTransform(step.toolName, nextStep.toolName);
            }
            steps.push(stepInfo);
        }
        const output = {
            steps,
            skillsToLoad: Array.from(allRelatedSkills),
            chainValidation: {
                valid: warnings.length === 0,
                warnings
            }
        };
        // Format text output
        const lines = [
            `# Chain Preparation`,
            '',
            `**Steps**: ${steps.length}`,
            `**Related Skills**: ${output.skillsToLoad.length}`,
            ''
        ];
        for (const step of steps) {
            lines.push(`## ${step.toolName}`);
            if (step.relatedSkills && step.relatedSkills.length > 0) {
                lines.push(`**Skills to reference**:`);
                for (const skill of step.relatedSkills) {
                    lines.push(`  - ${skill.name} (${skill.relation}): ${skill.summary}`);
                }
            }
            if (step.recommendedTransform) {
                lines.push(`**Recommended transform**: \`${step.recommendedTransform}\``);
            }
            lines.push('');
        }
        if (output.skillsToLoad.length > 0) {
            lines.push(`## Skills to Load`);
            lines.push(`Load these skills before execution for best results:`);
            for (const skill of output.skillsToLoad) {
                lines.push(`- \`/skill ${skill}\``);
            }
        }
        if (warnings.length > 0) {
            lines.push('', `## Warnings`);
            for (const w of warnings) {
                lines.push(`⚠️ ${w}`);
            }
        }
        return {
            content: [{ type: "text", text: lines.join('\n') }],
            structuredContent: output
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{
                    type: "text",
                    text: `Error preparing chain: ${error instanceof Error ? error.message : String(error)}`
                }]
        };
    }
});
/**
 * Recommend transform based on source and target tool types
 */
function recommendTransform(sourceTool, targetTool) {
    // SQLite → Excel/Document: need 2D array
    if (sourceTool.includes('sqlite') && sourceTool.includes('read')) {
        if (targetTool.includes('excel') || targetTool.includes('document')) {
            return 'sqlite→2d';
        }
    }
    // Excel → SQLite: need JSON objects
    if (sourceTool.includes('excel') && targetTool.includes('sqlite')) {
        return 'json→object';
    }
    // List tables → Any: usually need 2D
    if (sourceTool.includes('list_tables')) {
        return 'sqlite→2d';
    }
    return undefined;
}
// =============================================================================
// Main Entry Point
// =============================================================================
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Progressive Loader MCP Server running via stdio");
}
main().catch(error => {
    console.error("Server error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map