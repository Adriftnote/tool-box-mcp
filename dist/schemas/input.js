/**
 * Zod schemas for tool input validation
 */
import { z } from "zod";
import { DEFAULT_LIMIT, MAX_LIMIT, DEFAULT_GRAPH_DEPTH, MAX_GRAPH_DEPTH } from "../constants.js";
// Response format enum
export var ResponseFormat;
(function (ResponseFormat) {
    ResponseFormat["MARKDOWN"] = "markdown";
    ResponseFormat["JSON"] = "json";
})(ResponseFormat || (ResponseFormat = {}));
// Tool type enum
export var ToolType;
(function (ToolType) {
    ToolType["MCP_SERVER"] = "MCP_Server";
    ToolType["SKILL"] = "Skill";
    ToolType["TOOL"] = "Tool";
    ToolType["COMMAND"] = "Command";
})(ToolType || (ToolType = {}));
/**
 * Empty schema for tools with no parameters
 */
export const EmptyInputSchema = z.object({}).strict();
/**
 * Schema for search_tools
 */
export const SearchToolsInputSchema = z.object({
    query: z.string()
        .min(2, "Query must be at least 2 characters")
        .max(500, "Query must not exceed 500 characters")
        .describe("Natural language query to find relevant tools (e.g., 'n8n workflow automation', 'TikTok data analysis')"),
    limit: z.number()
        .int()
        .min(1)
        .max(MAX_LIMIT)
        .default(DEFAULT_LIMIT)
        .describe("Maximum number of tools to return"),
    include_graph: z.boolean()
        .default(true)
        .describe("Whether to expand results using Knowledge Graph relationships"),
    response_format: z.nativeEnum(ResponseFormat)
        .default(ResponseFormat.JSON)
        .describe("Output format: 'json' for structured data or 'markdown' for human-readable")
}).strict();
/**
 * Schema for expand_graph
 */
export const ExpandGraphInputSchema = z.object({
    tool_name: z.string()
        .min(1, "Tool name is required")
        .describe("Name of the tool to expand (e.g., 'n8n-workflow-builder')"),
    depth: z.number()
        .int()
        .min(1)
        .max(MAX_GRAPH_DEPTH)
        .default(DEFAULT_GRAPH_DEPTH)
        .describe("How many levels of relationships to traverse"),
    relation_types: z.array(z.string())
        .optional()
        .describe("Filter by relationship types (e.g., ['REQUIRES', 'WORKS_WITH'])"),
    response_format: z.nativeEnum(ResponseFormat)
        .default(ResponseFormat.JSON)
        .describe("Output format")
}).strict();
/**
 * Schema for get_tool_cluster
 */
export const GetToolClusterInputSchema = z.object({
    query: z.string()
        .min(2, "Query must be at least 2 characters")
        .max(500, "Query must not exceed 500 characters")
        .describe("Natural language query to find a complete tool cluster"),
    include_context: z.boolean()
        .default(true)
        .describe("Whether to include usage context and examples"),
    response_format: z.nativeEnum(ResponseFormat)
        .default(ResponseFormat.JSON)
        .describe("Output format")
}).strict();
/**
 * Schema for register_tool
 */
export const RegisterToolInputSchema = z.object({
    name: z.string()
        .min(1, "Tool name is required")
        .describe("Unique name for the tool (e.g., 'markitdown', 'sqlite_mydb')"),
    type: z.enum(["MCP_Server", "Skill", "Tool", "Command"])
        .default("MCP_Server")
        .describe("Type of tool"),
    description: z.string()
        .min(10, "Description must be at least 10 characters")
        .describe("Description of what the tool does"),
    mcpCli: z.object({
        quickStart: z.string().describe("Quick start example command"),
        examples: z.array(z.string()).describe("Array of example commands"),
        tools: z.array(z.object({
            name: z.string(),
            description: z.string().optional(),
            params: z.array(z.string()).optional()
        })).optional().describe("List of available tools/commands")
    }).optional().describe("mcp-cli usage information (for MCP_Server type)"),
    skillMeta: z.object({
        summary: z.string(),
        when: z.string(),
        tokenSize: z.number().optional(),
        keywords: z.array(z.string()).optional(),
        relatedTo: z.array(z.string()).optional()
    }).optional().describe("Skill metadata (for Skill type)")
}).strict();
/**
 * Schema for delete_tool
 */
export const DeleteToolInputSchema = z.object({
    tool_id: z.string()
        .min(1, "Tool ID is required")
        .describe("ID of the tool to delete")
}).strict();
/**
 * Schema for list_tools
 */
export const ListToolsInputSchema = z.object({
    type_filter: z.enum(["MCP_Server", "Skill", "Tool", "Command", "all"])
        .default("all")
        .describe("Filter by tool type")
}).strict();
/**
 * Schema for ChainStep (individual chain step)
 */
export const ChainStepSchema = z.object({
    toolName: z.string()
        .describe("Fully qualified tool name (e.g., 'sqlite_tiktok_read_query')"),
    toolArgs: z.string()
        .describe("JSON string with tool arguments. Use 'CHAIN_RESULT' as placeholder for previous result"),
    inputPath: z.string()
        .optional()
        .describe("Optional JSONPath to extract from previous result"),
    outputPath: z.string()
        .optional()
        .describe("Optional JSONPath to extract from this tool's result")
});
/**
 * Schema for execute_chain
 */
export const ExecuteChainInputSchema = z.object({
    query: z.string()
        .min(2)
        .max(500)
        .optional()
        .describe("Natural language query for auto chain generation"),
    mcpPath: z.array(ChainStepSchema)
        .optional()
        .describe("Manual chain definition (array of ChainStep)"),
    autoChain: z.boolean()
        .default(true)
        .describe("If true, generate chain from query using Knowledge Graph. If false, use mcpPath"),
    trace: z.boolean()
        .default(false)
        .describe("Enable detailed execution trace for debugging")
}).strict().refine((data) => data.query || data.mcpPath, { message: "Either 'query' or 'mcpPath' must be provided" });
/**
 * Schema for prepare_chain - analyze chain and provide skill context
 */
export const PrepareChainInputSchema = z.object({
    mcpPath: z.array(ChainStepSchema)
        .min(1, "At least one chain step is required")
        .describe("Chain steps to analyze"),
    include_skills: z.boolean()
        .default(true)
        .describe("Include related skills from Knowledge Graph (BENEFITS_FROM, WORKS_WITH relations)"),
    include_schemas: z.boolean()
        .default(true)
        .describe("Include input/output schemas for each tool"),
    include_transforms: z.boolean()
        .default(true)
        .describe("Include recommended transforms between steps")
}).strict();
/**
 * Schema for toolhub_chain (was inline in index.ts)
 */
export const ToolhubChainInputSchema = z.object({
    mcpPath: z.array(z.object({
        toolName: z.string().describe("Tool name (e.g., 'sqlite_tiktok_read_query')"),
        toolArgs: z.string().describe("JSON string with tool arguments. Use 'CHAIN_RESULT' placeholder for previous result."),
        inputPath: z.string().optional().describe("JSONPath to extract from previous result"),
        outputPath: z.string().optional().describe("JSONPath to extract from this tool's result"),
        outputTransform: z.string().optional().describe("Transform type: 'sqlite→2d', 'json→object', 'object→array', 'flatten', 'none'")
    })).describe("Ordered array of tools to execute sequentially")
}).strict();
//# sourceMappingURL=input.js.map