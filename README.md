# Tool Box MCP Server

Central registry for AI tools with **Vector Search + Knowledge Graph** for intelligent tool discovery and chaining.

## Features

- **Vector Search**: Semantic tool discovery via ChromaDB
- **Knowledge Graph**: Tool relationships and dependency traversal
- **Tool Chaining**: Execute multi-step MCP tool pipelines with data transformations
- **Progressive Disclosure**: Load only what's needed, 90%+ token savings
- **Unified Registry**: MCP Servers, Skills, Tools, Commands in one place

## Quick Start

```bash
# Clone
git clone https://github.com/Adriftnote/tool-box-mcp.git
cd tool-box-mcp

# Install dependencies
npm install

# Run setup (initializes ChromaDB and sample data)
./scripts/setup.sh

# Start server
npm start
```

## Tools (11 total)

| Tool | Description |
|------|-------------|
| `toolhub_search` | Find tools by natural language query |
| `toolhub_expand` | Explore tool dependencies via Knowledge Graph |
| `toolhub_cluster` | Get complete tool set for a task |
| `toolhub_register` | Add new tools to registry |
| `toolhub_delete` | Remove tools from registry |
| `toolhub_list` | List all registered tools |
| `toolhub_execute` | Auto-generate and execute chain from query |
| `toolhub_chain` | Execute sequential MCP tool pipeline |
| `toolhub_prepare_chain` | Analyze chain before execution (schemas, skills, transforms) |
| `toolhub_discover` | Refresh chainable tools from MCP servers |
| `toolhub_chainable` | List tools available for chaining |

## Installation

### Prerequisites

- Node.js 18+
- Python 3.8+ (for ChromaDB)
- pip (Python package manager)

### Step 1: Clone and Install

```bash
git clone https://github.com/Adriftnote/tool-box-mcp.git
cd tool-box-mcp
npm install
```

### Step 2: Run Setup

```bash
# This installs Python dependencies and initializes ChromaDB
./scripts/setup.sh
```

### Step 3: Configure MCP Client

Add to your Claude Code or MCP client settings:

```json
{
  "mcpServers": {
    "tool-box": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/tool-box-mcp/dist/index.js"]
    }
  }
}
```

## Configuration

### Data Files

After installation, configure these files in the `data/` directory:

| File | Purpose |
|------|---------|
| `mcp-config.json` | MCP servers to chain with |
| `knowledge-graph.json` | Tool relationships |
| `chromadb/` | Vector search database |

### Environment Variables (Optional)

Override default paths with environment variables:

```bash
TOOLHUB_GRAPH_PATH       # Knowledge Graph JSON path
TOOLHUB_MCP_CONFIG       # MCP config path
TOOLHUB_PYTHON_PATH      # Python interpreter path
```

## Usage Examples

### 1. Search Tools

```typescript
toolhub_search({
  query: "data analysis excel",
  limit: 10,
  include_graph: true
})
```

### 2. Execute Tool Chain

```typescript
toolhub_chain({
  mcpPath: [
    {
      toolName: "sqlite_read_query",
      toolArgs: "{\"query\": \"SELECT * FROM metrics LIMIT 10\"}",
      outputTransform: "sqlite→2d"
    },
    {
      toolName: "document_create_excel",
      toolArgs: "{\"filepath\": \"/tmp/report.xlsx\", \"content\": \"CHAIN_RESULT\"}"
    }
  ]
})
```

### 3. Register New Tool

```typescript
toolhub_register({
  name: "my-mcp-server",
  type: "MCP_Server",
  description: "My custom MCP server for data processing"
})
```

## Architecture

```
┌─────────────────────────────────────────────┐
│  Claude Code / AI Agent                     │
└─────────────────────────────────────────────┘
                    │ MCP Call
                    ▼
┌─────────────────────────────────────────────┐
│  Tool Box MCP Server                        │
│  ┌─────────────────────────────────────┐   │
│  │ HybridSearchService                 │   │
│  │ ├─ VectorSearchService (ChromaDB)   │   │
│  │ └─ GraphSearchService (JSON)        │   │
│  ├─────────────────────────────────────┤   │
│  │ ToolDiscoveryService                │   │
│  │ └─ Chain Execution + Transforms     │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌───────────────┐    ┌───────────────┐
│  ChromaDB     │    │  Knowledge    │
│  (data/)      │    │  Graph JSON   │
└───────────────┘    └───────────────┘
```

## Data Transforms

Built-in transforms for chain data flow:

| Transform | Description |
|-----------|-------------|
| `sqlite→2d` | SQLite results to 2D array |
| `json→object` | Parse JSON string to object |
| `object→array` | Wrap object in array |
| `flatten` | Flatten nested arrays |
| `first` | Extract first element |
| `keys` | Get object keys |
| `values` | Get object values |

## Development

```bash
# Build from source
npm run build

# Run server
npm start

# Type check
npm run typecheck
```

## Project Structure

```
tool-box-mcp/
├── dist/                 # Compiled JavaScript (included)
├── src/
│   ├── index.ts          # Main server entry
│   ├── schemas/          # Zod input schemas
│   └── services/         # Search, chain, transform services
├── scripts/
│   ├── setup.sh          # Initial setup script
│   └── register-tool.py  # Tool registration utility
├── data/
│   ├── chromadb/         # Vector database
│   ├── knowledge-graph.json
│   └── mcp-config.json
└── package.json
```

## Troubleshooting

### "ChromaDB not found"

```bash
pip install chromadb sentence-transformers
```

### "Python not found"

Set the Python path:
```bash
export TOOLHUB_PYTHON_PATH=/usr/bin/python3
```

### "No tools found"

Run setup to initialize sample data:
```bash
./scripts/setup.sh
```

## License

ISC
