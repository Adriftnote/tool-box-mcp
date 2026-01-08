/**
 * Progressive Loader MCP Server Constants
 */

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const PROJECT_ROOT = resolve(__dirname, '..');

// Response limits
export const CHARACTER_LIMIT = 25000;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

// Paths (configurable via environment, defaults to project-relative)
export const PYTHON_PATH = process.env.TOOLHUB_PYTHON_PATH || 'python3';
export const KNOWLEDGE_GRAPH_PATH = process.env.TOOLHUB_GRAPH_PATH || resolve(PROJECT_ROOT, 'data', 'knowledge-graph.json');
export const MCP_CONFIG_PATH = process.env.TOOLHUB_MCP_CONFIG || resolve(PROJECT_ROOT, 'data', 'mcp-config.json');
export const CHROMADB_PATH = process.env.TOOLHUB_CHROMADB_PATH || resolve(PROJECT_ROOT, 'data', 'chromadb');
export const SCRIPTS_PATH = resolve(PROJECT_ROOT, 'scripts');

// Graph traversal
export const DEFAULT_GRAPH_DEPTH = 2;
export const MAX_GRAPH_DEPTH = 4;

// Token estimation
export const AVG_TOKENS_PER_TOOL = 1000;
export const FULL_CONTEXT_TOOLS = 89;
export const FULL_CONTEXT_TOKENS = FULL_CONTEXT_TOOLS * AVG_TOKENS_PER_TOOL;
