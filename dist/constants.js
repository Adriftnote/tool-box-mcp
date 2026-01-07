/**
 * Progressive Loader MCP Server Constants
 */
// Response limits
export const CHARACTER_LIMIT = 25000;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;
// Paths (configurable via environment)
export const PYTHON_VENV_PATH = process.env.PYTHON_VENV_PATH || '/root/.claude-memory/venv/bin/python3';
export const SEARCH_SCRIPT_PATH = process.env.SEARCH_SCRIPT_PATH || '/root/.claude-memory/search-tools.py';
export const KNOWLEDGE_GRAPH_PATH = process.env.KNOWLEDGE_GRAPH_PATH || '/root/.claude-memory/knowledge-graph.json';
export const CHROMADB_PATH = process.env.CHROMADB_PATH || '/root/.claude-mem/vector-db';
// Graph traversal
export const DEFAULT_GRAPH_DEPTH = 2;
export const MAX_GRAPH_DEPTH = 4;
// Token estimation
export const AVG_TOKENS_PER_TOOL = 1000;
export const FULL_CONTEXT_TOOLS = 89;
export const FULL_CONTEXT_TOKENS = FULL_CONTEXT_TOOLS * AVG_TOKENS_PER_TOOL;
//# sourceMappingURL=constants.js.map