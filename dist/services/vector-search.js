/**
 * Vector Search Service
 *
 * Uses Python wrapper to query ChromaDB for semantic similarity search.
 * ChromaDB JavaScript client doesn't support persistent mode, so we use Python.
 */
import { execSync } from "child_process";
import { PYTHON_VENV_PATH, SEARCH_SCRIPT_PATH } from "../constants.js";
export class VectorSearchService {
    pythonPath;
    scriptPath;
    constructor(pythonPath, scriptPath) {
        this.pythonPath = pythonPath || PYTHON_VENV_PATH;
        this.scriptPath = scriptPath || SEARCH_SCRIPT_PATH;
    }
    /**
     * Search for tools using vector similarity
     */
    async search(query, limit = 3) {
        try {
            const command = `${this.pythonPath} ${this.scriptPath} "${query.replace(/"/g, '\\"')}" ${limit}`;
            const output = execSync(command, {
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024,
                timeout: 30000
            });
            const results = JSON.parse(output);
            if (results.error) {
                console.error(`Vector search error: ${results.error}`);
                return [];
            }
            return results.map((r) => {
                const result = {
                    name: r.name,
                    type: this.mapType(r.type),
                    description: r.description,
                    similarity: r.similarity,
                    metadata: {
                        source: 'vector-search'
                    }
                };
                // MCP Server info
                if (r.mcpCli) {
                    result.mcpCli = r.mcpCli;
                }
                // Skill metadata
                if (r.skillMeta) {
                    result.skillMeta = r.skillMeta;
                }
                // Template info (instances, tools, mcpCliPattern)
                if (r.instances) {
                    result.instances = r.instances;
                }
                if (r.mcpCliPattern) {
                    result.mcpCliPattern = r.mcpCliPattern;
                }
                if (r.tools) {
                    result.mcpCli = {
                        quickStart: r.examples?.[0] || '',
                        examples: r.examples || [],
                        tools: r.tools
                    };
                }
                return result;
            });
        }
        catch (error) {
            console.error('Vector search failed:', error);
            return [];
        }
    }
    mapType(type) {
        const typeMap = {
            'MCP_Server': 'MCP_Server',
            'mcp_server': 'MCP_Server',
            'MCP_Server_Template': 'MCP_Server_Template',
            'mcp_server_template': 'MCP_Server_Template',
            'Skill': 'Skill',
            'skill': 'Skill',
            'Tool': 'Tool',
            'tool': 'Tool',
            'Command': 'Command',
            'command': 'Command'
        };
        return typeMap[type] || 'Tool';
    }
}
//# sourceMappingURL=vector-search.js.map