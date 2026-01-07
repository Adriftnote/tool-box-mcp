#!/root/.claude-memory/venv/bin/python3
"""
Migrate individual SQLite MCP servers to a single template with instances
"""

import sys
sys.path.insert(0, '/root/.claude-memory/venv/lib/python3.12/site-packages')

import chromadb
import json
from chromadb.utils import embedding_functions

# ChromaDB 경로
CHROMA_PATH = "/root/.claude-mem/vector-db"
COLLECTION_NAME = "claude_tools"

# Embedding function
EMBEDDING_FUNCTION = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

# 기존 SQLite 서버 목록 (삭제 대상)
OLD_SQLITE_SERVERS = [
    "sqlite_tiktok",
    "sqlite_instagram",
    "sqlite_dashboard",
    "sqlite_youtube_data"
]

# 새로운 SQLite 템플릿
SQLITE_TEMPLATE = {
    "name": "sqlite",
    "type": "MCP_Server_Template",
    "description": "SQLite database query server. Available databases: tiktok (TikTok Analytics), instagram (Instagram Analytics), dashboard (Dashboard atomic data), youtube_data (YouTube Data API)",
    "instances": [
        {"name": "sqlite_tiktok", "alias": "tiktok", "description": "TikTok Analytics - daily_metrics_atomic, video performance"},
        {"name": "sqlite_instagram", "alias": "instagram", "description": "Instagram Analytics - daily_metrics, engagement data"},
        {"name": "sqlite_dashboard", "alias": "dashboard", "description": "Dashboard aggregated data - dashboard_master"},
        {"name": "sqlite_youtube_data", "alias": "youtube_data", "description": "YouTube Data API - videos, channels"}
    ],
    "tools": [
        {"name": "list_tables", "description": "List all tables in database"},
        {"name": "read_query", "description": "Execute SELECT query", "params": ["query"]},
        {"name": "describe_table", "description": "Show table structure", "params": ["table_name"]},
        {"name": "write_query", "description": "Execute INSERT/UPDATE/DELETE", "params": ["query"]},
        {"name": "create_table", "description": "Create new table", "params": ["name", "schema"]}
    ],
    "mcpCliPattern": "mcp-cli sqlite_{instance} {tool} [--params]",
    "examples": [
        "mcp-cli sqlite_tiktok list_tables",
        "mcp-cli sqlite_instagram read_query --query \"SELECT * FROM daily_metrics LIMIT 10\"",
        "mcp-cli sqlite_dashboard describe_table --table_name \"dashboard_master\""
    ],
    "keywords": ["sqlite", "database", "query", "SQL", "analytics", "tiktok", "instagram", "youtube", "dashboard"]
}

def main():
    print("=" * 60)
    print("Migrating SQLite servers to Template")
    print("=" * 60)

    # ChromaDB 연결
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = client.get_collection(
        name=COLLECTION_NAME,
        embedding_function=EMBEDDING_FUNCTION
    )

    print(f"\n📊 Current items: {collection.count()}")

    # 1. 기존 SQLite 서버 삭제
    print("\n🗑️  Removing old SQLite servers...")
    deleted = 0
    for server_name in OLD_SQLITE_SERVERS:
        try:
            existing = collection.get(ids=[server_name])
            if existing['ids']:
                collection.delete(ids=[server_name])
                print(f"   ✅ Deleted: {server_name}")
                deleted += 1
            else:
                print(f"   ⏭️  Not found: {server_name}")
        except Exception as e:
            print(f"   ❌ Error deleting {server_name}: {e}")

    print(f"\n   Total deleted: {deleted}")

    # 2. 새 템플릿 추가
    print("\n➕ Adding SQLite template...")

    metadata = {
        "name": SQLITE_TEMPLATE["name"],
        "type": SQLITE_TEMPLATE["type"],
        "description": SQLITE_TEMPLATE["description"],
        "instances": json.dumps(SQLITE_TEMPLATE["instances"]),
        "tools": json.dumps(SQLITE_TEMPLATE["tools"]),
        "mcpCliPattern": SQLITE_TEMPLATE["mcpCliPattern"],
        "examples": json.dumps(SQLITE_TEMPLATE["examples"]),
        "keywords": json.dumps(SQLITE_TEMPLATE["keywords"])
    }

    # 검색용 document (description + instances 정보)
    document = f"{SQLITE_TEMPLATE['description']}. Tools: {', '.join([t['name'] for t in SQLITE_TEMPLATE['tools']])}"

    try:
        collection.add(
            ids=[SQLITE_TEMPLATE["name"]],
            documents=[document],
            metadatas=[metadata]
        )
        print(f"   ✅ Added: {SQLITE_TEMPLATE['name']} (type: {SQLITE_TEMPLATE['type']})")
    except Exception as e:
        # 이미 존재하면 업데이트
        collection.update(
            ids=[SQLITE_TEMPLATE["name"]],
            documents=[document],
            metadatas=[metadata]
        )
        print(f"   ✅ Updated: {SQLITE_TEMPLATE['name']}")

    # 3. 결과 확인
    print("\n" + "=" * 60)
    print("Migration Complete!")
    print("=" * 60)

    final_count = collection.count()
    print(f"\n📊 Final items: {final_count}")
    print(f"   - Deleted: {deleted} individual servers")
    print(f"   - Added: 1 template")
    print(f"   - Net change: {1 - deleted}")

    # 새 템플릿 확인
    result = collection.get(ids=["sqlite"])
    if result['ids']:
        print(f"\n✅ Template verified:")
        meta = result['metadatas'][0]
        print(f"   Type: {meta['type']}")
        instances = json.loads(meta['instances'])
        print(f"   Instances: {[i['alias'] for i in instances]}")

if __name__ == "__main__":
    main()
