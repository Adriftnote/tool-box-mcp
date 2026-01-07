#!/root/.claude-memory/venv/bin/python3
"""
Add skill metadata to ChromaDB (summary only, not full content)
"""

import sys
sys.path.insert(0, '/root/.claude-memory/venv/lib/python3.12/site-packages')

import chromadb
import json
from pathlib import Path
from chromadb.utils import embedding_functions

# ChromaDB 경로
CHROMA_PATH = "/root/.claude-mem/vector-db"
COLLECTION_NAME = "claude_tools"

# Embedding function (search-tools.py와 동일)
EMBEDDING_FUNCTION = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

# 스킬 메타데이터 정의 (전체 내용은 넣지 않음!)
SKILLS = [
    {
        "name": "n8n-node-templates",
        "type": "Skill",
        "description": "n8n 노드 타입 80+ 템플릿 (HTTP Request, Set, IF, Switch, Code 등)",
        "summary": "n8n 노드 80+ 템플릿",
        "when": "n8n 워크플로우 JSON 생성 시",
        "tokenSize": 3000,
        "keywords": ["HTTP Request", "Set", "IF", "Switch", "Code", "n8n", "workflow", "nodes"],
        "relatedTo": ["n8n-workflow-builder"]
    },
    {
        "name": "n8n-expressions",
        "type": "Skill",
        "description": "n8n Expression 패턴 검증됨 ($json, $node, DateTime.now() 문법, Luxon 날짜 처리)",
        "summary": "n8n Expression 패턴",
        "when": "n8n Expression 문법 확인 시",
        "tokenSize": 2000,
        "keywords": ["$json", "$node", "DateTime", "Luxon", "expression", "n8n"],
        "relatedTo": ["n8n-workflow-builder"]
    },
    {
        "name": "pandas-excel-작업",
        "type": "Skill",
        "description": "Pandas DataFrame ↔ Excel 변환 (openpyxl 엔진, 한글 처리 포함)",
        "summary": "Pandas Excel 읽기/쓰기",
        "when": "Excel 파일 읽기/쓰기 시",
        "tokenSize": 2500,
        "keywords": ["pandas", "excel", "openpyxl", "DataFrame", "한글", "export"],
        "relatedTo": ["sqlite_tiktok", "sqlite_instagram", "sqlite_dashboard"]
    },
    {
        "name": "python-한글처리",
        "type": "Skill",
        "description": "PYTHONIOENCODING=utf-8 설정, 한글 파일명/컬럼명 처리, Windows 환경 한글 인코딩 문제 해결",
        "summary": "Python 한글 인코딩 처리",
        "when": "한글 파일명/데이터 처리 시",
        "tokenSize": 1500,
        "keywords": ["한글", "encoding", "utf-8", "PYTHONIOENCODING", "Windows"],
        "relatedTo": ["pandas-excel-작업"]
    },
    {
        "name": "데이터-구조-파악",
        "type": "Skill",
        "description": "새 데이터 파일 구조 분석 (컬럼 타입, 누락값, 패턴 파악, Excel/CSV/JSON 지원)",
        "summary": "데이터 파일 구조 분석",
        "when": "새 데이터 소스 탐색 시",
        "tokenSize": 2000,
        "keywords": ["data analysis", "schema", "columns", "types", "pandas"],
        "relatedTo": ["sqlite_tiktok", "sqlite_instagram", "pandas-excel-작업"]
    },
    {
        "name": "metabase-dashboard",
        "type": "Skill",
        "description": "Metabase 대시보드 생성 자동화 (차트 배치 최적화, SQL 쿼리 자동 생성)",
        "summary": "Metabase 대시보드 생성",
        "when": "데이터 시각화 대시보드 생성 시",
        "tokenSize": 3500,
        "keywords": ["metabase", "dashboard", "visualization", "charts", "SQL"],
        "relatedTo": ["sqlite_tiktok", "sqlite_instagram", "sqlite_dashboard"]
    },
    # === 추가된 스킬들 ===
    {
        "name": "skill-creator",
        "type": "Skill",
        "description": "Guide for creating effective skills that extend Claude's capabilities with specialized knowledge, workflows, or tool integrations",
        "summary": "스킬 생성 가이드",
        "when": "새 스킬 생성 또는 기존 스킬 업데이트 시",
        "tokenSize": 4000,
        "keywords": ["skill", "create", "workflow", "domain expertise", "tool integration"],
        "relatedTo": []
    },
    {
        "name": "mcp-builder",
        "type": "Skill",
        "description": "Guide for creating high-quality MCP servers that enable LLMs to interact with external services through well-designed tools",
        "summary": "MCP 서버 개발 가이드",
        "when": "MCP 서버 개발 또는 외부 API 통합 시",
        "tokenSize": 5000,
        "keywords": ["MCP", "server", "API", "FastMCP", "tools", "integration"],
        "relatedTo": ["n8n-workflow-builder"]
    },
    {
        "name": "context-optimization",
        "type": "Skill",
        "description": "Apply optimization techniques to extend effective context capacity through compression, masking, caching, and partitioning",
        "summary": "컨텍스트 최적화 기법",
        "when": "컨텍스트 제한으로 성능이 저하될 때",
        "tokenSize": 3500,
        "keywords": ["context", "optimization", "compression", "tokens", "cost reduction"],
        "relatedTo": ["context-fundamentals", "context-compression"]
    },
    {
        "name": "context-fundamentals",
        "type": "Skill",
        "description": "Understand the components, mechanics, and constraints of context in agent systems",
        "summary": "컨텍스트 엔지니어링 기초",
        "when": "에이전트 아키텍처 설계 또는 컨텍스트 관련 디버깅 시",
        "tokenSize": 3000,
        "keywords": ["context", "fundamentals", "agent", "architecture", "debugging"],
        "relatedTo": ["context-optimization", "context-degradation"]
    },
    {
        "name": "context-compression",
        "type": "Skill",
        "description": "Design and evaluate context compression strategies for long-running agent sessions",
        "summary": "컨텍스트 압축 전략",
        "when": "에이전트 세션이 컨텍스트 윈도우 제한 초과 시",
        "tokenSize": 3000,
        "keywords": ["context", "compression", "summarization", "tokens-per-task"],
        "relatedTo": ["context-optimization", "context-degradation"]
    },
    {
        "name": "context-degradation",
        "type": "Skill",
        "description": "Recognize, diagnose, and mitigate patterns of context degradation in agent systems",
        "summary": "컨텍스트 품질 저하 패턴",
        "when": "긴 대화에서 에이전트 성능 저하 시",
        "tokenSize": 2500,
        "keywords": ["context", "degradation", "debugging", "performance", "failures"],
        "relatedTo": ["context-fundamentals", "context-compression"]
    },
    {
        "name": "tool-design",
        "type": "Skill",
        "description": "Design tools that agents can use effectively, including when to reduce tool complexity",
        "summary": "에이전트용 도구 설계",
        "when": "에이전트용 새 도구 생성 또는 최적화 시",
        "tokenSize": 3500,
        "keywords": ["tool", "design", "agent", "API", "LLM"],
        "relatedTo": ["mcp-builder"]
    },
    {
        "name": "evaluation",
        "type": "Skill",
        "description": "Build evaluation frameworks for agent systems to test performance and validate context engineering choices",
        "summary": "에이전트 평가 프레임워크",
        "when": "에이전트 성능 테스트 또는 개선 측정 시",
        "tokenSize": 3000,
        "keywords": ["evaluation", "testing", "agent", "performance", "metrics"],
        "relatedTo": ["advanced-evaluation"]
    },
    {
        "name": "advanced-evaluation",
        "type": "Skill",
        "description": "Master LLM-as-a-Judge evaluation techniques including direct scoring, pairwise comparison, rubric generation, and bias mitigation",
        "summary": "LLM-as-a-Judge 평가 기법",
        "when": "LLM 출력 품질 평가 시스템 구축 시",
        "tokenSize": 4000,
        "keywords": ["LLM-as-Judge", "evaluation", "scoring", "comparison", "bias"],
        "relatedTo": ["evaluation"]
    },
    {
        "name": "memory-systems",
        "type": "Skill",
        "description": "Design and implement memory architectures for agent systems that persist state across sessions",
        "summary": "에이전트 메모리 아키텍처",
        "when": "세션 간 상태 유지가 필요한 에이전트 구축 시",
        "tokenSize": 4000,
        "keywords": ["memory", "persistence", "knowledge graph", "vector store", "RAG"],
        "relatedTo": []
    },
    {
        "name": "multi-agent-patterns",
        "type": "Skill",
        "description": "Design multi-agent architectures for complex tasks when single-agent context limits are exceeded",
        "summary": "멀티 에이전트 아키텍처 패턴",
        "when": "단일 에이전트로 복잡한 작업 수행이 어려울 때",
        "tokenSize": 3500,
        "keywords": ["multi-agent", "architecture", "parallel", "subtasks", "coordination"],
        "relatedTo": []
    },
    {
        "name": "project-development",
        "type": "Skill",
        "description": "Design and build LLM-powered projects from ideation through deployment",
        "summary": "LLM 프로젝트 개발 방법론",
        "when": "새 LLM 프로젝트 시작 또는 아키텍처 설계 시",
        "tokenSize": 3500,
        "keywords": ["project", "development", "LLM", "architecture", "deployment"],
        "relatedTo": []
    },
    {
        "name": "mcp-cli-tool",
        "type": "Skill",
        "description": "thedotmack/mcp-client-cli로 MCP 서버를 Bash로 호출하여 토큰 절약, LazyToolLoader 패턴으로 캐싱 지원",
        "summary": "MCP CLI 토큰 절약 도구",
        "when": "MCP 토큰(46k+)을 절약하고 싶을 때",
        "tokenSize": 2000,
        "keywords": ["mcp", "cli", "token", "cache", "LazyToolLoader"],
        "relatedTo": ["mcp-builder", "n8n-workflow-builder"]
    },
    {
        "name": "jarvis",
        "type": "Skill",
        "description": "FLEETING 노트 캡처 스킬. 대화 중 인사이트를 Zettelkasten 형식으로 저장",
        "summary": "Fleeting 노트 캡처",
        "when": "대화 중 인사이트를 기록할 때",
        "tokenSize": 1500,
        "keywords": ["note", "fleeting", "zettelkasten", "capture", "저장"],
        "relatedTo": []
    }
]

def main():
    print("=" * 60)
    print("Adding Skill Metadata to ChromaDB")
    print("=" * 60)

    # ChromaDB 연결
    client = chromadb.PersistentClient(path=CHROMA_PATH)

    try:
        collection = client.get_collection(
            name=COLLECTION_NAME,
            embedding_function=EMBEDDING_FUNCTION
        )
        print(f"\n✅ Collection '{COLLECTION_NAME}' found")
    except:
        print(f"\n❌ Collection '{COLLECTION_NAME}' not found")
        print("Creating new collection...")
        collection = client.create_collection(
            name=COLLECTION_NAME,
            embedding_function=EMBEDDING_FUNCTION
        )

    # 현재 저장된 데이터 확인
    print(f"\n📊 Current items in collection: {collection.count()}")

    # 각 스킬별로 추가/업데이트
    added_count = 0
    updated_count = 0

    for skill in SKILLS:
        print(f"\n🔄 Processing: {skill['name']}")

        # 메타데이터 준비 (전체 내용은 넣지 않음!)
        metadata = {
            "name": skill["name"],
            "type": skill["type"],
            "description": skill["description"],
            "summary": skill["summary"],
            "when": skill["when"],
            "tokenSize": skill["tokenSize"],
            "keywords": json.dumps(skill["keywords"]),  # JSON 문자열로
            "relatedTo": json.dumps(skill["relatedTo"])  # JSON 문자열로
        }

        # 기존 항목 확인
        try:
            existing = collection.get(ids=[skill['name']])
            if existing['ids']:
                # 업데이트
                collection.update(
                    ids=[skill['name']],
                    metadatas=[metadata]
                )
                print(f"   ✅ Updated: {skill['name']}")
                updated_count += 1
            else:
                raise ValueError("Not found")
        except:
            # 새로 추가
            collection.add(
                ids=[skill['name']],
                documents=[skill['description']],
                metadatas=[metadata]
            )
            print(f"   ✅ Added: {skill['name']}")
            added_count += 1

    print("\n" + "=" * 60)
    print(f"✅ Complete!")
    print(f"   - Updated: {updated_count}")
    print(f"   - Added: {added_count}")
    print(f"   - Total items: {collection.count()}")
    print("\n💡 Note: Only metadata added, NOT full skill content!")
    print("   Full content (3000+ tokens) loaded via Skill() when needed")
    print("=" * 60)

if __name__ == "__main__":
    main()
