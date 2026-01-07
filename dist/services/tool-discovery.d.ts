/**
 * Tool Discovery Service
 *
 * Discovers and manages MCP tools from configured servers.
 * Ported from mcp-tool-chainer for Tool-Hub integration.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { applyTransform, listTransforms } from "./transforms.js";
export { applyTransform, listTransforms };
export interface McpConfig {
    mcpServers: Record<string, ServerConfig>;
}
export interface ServerConfig {
    command: string;
    args: string[];
    env?: Record<string, string>;
}
export interface DiscoveredTool {
    name: string;
    serverKey: string;
    toolName: string;
    tool: Tool;
    serverConfig: ServerConfig;
}
export declare const TRANSFORM_TYPES: () => string[];
export type TransformType = string;
export interface ChainStep {
    toolName: string;
    toolArgs: string;
    inputPath?: string;
    outputPath?: string;
    outputTransform?: string;
}
export declare class ToolDiscoveryService {
    private config;
    private tools;
    private configPath;
    constructor(configPath?: string);
    /**
     * Load MCP config from file
     */
    loadConfig(): Promise<McpConfig>;
    /**
     * Discover tools from all configured MCP servers
     */
    discoverTools(): Promise<DiscoveredTool[]>;
    /**
     * Discover tools from a single MCP server
     */
    private discoverServerTools;
    /**
     * Get list of discovered tools
     */
    getTools(): DiscoveredTool[];
    /**
     * Get tool names as comma-separated string
     */
    getToolNames(): string;
    /**
     * Find a discovered tool by name
     */
    findTool(toolName: string): DiscoveredTool | undefined;
    /**
     * Create a client for executing a tool
     */
    createToolClient(toolName: string): Promise<{
        tool: Tool;
        client: Client;
    }>;
    /**
     * Format server name (replace - with _)
     */
    private formatName;
}
/**
 * Execute a chain of MCP tools
 */
export declare function executeChain(steps: ChainStep[], discoveryService: ToolDiscoveryService): Promise<{
    success: boolean;
    result: any;
    trace?: any[];
}>;
//# sourceMappingURL=tool-discovery.d.ts.map