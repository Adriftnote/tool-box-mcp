# Tool Box MCP Server

Central registry for AI tools with **Vector Search + Knowledge Graph** for intelligent tool discovery and chaining.

## Features

- **Vector Search**: Semantic tool discovery via ChromaDB
- **Knowledge Graph**: Tool relationships and dependency traversal
- **Tool Chaining**: Execute multi-step MCP tool pipelines with data transformations
- **Progressive Disclosure**: Load only what's needed, 90%+ token savings
- **Unified Registry**: MCP Servers, Skills, Tools, Commands in one place

## Tools

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

```bash
git clone https://github.com/Adriftnote/tool-box-mcp.git
cd tool-box-mcp
npm install
npm run build
```

### Data Setup

Initialize ChromaDB and Knowledge Graph:

```bash
./scripts/run-all.sh
```

## Configuration

### Claude Code / MCP Client

Add to your MCP settings:

```json
{
  "mcpServers": {
    "tool-hub": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/tool-box-mcp/dist/index.js"]
    }
  }
}
```

### Environment Variables (Optional)

```bash
TOOLHUB_GRAPH_PATH       # Knowledge Graph JSON path
TOOLHUB_MCP_CONFIG       # MCP chainer config path
TOOLHUB_REGISTER_SCRIPT  # Tool registration script path
TOOLHUB_PYTHON_PATH      # Python interpreter path
```

## Usage Examples

### 1. Search Tools

```typescript
toolhub_search({
  query: "TikTok data analysis",
  limit: 10,
  include_graph: true
})
```

**Response**:
```json
{
  "results": [
    {
      "name": "sqlite_tiktok",
      "type": "MCP_Server",
      "description": "TikTok analytics database",
      "similarity": 0.89
    }
  ],
  "stats": {
    "totalCount": 5,
    "tokenEstimate": 3500,
    "savingsPercent": 96.1
  }
}
```

### 2. Execute Tool Chain

```typescript
toolhub_chain({
  mcpPath: [
    {
      toolName: "sqlite_tiktok_read_query",
      toolArgs: "{\"query\": \"SELECT * FROM daily_metrics LIMIT 10\"}",
      outputTransform: "sqlite→2d"
    },
    {
      toolName: "document_edit_create_excel_file",
      toolArgs: "{\"filepath\": \"/tmp/report.xlsx\", \"content\": \"CHAIN_RESULT\"}"
    }
  ]
})
```

**Result**: SQLite query → Excel file in one call

### 3. Prepare Chain (Pre-Analysis)

```typescript
toolhub_prepare_chain({
  mcpPath: [...],
  include_skills: true,
  include_schemas: true,
  include_transforms: true
})
```

**Response**: Input schemas, related skills, recommended transforms

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
│  Vector Store │    │  Graph JSON   │
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

## Performance

### Token Savings

| Query Type | Tools Returned | Token Savings |
|------------|----------------|---------------|
| n8n workflow | 7-9 | 89-92% |
| TikTok data | 5-7 | 92-94% |
| Excel report | 3-5 | 94-96% |

### Progressive Disclosure

| Item | Full Load | Progressive | Savings |
|------|-----------|-------------|---------|
| 1 MCP Server | 800 tokens | 200 tokens | 75% |
| 4 Skills | 12,000 tokens | 400 tokens | 96.7% |
| **Total** | **89,600 tokens** | **~7,000 tokens** | **92%** |

## Development

```bash
# Build
npm run build

# Run
npm start

# Type check
npm run typecheck
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `zod` - Input schema validation
- `progressive-loader` - Chain building utilities
- ChromaDB (Python) - Vector search backend

## License

ISC
