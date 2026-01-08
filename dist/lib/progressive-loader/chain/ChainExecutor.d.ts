/**
 * ChainExecutor - Sequential tool chain execution
 * Extracted and refactored from mcp-tool-chainer
 */
import { ChainStep, ChainResult, ChainableTool, ChainExecutorOptions } from './types.js';
/**
 * ChainExecutor executes a sequence of MCP tools,
 * passing results from one tool to the next.
 */
export declare class ChainExecutor {
    private tools;
    private options;
    constructor(options?: ChainExecutorOptions);
    /**
     * Register a tool for use in chains
     */
    registerTool(tool: ChainableTool): void;
    /**
     * Register multiple tools
     */
    registerTools(tools: ChainableTool[]): void;
    /**
     * Get registered tool names
     */
    getRegisteredTools(): string[];
    /**
     * Execute a chain of tools sequentially
     */
    execute(steps: ChainStep[]): Promise<ChainResult>;
    /**
     * Find a tool by name (supports multiple naming conventions)
     */
    private findTool;
    /**
     * Extract the actual tool name from fully qualified name
     */
    private extractToolName;
    /**
     * Create MCP client for a server
     */
    private createClient;
    /**
     * Close client and transport
     */
    private closeClient;
    /**
     * Apply JSONPath to extract data
     */
    private applyJsonPath;
    /**
     * Safely parse JSON with fallback handling
     */
    private parseJsonSafe;
    /**
     * Deep unescape nested JSON strings
     */
    private deepUnescape;
    /**
     * Substitute CHAIN_RESULT placeholder with actual result
     */
    private substituteChainResult;
    /**
     * Extract text result from MCP response
     */
    private extractResponse;
}
export default ChainExecutor;
//# sourceMappingURL=ChainExecutor.d.ts.map