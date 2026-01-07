/**
 * Tool Discovery Service
 *
 * Discovers and manages MCP tools from configured servers.
 * Ported from mcp-tool-chainer for Tool-Hub integration.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { JSONPath } from "jsonpath-plus";
import fs from "fs";
import { applyTransform, listTransforms } from "./transforms.js";

// Re-export for backward compatibility
export { applyTransform, listTransforms };

// =============================================================================
// Types
// =============================================================================

export interface McpConfig {
  mcpServers: Record<string, ServerConfig>;
}

export interface ServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface DiscoveredTool {
  name: string;           // Full name: serverKey_toolName
  serverKey: string;      // Original server key
  toolName: string;       // Original tool name
  tool: Tool;             // Tool definition
  serverConfig: ServerConfig;
}

// Get supported transform types dynamically from registry
export const TRANSFORM_TYPES = () => listTransforms().map(t => t.name);
export type TransformType = string;

// Chain step definition (compatible with Tool-Chainer)
export interface ChainStep {
  toolName: string;
  toolArgs: string;
  inputPath?: string;
  outputPath?: string;
  outputTransform?: string;
}

// =============================================================================
// Tool Discovery Service
// =============================================================================

export class ToolDiscoveryService {
  private config: McpConfig | null = null;
  private tools: DiscoveredTool[] = [];
  private configPath: string;

  constructor(configPath: string = '/root/.mcp-chainer-config.json') {
    this.configPath = configPath;
  }

  /**
   * Load MCP config from file
   */
  async loadConfig(): Promise<McpConfig> {
    try {
      const content = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(content) as McpConfig;
      return this.config;
    } catch (error) {
      throw new Error(`Failed to load MCP config from ${this.configPath}: ${error}`);
    }
  }

  /**
   * Discover tools from all configured MCP servers
   */
  async discoverTools(): Promise<DiscoveredTool[]> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config) {
      throw new Error("Config not loaded");
    }

    this.tools = [];
    const discoveryPromises: Promise<void>[] = [];

    for (const serverKey of Object.keys(this.config.mcpServers)) {
      // Skip self-references
      if (serverKey === "tool-hub" || serverKey === "tool-chainer" || serverKey === "mcp_tool_chainer") {
        continue;
      }

      const serverConfig = this.config.mcpServers[serverKey];
      const discoveryPromise = this.discoverServerTools(serverKey, serverConfig);
      discoveryPromises.push(discoveryPromise);
    }

    await Promise.all(discoveryPromises);
    return this.tools;
  }

  /**
   * Discover tools from a single MCP server
   */
  private async discoverServerTools(serverKey: string, serverConfig: ServerConfig): Promise<void> {
    try {
      const client = new Client({
        name: `discovery_${serverKey}`,
        version: "1.0.0"
      });

      const transport = new StdioClientTransport({
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env || {}
      });

      await client.connect(transport);

      try {
        const availTools = await client.listTools();
        for (const tool of availTools.tools) {
          const fullName = this.formatName(serverKey) + "_" + tool.name;
          this.tools.push({
            name: fullName,
            serverKey,
            toolName: tool.name,
            tool,
            serverConfig
          });
        }
      } finally {
        await client.transport?.close();
        await client.close();
      }
    } catch (error) {
      console.error(`Error discovering tools for ${serverKey}:`, error);
    }
  }

  /**
   * Get list of discovered tools
   */
  getTools(): DiscoveredTool[] {
    return this.tools;
  }

  /**
   * Get tool names as comma-separated string
   */
  getToolNames(): string {
    return this.tools.map(t => t.name).join(", ");
  }

  /**
   * Find a discovered tool by name
   */
  findTool(toolName: string): DiscoveredTool | undefined {
    return this.tools.find(t =>
      t.name === toolName ||
      t.toolName === toolName ||
      (this.formatName(t.serverKey) + "_" + t.toolName) === toolName
    );
  }

  /**
   * Create a client for executing a tool
   */
  async createToolClient(toolName: string): Promise<{ tool: Tool; client: Client }> {
    const discovered = this.findTool(toolName);
    if (!discovered) {
      throw new Error(`Tool ${toolName} not found. Available: ${this.getToolNames()}`);
    }

    const client = new Client({
      name: discovered.serverKey,
      version: "1.0.0"
    });

    const transport = new StdioClientTransport({
      command: discovered.serverConfig.command,
      args: discovered.serverConfig.args,
      env: discovered.serverConfig.env || {}
    });

    await client.connect(transport);
    return { tool: discovered.tool, client };
  }

  /**
   * Format server name (replace - with _)
   */
  private formatName(name: string): string {
    return name.replace(/-/g, "_");
  }
}

// =============================================================================
// Data Transform Functions (moved to ./transforms.ts)
// =============================================================================
// applyTransform and listTransforms are now imported from ./transforms.ts

/**
 * Deep unescape helper for JSON strings
 */
function deepUnescape(str: string, depth: number = 0, maxDepth: number = 10): any {
  try {
    return JSON.parse(str);
  } catch (e) {
    try {
      return JSON.parse(`"${str.replace(/"/g, '\\"')}"`);
    } catch (e2) {
      if (str.includes('\\') && depth < maxDepth) {
        return deepUnescape(str.replace(/\\(.)/g, '$1'), depth + 1, maxDepth);
      }
      return str;
    }
  }
}

// =============================================================================
// Chain Execution
// =============================================================================

const CHAIN_RESULT = "CHAIN_RESULT";

/**
 * Execute a chain of MCP tools
 */
export async function executeChain(
  steps: ChainStep[],
  discoveryService: ToolDiscoveryService
): Promise<{ success: boolean; result: any; trace?: any[] }> {
  let result: any = null;
  const trace: any[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const { toolName, inputPath, outputPath, outputTransform } = step;

    trace.push({ step: i + 1, toolName, status: 'starting' });

    // Create client for the tool
    const { client, tool } = await discoveryService.createToolClient(toolName);

    try {
      // Process input from previous result
      let processedResult = result;
      if (inputPath && i > 0 && result) {
        try {
          let jsonResult = typeof result === 'string' ? JSON.parse(result) : result;
          const extracted = JSONPath({ path: inputPath, json: jsonResult });
          processedResult = extracted.length === 1 ? extracted[0] : extracted;
          if (typeof processedResult === 'object' && processedResult !== null) {
            processedResult = JSON.stringify(processedResult);
          }
        } catch (error) {
          console.warn(`Failed to apply inputPath '${inputPath}'`);
        }
      }

      // Build tool input
      let toolInput: string;
      if (i === 0) {
        toolInput = step.toolArgs;
      } else {
        // Replace CHAIN_RESULT placeholder
        let isValidJson = false;
        let parsedResult: any;
        try {
          parsedResult = typeof processedResult === 'string' ? JSON.parse(processedResult) : processedResult;
          isValidJson = true;
        } catch (e) {
          isValidJson = false;
        }

        if (step.toolArgs.includes(`"${CHAIN_RESULT}"`)) {
          // CHAIN_RESULT in quotes - pass as JSON string
          if (isValidJson && (Array.isArray(parsedResult) || typeof parsedResult === 'object')) {
            toolInput = step.toolArgs.replace(
              `"${CHAIN_RESULT}"`,
              JSON.stringify(JSON.stringify(parsedResult))
            );
          } else {
            const stringResult = typeof processedResult === 'string'
              ? processedResult
              : JSON.stringify(processedResult);
            toolInput = step.toolArgs.replace(`"${CHAIN_RESULT}"`, `"${stringResult}"`);
          }
        } else {
          // CHAIN_RESULT without quotes
          const stringResult = typeof processedResult === 'string'
            ? processedResult
            : JSON.stringify(processedResult);
          toolInput = step.toolArgs.replace(CHAIN_RESULT, stringResult);
        }
      }

      // Execute the tool
      const response = await client.callTool({
        name: tool.name,
        arguments: JSON.parse(toolInput)
      });

      // Extract result
      if (response.content) {
        result = JSON.parse(JSON.stringify(response.content))[0].text;

        // Apply outputPath
        if (outputPath) {
          try {
            let jsonResult = typeof result === 'string' ? JSON.parse(result) : result;
            const extracted = JSONPath({ path: outputPath, json: jsonResult });
            result = extracted.length === 1 ? extracted[0] : extracted;
            result = JSON.stringify(result);
          } catch (error) {
            console.warn(`Failed to apply outputPath '${outputPath}'`);
          }
        }

        // Apply transform
        if (outputTransform) {
          let dataToTransform;
          if (typeof result === 'string') {
            try {
              dataToTransform = JSON.parse(result);
            } catch (e) {
              // Python dict format uses single quotes
              const jsonStr = result.replace(/'/g, '"');
              dataToTransform = JSON.parse(jsonStr);
            }
          } else {
            dataToTransform = result;
          }

          const transformResult = applyTransform(dataToTransform, outputTransform);

          if (transformResult.needsAI) {
            return {
              success: false,
              result: {
                status: "needs_ai_transform",
                completedSteps: i + 1,
                totalSteps: steps.length,
                currentData: transformResult.transformed,
                hint: transformResult.hint,
                remainingSteps: steps.slice(i + 1)
              },
              trace
            };
          }

          result = JSON.stringify(transformResult.transformed);
        }

        trace.push({ step: i + 1, toolName, status: 'completed' });
      } else {
        throw new Error(`Empty response from tool ${toolName}`);
      }

    } finally {
      await client.transport?.close();
      await client.close();
    }
  }

  return { success: true, result, trace };
}
