# Progressive Loader - 실제 구현 계획

**작성일**: 2026-01-05
**목적**: 토큰 효율적으로 여러 MCP 사용하기

---

## 현재 상황 정리

### ✅ 작동하는 것:
1. **Progressive Loader MCP 서버**: 도구 검색 OK
2. **mcp-cli**: 설치되어 있음 (fix/lazy-tool-loader-pattern)
3. **mcp-cli-tool 스킬**: 사용법 문서화되어 있음
4. **ChromaDB**: 도구 메타데이터 저장됨 (11개)
5. **Knowledge Graph**: 도구 관계 저장됨

### ❌ 작동하지 않는 것:
1. **도구 호출 정보 없음**: Progressive Loader가 이름만 반환
2. **mcp-cli 연동 없음**: mcp-cli 사용법을 안 알려줌
3. **스킬 연동 없음**: 관련 스킬을 안 알려줌
4. **스키마 없음**: ChromaDB에 tool schema 없음

---

## 문제의 핵심

```
현재:
Progressive Loader → "sqlite_tiktok 써" (이름만)
Claude → "어떻게?" → Bash/Python 우회 ❌

원하는 것:
Progressive Loader → "mcp-cli sqlite_tiktok list_tables" (사용법)
Claude → mcp-cli 실행 ✅
```

---

## 해결 방법

### 1. ChromaDB에 mcp-cli 사용법 추가

**현재 저장:**
```json
{
  "name": "sqlite_tiktok",
  "type": "MCP_Server",
  "description": "TikTok Analytics SQLite..."
}
```

**추가할 것:**
```json
{
  "name": "sqlite_tiktok",
  "type": "MCP_Server",
  "description": "...",

  "mcpCli": {
    "examples": [
      "mcp-cli sqlite_tiktok list_tables",
      "mcp-cli sqlite_tiktok read_query --query 'SELECT...'",
      "mcp-cli sqlite_tiktok describe_table --table_name '...'"
    ],
    "quickStart": "mcp-cli sqlite_tiktok list_tables"
  },

  "tools": [
    {"name": "list_tables"},
    {"name": "read_query", "params": ["query"]},
    {"name": "describe_table", "params": ["table_name"]}
  ]
}
```

---

### 2. 스킬은 메타데이터만 (Progressive Disclosure)

**문제**: 스킬은 3000+ tokens. 전체 내용 넣으면 토큰 폭발

**해결**: 3단계 Progressive Disclosure

#### Level 1: 도구 발견 (Progressive Loader)
```json
{
  "tools": [
    {
      "name": "n8n-workflow-builder",
      "mcpCli": {
        "quickStart": "mcp-cli n8n-workflow-builder ..."
      }
    }
  ],
  "relatedSkills": [  // ← 이름만!
    {
      "name": "n8n-node-templates",
      "summary": "n8n 노드 80+ 템플릿",
      "when": "워크플로우 JSON 생성 시",
      "tokenSize": 3000
    }
  ]
}
```
→ **200-500 tokens**

#### Level 2: 스킬 메타데이터 (Optional)
```json
{
  "name": "n8n-node-templates",
  "keywords": ["HTTP Request", "Set", "Code", "IF"],
  "categories": ["노드 구조", "파라미터 설정"],
  "quickReference": {
    "HTTP Request": "API 호출",
    "Set": "데이터 가공",
    "Code": "JavaScript 실행"
  }
}
```
→ **추가 500 tokens** (필요시)

#### Level 3: 스킬 전체 (Skill 호출)
```
Skill(n8n-node-templates)
```
→ **3000+ tokens** (필요할 때만!)

---

### 3. Knowledge Graph 역할

**스킬 전체 내용은 저장 안 함!**

관계만 저장:
```json
{
  "relations": [
    {
      "from": "n8n-workflow-builder",
      "to": "n8n-node-templates",
      "relationType": "REQUIRES",
      "when": "워크플로우 JSON 생성 시",
      "priority": "high"
    }
  ]
}
```

Progressive Loader가 이 관계를 보고:
→ "n8n-workflow-builder 쓴다면 n8n-node-templates 스킬 봐" (이름만)

---

## 구현 단계

### Phase 1: mcp-cli 연동 (우선순위 1)

#### 1.1 mcp-cli-tool 스킬에서 사용법 추출
```python
# scripts/extract-mcp-cli-usage.py

import re

skill_path = "/root/projects/.claude/skills/mcp-cli-tool/skill.md"
with open(skill_path) as f:
    content = f.read()

# 각 MCP 서버별 사용법 추출
servers = {
    "sqlite_tiktok": {
        "examples": [
            "mcp-cli sqlite_tiktok list_tables",
            "mcp-cli sqlite_tiktok read_query --query 'SELECT...'",
            "mcp-cli sqlite_tiktok describe_table --table_name '...'"
        ]
    },
    "sqlite_instagram": {...},
    "sqlite_dashboard": {...}
}

# ChromaDB 업데이트
for server_name, usage in servers.items():
    collection.update(
        ids=[server_name],
        metadatas=[{"mcpCli": usage}]
    )
```

#### 1.2 Progressive Loader 응답 수정
```typescript
// src/index.ts - progressive_get_tool_cluster

const result = await hybridSearch.getToolCluster(query);

// mcpCli 사용법 추가
result.primary = result.primary.map(tool => ({
  ...tool,
  mcpCli: tool.metadata?.mcpCli || null
}));

return {
  content: [{
    type: "text",
    text: JSON.stringify(result, null, 2)
  }]
};
```

---

### Phase 2: 스킬 관계 추가 (우선순위 2)

#### 2.1 Knowledge Graph에 스킬 관계 추가
```json
// knowledge-graph.json

{
  "relations": [
    {
      "from": "n8n-workflow-builder",
      "to": "n8n-node-templates",
      "relationType": "REQUIRES",
      "when": "워크플로우 JSON 생성 시"
    },
    {
      "from": "sqlite_tiktok",
      "to": "pandas-excel-작업",
      "relationType": "BENEFITS_FROM",
      "when": "Excel 리포트 생성 시"
    }
  ]
}
```

#### 2.2 ChromaDB에 스킬 메타데이터 추가
```python
# scripts/add-skill-metadata.py

skills = [
    {
        "name": "n8n-node-templates",
        "type": "Skill",
        "summary": "n8n 노드 80+ 템플릿",
        "tokenSize": 3000,
        "keywords": ["HTTP Request", "Set", "Code", "IF"],
        "quickReference": {
            "HTTP Request": "API 호출 노드",
            "Set": "데이터 가공 노드",
            "Code": "JavaScript 실행"
        }
    }
]

# ChromaDB 업데이트 (전체 내용은 넣지 않음!)
collection.add(
    documents=[s['summary'] for s in skills],
    metadatas=skills,
    ids=[s['name'] for s in skills]
)
```

#### 2.3 Progressive Loader 응답에 relatedSkills 추가
```typescript
// HybridSearchService

async getToolCluster(query: string): Promise<ToolCluster> {
  // 1. Primary tools 검색
  const primaryTools = await this.vectorSearch.search(query, 10);

  // 2. Skills 관계 확인
  const relatedSkills = [];
  for (const tool of primaryTools) {
    const skillRelations = this.graphSearch.getRelations(
      tool.name,
      { targetTypes: ["Skill"] }
    );

    for (const rel of skillRelations) {
      relatedSkills.push({
        name: rel.to,
        summary: this.getSkillSummary(rel.to),
        when: rel.when,
        priority: rel.priority
      });
    }
  }

  return {
    primary: primaryTools,
    dependencies: [...],
    relatedSkills: relatedSkills,  // ← 추가!
    stats: {...}
  };
}
```

---

### Phase 3: 데이터 수집 자동화 (우선순위 3)

#### 3.1 스크립트 디렉토리 생성
```
progressive-loader-mcp-server/
└── scripts/
    ├── 1-extract-mcp-cli-usage.py
    ├── 2-add-skill-metadata.py
    ├── 3-update-chromadb.py
    └── run-all.sh
```

#### 3.2 문서 추가
```
progressive-loader-mcp-server/
├── DATA-SETUP.md  ← 새로 작성
└── README.md      ← 업데이트
```

---

## 실행 예시

### Before (현재):
```
User: "TikTok 12월 조회수?"
    ↓
Progressive Loader: {"name": "sqlite_tiktok"}
    ↓
Claude: "어떻게 써?" → Bash/Python 우회
```

### After (구현 후):
```
User: "TikTok 12월 조회수?"
    ↓
Progressive Loader:
{
  "tools": [{
    "name": "sqlite_tiktok",
    "mcpCli": {
      "quickStart": "mcp-cli sqlite_tiktok list_tables",
      "examples": [...]
    }
  }],
  "relatedSkills": [{
    "name": "데이터-구조-파악",
    "summary": "새 데이터 파일 구조 분석",
    "when": "테이블 구조 확인 시"
  }]
}
    ↓
Claude: "mcp-cli sqlite_tiktok list_tables" 실행
    ↓
(필요시) Skill(데이터-구조-파악) 호출
```

---

## 우선순위

| Phase | 작업 | 토큰 절감 효과 | 난이도 |
|-------|------|---------------|--------|
| **Phase 1** | mcp-cli 연동 | ⭐⭐⭐⭐⭐ 즉시 작동 | 쉬움 |
| **Phase 2** | 스킬 관계 추가 | ⭐⭐⭐ Progressive Disclosure | 중간 |
| **Phase 3** | 자동화 스크립트 | ⭐ 유지보수 편의 | 쉬움 |

**권장**: Phase 1부터 시작

---

## 핵심 원칙

### ✅ DO:
1. mcp-cli 사용법을 Progressive Loader 응답에 포함
2. 스킬은 메타데이터만 (이름, 요약, 언제 필요한지)
3. Knowledge Graph는 관계만 저장
4. 필요할 때 Skill() 호출로 전체 로딩

### ❌ DON'T:
1. 스킬 전체 내용을 ChromaDB에 넣지 말 것
2. Progressive Loader 응답에 3000+ tokens 넣지 말 것
3. Knowledge Graph에 스킬 내용 저장하지 말 것

---

## 성공 기준

구현이 성공하려면:

1. ✅ "TikTok 조회수?" 물n
2. ✅ 관련 스킬 이름이 응답에 포함 (전체 내용은 아님)
3. ✅ 필요시 Skill() 호출로 상세 내용 로딩
4. ✅ 전체 토큰 200-500 (스킬 로딩 전)

---

## 다음 단계

1. Phase 1 구현: `scripts/1-extract-mcp-cli-usage.py` 작성
2. ChromaDB 업데이트 실행
3. Progressive Loader 응답 테스트
4. "TikTok 조회수?" 쿼리로 검증
