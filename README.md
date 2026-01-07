# Progressive Loader MCP Server

Progressive Disclosure를 구현한 MCP 서버입니다. Vector Search + Knowledge Graph를 활용하여 쿼리에 맞는 도구만 선택적으로 로딩합니다.

## 핵심 기능

- **Vector Search**: ChromaDB를 사용한 의미론적 도구 검색
- **Knowledge Graph**: 도구 간 관계와 의존성 탐색
- **Hybrid Search**: 벡터 검색 + 그래프 확장 결합
- **mcp-cli Integration**: MCP 서버 사용법을 포함한 즉시 실행 가능한 정보 제공
- **Related Skills**: 작업에 유용한 스킬 메타데이터 제공 (전체 내용 X)
- **Token Savings**: 전체 컨텍스트 대비 90%+ 토큰 절약

## Tools

| Tool | 설명 |
|------|------|
| `progressive_search_tools` | 쿼리로 관련 도구 검색 |
| `progressive_expand_graph` | 도구의 의존성 그래프 확장 |
| `progressive_get_tool_cluster` | 완전한 도구 클러스터 반환 |

## 설치

### 1. 프로젝트 설치

```bash
cd /root/progressive-loader-mcp-server
npm install
npm run build
```

### 2. 데이터 설정

ChromaDB와 Knowledge Graph 데이터 초기화:

```bash
# 자동화 스크립트 실행
./scripts/run-all.sh
```

자세한 내용은 [DATA-SETUP.md](./DATA-SETUP.md) 참조

## Claude Code 설정

### 1. settings.json에 추가

```json
{
  "mcpServers": {
    "progressive-loader": {
      "type": "stdio",
      "command": "node",
      "args": ["/mnt/c/claude-code-env/progressive-loader-mcp-server/dist/index.js"]
    }
  }
}
```

### 2. 환경 변수 (선택)

```bash
# Python venv 경로 (ChromaDB 검색용)
export PYTHON_VENV_PATH="/root/.claude-memory/venv/bin/python3"

# 검색 스크립트 경로
export SEARCH_SCRIPT_PATH="/root/.claude-memory/search-tools.py"

# Knowledge Graph 경로
export KNOWLEDGE_GRAPH_PATH="/root/.claude-memory/knowledge-graph.json"
```

## 사용 예시

### 1. 도구 검색 (Search Tools)

```typescript
progressive_search_tools({ query: "n8n 워크플로우 자동화" })
```

**결과**:
```json
{
  "results": [
    {
      "name": "n8n-workflow-builder",
      "type": "MCP_Server",
      "description": "n8n 워크플로우 생성 및 관리",
      "mcpCli": {
        "quickStart": "mcp-cli n8n-workflow-builder list_workflows",
        "examples": [
          "mcp-cli n8n-workflow-builder get_workflow workflow_id=\"123\""
        ],
        "tools": [
          {"name": "list_workflows", "description": "워크플로우 목록"}
        ]
      }
    }
  ],
  "stats": {
    "tokenEstimate": 5000,
    "savingsPercent": 94.4
  }
}
```

### 2. 그래프 확장 (Expand Graph)

```typescript
progressive_expand_graph({
  tool_name: "n8n-workflow-builder",
  depth: 2
})
```

**결과**: n8n-workflow-builder의 모든 의존성 도구

### 3. 도구 클러스터 (Tool Cluster) ⭐ 추천

```typescript
progressive_get_tool_cluster({
  query: "TikTok 데이터 Excel 리포트",
  include_context: true
})
```

**결과**:
```json
{
  "primary": [
    {
      "name": "sqlite_tiktok_analytics",
      "type": "MCP_Server",
      "mcpCli": {
        "quickStart": "mcp-cli sqlite_tiktok read_query query=\"SELECT * FROM daily_metrics\""
      }
    }
  ],
  "dependencies": [
    {"name": "mcp-cli", "type": "Tool"}
  ],
  "relatedSkills": [
    {
      "name": "pandas-excel-작업",
      "summary": "Pandas Excel 읽기/쓰기",
      "when": "Excel 파일 읽기/쓰기 시",
      "tokenSize": 2500
    },
    {
      "name": "데이터-구조-파악",
      "summary": "새 데이터 구조 분석",
      "when": "처음 보는 데이터 분석 시",
      "tokenSize": 2000
    }
  ],
  "context": {
    "usagePatterns": [
      "Use MCP servers for data operations",
      "Apply skills for specialized knowledge"
    ],
    "examples": [
      "Primary workflow: sqlite_tiktok_analytics - TikTok 데이터 조회"
    ]
  },
  "stats": {
    "totalTools": 7,
    "tokenEstimate": 7000,
    "savingsPercent": 92.1
  }
}
```

💡 **Progressive Disclosure**:
- `relatedSkills`는 메타데이터만 반환 (200-500 tokens)
- Claude가 필요하다고 판단하면 `Skill()` 호출로 전체 내용 로드 (3000+ tokens)
- 불필요한 스킬은 로드하지 않아 토큰 절약

## 아키텍처

```
┌─────────────────────────────────────────────┐
│  Claude Code / Agent                        │
│  ↓ MCP 호출                                 │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  Progressive Loader MCP Server              │
│  ┌─────────────────────────────────────┐   │
│  │ HybridSearchService                 │   │
│  │ ├─ VectorSearchService (ChromaDB)   │   │
│  │ └─ GraphSearchService (JSON Graph)  │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│  ChromaDB     │       │  Knowledge    │
│  Vector DB    │       │  Graph JSON   │
└───────────────┘       └───────────────┘
```

## 성능

### 토큰 절약

| 쿼리 유형 | 반환 도구 수 | 토큰 절약 | 설명 |
|----------|-------------|----------|------|
| n8n 워크플로우 | 7-9 | 89-92% | mcpCli + relatedSkills 포함 |
| TikTok 데이터 | 5-7 | 92-94% | 데이터 조회 + Excel 작업 |
| Excel 리포트 | 3-5 | 94-96% | 최소한의 도구만 반환 |

### Progressive Disclosure 효과

| 항목 | 전체 로드 | Progressive | 절약 |
|------|----------|------------|------|
| MCP 서버 1개 | 800 tokens | 200 tokens (mcpCli만) | 75% |
| 스킬 4개 | 12,000 tokens | 400 tokens (메타만) | 96.7% |
| **Total** | **89,600 tokens** | **~7,000 tokens** | **92%** |

💡 **핵심**: 스킬 전체 내용은 Claude가 `Skill()` 호출 시에만 로드

## Memory 기반 Agent 위임과 통합

이 MCP 서버는 Memory 기반 Agent 위임 아키텍처와 함께 사용할 수 있습니다:

```
Main AI:
  "Memory #project-id 참조, progressive_search_tools로
   필요한 도구 찾아서 작업해" (20 토큰)

Agent:
  1. Memory에서 프로젝트 맥락 읽기
  2. progressive_search_tools 호출 → 관련 도구 목록
  3. 필요한 도구만 컨텍스트에 로딩
  4. 작업 실행
```

## 개발

### 빌드 및 실행

```bash
# 개발 모드 (자동 리로드)
npm run dev

# 빌드
npm run build

# 실행
npm start
```

### 테스트

```bash
# Phase 1 테스트 (mcp-cli 정보)
npm run test:phase1

# Phase 2 테스트 (relatedSkills)
npm run test:phase2

# ChromaDB 확인
/root/.claude-memory/venv/bin/python3 scripts/check-chromadb.py
```

### 데이터 업데이트

```bash
# 전체 업데이트 (Phase 1 + Phase 2)
./scripts/run-all.sh

# Phase 1만 (mcp-cli 사용법)
/root/.claude-memory/venv/bin/python3 scripts/1-extract-mcp-cli-usage.py

# Phase 2만 (스킬 메타데이터)
/root/.claude-memory/venv/bin/python3 scripts/2-add-skill-metadata.py
```

## 의존성

- `@modelcontextprotocol/sdk`: MCP 프로토콜 구현
- `zod`: 입력 스키마 검증
- ChromaDB (Python): 벡터 검색 백엔드

## 라이선스

ISC
