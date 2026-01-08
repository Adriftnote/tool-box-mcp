/**
 * ChainExecutor - Sequential tool chain execution
 * Extracted and refactored from mcp-tool-chainer
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { JSONPath } from 'jsonpath-plus';
import { CHAIN_RESULT } from './types.js';
/**
 * ChainExecutor executes a sequence of MCP tools,
 * passing results from one tool to the next.
 */
export class ChainExecutor {
    tools = new Map();
    options;
    constructor(options = {}) {
        this.options = {
            trace: false,
            stepTimeout: 60000,
            continueOnError: false,
            ...options
        };
    }
    /**
     * Register a tool for use in chains
     */
    registerTool(tool) {
        this.tools.set(tool.name, tool);
    }
    /**
     * Register multiple tools
     */
    registerTools(tools) {
        for (const tool of tools) {
            this.registerTool(tool);
        }
    }
    /**
     * Get registered tool names
     */
    getRegisteredTools() {
        return Array.from(this.tools.keys());
    }
    /**
     * Execute a chain of tools sequentially
     */
    async execute(steps) {
        const trace = [];
        let result = null;
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const stepStart = Date.now();
            try {
                // Get tool configuration
                const tool = this.findTool(step.toolName);
                if (!tool) {
                    throw new Error(`Tool not found: ${step.toolName}`);
                }
                // Create client for this step
                const client = await this.createClient(tool.serverConfig);
                try {
                    // Process input with JSONPath if specified
                    let processedInput = result;
                    if (step.inputPath && i > 0 && result !== null) {
                        processedInput = this.applyJsonPath(result, step.inputPath);
                    }
                    // Build tool arguments with CHAIN_RESULT substitution
                    const toolArgs = i === 0
                        ? step.toolArgs
                        : this.substituteChainResult(step.toolArgs, processedInput);
                    // Execute the tool
                    const response = await client.callTool({
                        name: this.extractToolName(step.toolName),
                        arguments: JSON.parse(toolArgs)
                    });
                    // Extract result from response
                    result = this.extractResponse(response);
                    // Apply output JSONPath if specified
                    if (step.outputPath) {
                        result = this.applyJsonPath(result, step.outputPath);
                        result = JSON.stringify(result);
                    }
                    // Record trace
                    if (this.options.trace) {
                        trace.push({
                            stepIndex: i,
                            toolName: step.toolName,
                            input: processedInput,
                            output: result,
                            duration: Date.now() - stepStart,
                            success: true
                        });
                    }
                }
                finally {
                    // Always close the client
                    await this.closeClient(client);
                }
            }
            catch (error) {
                const err = error;
                if (this.options.trace) {
                    trace.push({
                        stepIndex: i,
                        toolName: step.toolName,
                        input: result,
                        output: null,
                        duration: Date.now() - stepStart,
                        success: false,
                        error: err.message
                    });
                }
                if (!this.options.continueOnError) {
                    return {
                        success: false,
                        error: `Step ${i + 1} (${step.toolName}) failed: ${err.message}`,
                        trace: this.options.trace ? trace : undefined
                    };
                }
            }
        }
        return {
            success: true,
            result,
            trace: this.options.trace ? trace : undefined
        };
    }
    /**
     * Find a tool by name (supports multiple naming conventions)
     */
    findTool(toolName) {
        // Direct match
        if (this.tools.has(toolName)) {
            return this.tools.get(toolName);
        }
        // Try server_tool format
        for (const [name, tool] of this.tools) {
            const formatted = `${tool.serverName.replace(/-/g, '_')}_${name}`;
            if (formatted === toolName) {
                return tool;
            }
        }
        return undefined;
    }
    /**
     * Extract the actual tool name from fully qualified name
     */
    extractToolName(fullName) {
        // If it's server_tool format, extract the tool part
        const parts = fullName.split('_');
        if (parts.length > 1) {
            // Find the registered tool to get actual name
            const tool = this.findTool(fullName);
            if (tool) {
                return tool.name;
            }
        }
        return fullName;
    }
    /**
     * Create MCP client for a server
     */
    async createClient(config) {
        const client = new Client({
            name: "chain-executor",
            version: "1.0.0"
        });
        const transport = new StdioClientTransport({
            command: config.command,
            args: config.args,
            env: config.env || {}
        });
        await client.connect(transport);
        return client;
    }
    /**
     * Close client and transport
     */
    async closeClient(client) {
        try {
            if (client.transport) {
                await client.transport.close();
            }
            await client.close();
        }
        catch (e) {
            // Ignore close errors
        }
    }
    /**
     * Apply JSONPath to extract data
     */
    applyJsonPath(data, path) {
        try {
            // Parse string data if needed
            let jsonData = data;
            if (typeof data === 'string') {
                jsonData = this.parseJsonSafe(data);
            }
            // Apply JSONPath
            const extracted = JSONPath({ path, json: jsonData });
            // Unwrap single-item arrays
            if (Array.isArray(extracted) && extracted.length === 1) {
                return extracted[0];
            }
            return extracted;
        }
        catch (error) {
            console.warn(`Failed to apply JSONPath '${path}':`, error);
            return data;
        }
    }
    /**
     * Safely parse JSON with fallback handling
     */
    parseJsonSafe(str) {
        try {
            return JSON.parse(str);
        }
        catch (e) {
            // Try to extract JSON portion
            const jsonStart = str.indexOf('{');
            if (jsonStart >= 0) {
                return this.deepUnescape(str.substring(jsonStart));
            }
            return str;
        }
    }
    /**
     * Deep unescape nested JSON strings
     */
    deepUnescape(str, depth = 0, maxDepth = 10) {
        try {
            return JSON.parse(str);
        }
        catch (e) {
            try {
                return JSON.parse(`"${str.replace(/"/g, '\\"')}"`);
            }
            catch (e2) {
                if (str.includes('\\') && depth < maxDepth) {
                    return this.deepUnescape(str.replace(/\\(.)/g, '$1'), depth + 1, maxDepth);
                }
                return str;
            }
        }
    }
    /**
     * Substitute CHAIN_RESULT placeholder with actual result
     */
    substituteChainResult(toolArgs, result) {
        let processedResult = result;
        // Check if result is valid JSON
        let isJson = false;
        if (typeof processedResult === 'string') {
            try {
                JSON.parse(processedResult);
                isJson = true;
            }
            catch (e) {
                isJson = false;
                // Escape for JSON string embedding
                processedResult = JSON.stringify(processedResult).slice(1, -1);
            }
        }
        // Handle string replacements
        if (typeof processedResult === 'string') {
            if (toolArgs.includes(`"${CHAIN_RESULT}"`)) {
                // CHAIN_RESULT is in quotes - replace quoted version
                return toolArgs.replace(`"${CHAIN_RESULT}"`, `"${processedResult}"`);
            }
            else {
                // Replace just the token
                return toolArgs.replace(CHAIN_RESULT, processedResult);
            }
        }
        else {
            // Primitive value - stringify directly
            return toolArgs.replace(CHAIN_RESULT, String(processedResult));
        }
    }
    /**
     * Extract text result from MCP response
     */
    extractResponse(response) {
        if (response.content && Array.isArray(response.content)) {
            const textContent = response.content.find((c) => c.type === 'text');
            if (textContent) {
                return textContent.text;
            }
        }
        return JSON.stringify(response);
    }
}
export default ChainExecutor;
//# sourceMappingURL=ChainExecutor.js.map