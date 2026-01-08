/**
 * Chain Execution Types
 * Extracted from mcp-tool-chainer for Tool-Hub integration
 */

/**
 * Single step in a tool chain
 */
export interface ChainStep {
  /** Fully qualified tool name (e.g., 'sqlite_tiktok_read_query') */
  toolName: string;

  /** JSON string containing tool arguments. Use "CHAIN_RESULT" as placeholder for previous result */
  toolArgs: string;

  /** Optional JSONPath to extract specific data from previous result before passing to this tool */
  inputPath?: string;

  /** Optional JSONPath to extract specific data from this tool's result before passing to next */
  outputPath?: string;

  /** Optional output transform type */
  outputTransform?: string;
}

/**
 * Result of chain execution
 */
export interface ChainResult {
  success: boolean;
  /** Final result from the last tool in the chain */
  result?: any;
  /** Error message if failed */
  error?: string;
  /** Execution trace for debugging */
  trace?: ChainStepResult[];
}

/**
 * Result of a single chain step
 */
export interface ChainStepResult {
  stepIndex: number;
  toolName: string;
  input: any;
  output: any;
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * MCP Server configuration for tool execution
 */
export interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/**
 * Tool information for chain execution
 */
export interface ChainableTool {
  name: string;
  serverName: string;
  serverConfig: McpServerConfig;
  inputSchema?: Record<string, any>;
}

/**
 * Chain execution options
 */
export interface ChainExecutorOptions {
  /** Enable detailed tracing */
  trace?: boolean;
  /** Timeout per step in milliseconds */
  stepTimeout?: number;
  /** Continue on error (skip failed step) */
  continueOnError?: boolean;
}

/**
 * Placeholder constant for chaining results
 */
export const CHAIN_RESULT = "CHAIN_RESULT";
