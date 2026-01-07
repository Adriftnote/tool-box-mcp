# Progressive Loader Enhancement Plan

## 현재 문제

Progressive Loader가 도구 **이름만** 찾아주고, **사용법**은 제공하지 않음.

### 현재 반환:
```json
{
  "name": "sqlite_tiktok",
  "type": "MCP_Server",
  "description": "TikTok Analytics SQLite..."
}
```

### 필요한 것:
```json
{
  "name": "sqlite_tiktok",
  "type": "MCP_Server",
  "description": "...",
  "schema": {
    "tools": [
      {
        "name": "list_tables",
        "description": "List all tables in database",
        "inputSchema": {}
      },
      {
        "name": "read_query",
        "description": "Execute SELECT query",
        "inputSchema": {
          "type": "object",
          "properties": {
            "sql": { "type": "string" }
          }
        }
      }
    ]
  },
  "examples": [
    "mcp__sqlite_tiktok__list_tables()",
    "mcp__sqlite_tiktok__read_query({ sql: 'SELECT * FROM ...' })"
  ],
  "usagePattern": "mcp__sqlite_tiktok__<tool_name>"
}
```

---

## 해결 방법

### 1. ChromaDB 데이터 구조 변경

**현재 (메타데이터)**:
```python
{
  "name": "sqlite_tiktok",
  "type": "MCP_Server"
}
```

**개선 (전체 schema 포함)**:
```python
{
  "name": "sqlite_tiktok",
  "type": "MCP_Server",
  "tools": [
    {"name": "list_tables", "inputSchema": {...}},
    {"name": "read_query", "inputSchema": {...}}
  ],
  "examples": ["mcp__sqlite_tiktok__list_tables()"],
  "mcpServerConfig": {
    "command": "uvx",
    "args": ["mcp-server-sqlite", "--db-path", "..."]
  }
}
```

### 2. TypeScript 타입 확장

**src/services/types.ts**:
```typescript
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface KnowledgeSource {
  name: string;
  type: 'MCP_Server' | 'Skill' | 'Tool' | 'Command';
  description: string;
  similarity?: number;

  // 새로 추가
  schema?: {
    tools?: ToolDefinition[];
  };
  examples?: string[];
  usagePattern?: string;
  mcpConfig?: {
    command: string;
    args: string[];
  };
  metadata?: Record<string, unknown>;
}
```

### 3. progressive_get_tool_cluster 응답 개선

**현재**:
```json
{
  "primary": [
    { "name": "sqlite_tiktok", "description": "..." }
  ]
}
```

**개선**:
```json
{
  "primary": [
    {
      "name": "sqlite_tiktok",
      "description": "...",
      "schema": {
        "tools": [
          { "name": "list_tables", "inputSchema": {} },
          { "name": "read_query", "inputSchema": {...} }
        ]
      },
      "examples": [
        "# List all tables",
        "mcp__sqlite_tiktok__list_tables()",
        "",
        "# Query data",
        "mcp__sqlite_tiktok__read_query({ sql: 'SELECT ...' })"
      ],
      "quickStart": {
        "step1": "List tables: mcp__sqlite_tiktok__list_tables()",
        "step2": "Check schema: mcp__sqlite_tiktok__describe_table({ name: 'daily_metrics_atomic' })",
        "step3": "Query: mcp__sqlite_tiktok__read_query({ sql: 'SELECT ...' })"
      }
    }
  ]
}
```

---

## 구현 단계

### Phase 1: 데이터 수집 스크립트
```python
# scripts/collect-tool-schemas.py

import json
from pathlib import Path

def collect_mcp_schemas():
    """MCP 서버들의 schema 수집"""
    schemas = []

    # sqlite_tiktok 예시
    schemas.append({
        "name": "sqlite_tiktok",
        "type": "MCP_Server",
        "description": "TikTok Analytics SQLite database...",
        "schema": {
            "tools": [
                {
                    "name": "list_tables",
                    "description": "List all tables",
                    "inputSchema": {"type": "object", "properties": {}}
                },
                {
                    "name": "read_query",
                    "description": "Execute SELECT query",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "sql": {"type": "string", "description": "SQL query"}
                        },
                        "required": ["sql"]
                    }
                }
            ]
        },
        "examples": [
            "mcp__sqlite_tiktok__list_tables()",
            "mcp__sqlite_tiktok__read_query({ sql: 'SELECT * FROM daily_metrics_atomic LIMIT 10' })"
        ],
        "usagePattern": "mcp__sqlite_tiktok__<tool_name>"
    })

    return schemas

# ChromaDB에 업로드
collection.add(
    documents=[s['description'] for s in schemas],
    metadatas=schemas,  # 전체 schema 포함
    ids=[s['name'] for s in schemas]
)
```

### Phase 2: Vector Search 개선
```typescript
// src/services/vector-search.ts

async search(query: string, limit: number): Promise<KnowledgeSource[]> {
  // ... ChromaDB 검색 ...

  // metadata에서 schema 추출
  return results.map(r => ({
    name: r.metadata.name,
    type: r.metadata.type,
    description: r.document,
    similarity: r.distance,

    // 새로 추가
    schema: r.metadata.schema,
    examples: r.metadata.examples,
    usagePattern: r.metadata.usagePattern
  }));
}
```

### Phase 3: 응답 포맷 개선
```typescript
// src/index.ts - progressive_get_tool_cluster

const result = await hybridSearch.getToolCluster(query);

// context에 quick start guide 추가
result.context = {
  ...result.context,
  quickStartGuide: result.primary.map(tool => ({
    tool: tool.name,
    steps: tool.quickStart || generateQuickStart(tool)
  }))
};

return {
  content: [{
    type: "text",
    text: JSON.stringify(result, null, 2)
  }]
};
```

---

## 기대 효과

### Before (현재):
```
1. Progressive Loader: "sqlite_tiktok 써라"
2. Claude: "어떻게 써?" → Bash로 우회
3. Python으로 직접 SQLite 접근
```

### After (개선):
```
1. Progressive Loader: "sqlite_tiktok 써라 + list_tables 함수 있음"
2. Claude: mcp__sqlite_tiktok__list_tables() 직접 호출
3. 테이블 목록 받음
4. Claude: mcp__sqlite_tiktok__read_query({ sql: ... })
5. 데이터 받음
```

**진짜 Progressive Loading 달성!**

---

## 추가 개선 사항

### 1. mcp-cli 스킬 통합
```typescript
// Progressive Loader 결과에 mcp-cli 명령어 포함
{
  "name": "sqlite_tiktok",
  "mcpCliCommand": "mcp-cli sqlite_tiktok list_tables",
  "alternatives": [
    "Direct: mcp__sqlite_tiktok__list_tables()",
    "CLI: mcp-cli sqlite_tiktok list_tables"
  ]
}
```

### 2. 실제 사용 예시 수집
```python
# Claude-mem에서 실제 사용 예시 추출
observations = search("sqlite_tiktok read_query")
actual_usage = extract_code_blocks(observations)

# ChromaDB에 추가
update_metadata(
  name="sqlite_tiktok",
  realWorldExamples=actual_usage
)
```

### 3. Tool Activation (고급)
```typescript
// Progressive Loader가 찾은 도구를 실제로 활성화
interface ProgressiveLoadRequest {
  query: string;
  autoActivate?: boolean;  // 자동으로 MCP 서버 시작
}

// 응답에 activation status 포함
{
  "primary": [{
    "name": "sqlite_tiktok",
    "status": "activated",  // or "available", "not_configured"
    "mcpEndpoint": "stdio://..."
  }]
}
```

---

## 다음 단계

1. ✅ 문제 진단 완료
2. ⏳ Tool schema 수집 스크립트 작성
3. ⏳ ChromaDB 데이터 재구축
4. ⏳ TypeScript 타입 확장
5. ⏳ progressive_get_tool_cluster 개선
6. ⏳ 테스트 및 검증
