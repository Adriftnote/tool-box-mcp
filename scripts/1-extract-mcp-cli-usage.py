#!/root/.claude-memory/venv/bin/python3
"""
Extract mcp-cli usage from mcp-cli-tool skill and update ChromaDB
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

# MCP 서버별 사용법 정의 (mcp-cli-tool 스킬 기반)
MCP_SERVERS = {
    "sqlite_instagram": {
        "description": "Instagram Analytics SQLite database",
        "mcpCli": {
            "quickStart": "mcp-cli sqlite_instagram list_tables",
            "examples": [
                "# List all tables",
                "mcp-cli sqlite_instagram list_tables",
                "",
                "# Query data",
                "mcp-cli sqlite_instagram read_query --query \"SELECT * FROM daily_metrics LIMIT 10\"",
                "",
                "# Describe table structure",
                "mcp-cli sqlite_instagram describe_table --table_name \"daily_metrics\""
            ],
            "tools": [
                {"name": "list_tables", "description": "List all tables in database"},
                {"name": "read_query", "description": "Execute SELECT query", "params": ["query"]},
                {"name": "describe_table", "description": "Show table structure", "params": ["table_name"]},
                {"name": "write_query", "description": "Execute INSERT/UPDATE/DELETE", "params": ["query"]},
                {"name": "create_table", "description": "Create new table", "params": ["name", "schema"]}
            ]
        }
    },
    "sqlite_tiktok": {
        "description": "TikTok Analytics SQLite database",
        "mcpCli": {
            "quickStart": "mcp-cli sqlite_tiktok list_tables",
            "examples": [
                "# List all tables",
                "mcp-cli sqlite_tiktok list_tables",
                "",
                "# Query daily metrics",
                "mcp-cli sqlite_tiktok read_query --query \"SELECT date, metric_type, value FROM daily_metrics_atomic WHERE date >= '2024-12-01' ORDER BY date DESC LIMIT 20\"",
                "",
                "# Check table structure",
                "mcp-cli sqlite_tiktok describe_table --table_name \"daily_metrics_atomic\""
            ],
            "tools": [
                {"name": "list_tables", "description": "List all tables"},
                {"name": "read_query", "description": "Execute SELECT query", "params": ["query"]},
                {"name": "describe_table", "description": "Show table structure", "params": ["table_name"]},
                {"name": "write_query", "description": "Execute INSERT/UPDATE/DELETE", "params": ["query"]},
                {"name": "create_table", "description": "Create new table", "params": ["name", "schema"]}
            ]
        }
    },
    "sqlite_dashboard": {
        "description": "Dashboard atomic data SQLite database",
        "mcpCli": {
            "quickStart": "mcp-cli sqlite_dashboard list_tables",
            "examples": [
                "# List all tables",
                "mcp-cli sqlite_dashboard list_tables",
                "",
                "# Query aggregated data",
                "mcp-cli sqlite_dashboard read_query --query \"SELECT * FROM dashboard_master LIMIT 10\"",
                "",
                "# Describe table",
                "mcp-cli sqlite_dashboard describe_table --table_name \"dashboard_master\""
            ],
            "tools": [
                {"name": "list_tables", "description": "List all tables"},
                {"name": "read_query", "description": "Execute SELECT query", "params": ["query"]},
                {"name": "describe_table", "description": "Show table structure", "params": ["table_name"]},
                {"name": "write_query", "description": "Execute INSERT/UPDATE/DELETE", "params": ["query"]},
                {"name": "create_table", "description": "Create new table", "params": ["name", "schema"]}
            ]
        }
    },
    "sqlite_youtube_data": {
        "description": "YouTube Data API SQLite database",
        "mcpCli": {
            "quickStart": "mcp-cli sqlite_youtube_data list_tables",
            "examples": [
                "mcp-cli sqlite_youtube_data list_tables",
                "mcp-cli sqlite_youtube_data read_query --query \"SELECT * FROM videos LIMIT 10\"",
                "mcp-cli sqlite_youtube_data describe_table --table_name \"videos\""
            ],
            "tools": [
                {"name": "list_tables", "description": "List all tables"},
                {"name": "read_query", "description": "Execute SELECT query", "params": ["query"]},
                {"name": "describe_table", "description": "Show table structure", "params": ["table_name"]},
                {"name": "write_query", "description": "Execute INSERT/UPDATE/DELETE", "params": ["query"]},
                {"name": "create_table", "description": "Create new table", "params": ["name", "schema"]}
            ]
        }
    },
    "n8n-workflow-builder": {
        "description": "Create and manage n8n workflows via MCP",
        "mcpCli": {
            "quickStart": "mcp-cli n8n-workflow-builder list_workflows",
            "examples": [
                "# List workflows",
                "mcp-cli n8n-workflow-builder list_workflows",
                "",
                "# Get workflow details",
                "mcp-cli n8n-workflow-builder get_workflow --workflow_id \"123\"",
                "",
                "# Create new workflow",
                "mcp-cli n8n-workflow-builder create_workflow --name \"My Workflow\" --nodes '[...]'",
                "",
                "# Execute workflow",
                "mcp-cli n8n-workflow-builder execute_workflow --workflow_id \"123\""
            ],
            "tools": [
                {"name": "list_workflows", "description": "List all workflows"},
                {"name": "get_workflow", "description": "Get workflow by ID", "params": ["workflow_id"]},
                {"name": "create_workflow", "description": "Create new workflow", "params": ["name", "nodes"]},
                {"name": "update_workflow", "description": "Update existing workflow", "params": ["workflow_id", "nodes"]},
                {"name": "delete_workflow", "description": "Delete workflow", "params": ["workflow_id"]},
                {"name": "execute_workflow", "description": "Execute workflow", "params": ["workflow_id"]},
                {"name": "activate_workflow", "description": "Activate workflow", "params": ["workflow_id"]},
                {"name": "get_execution", "description": "Get execution result", "params": ["execution_id"]},
                {"name": "list_executions", "description": "List workflow executions", "params": ["workflow_id"]}
            ]
        }
    },
    "markitdown": {
        "description": "Convert files to markdown (PDF, Word, Excel, PowerPoint, images, HTML, CSV, JSON, XML)",
        "mcpCli": {
            "quickStart": "mcp-cli markitdown convert_to_markdown --uri \"file:///path/to/file.pdf\"",
            "examples": [
                "# Convert PDF to markdown",
                "mcp-cli markitdown convert_to_markdown --uri \"file:///root/document.pdf\"",
                "",
                "# Convert Word document",
                "mcp-cli markitdown convert_to_markdown --uri \"file:///root/report.docx\"",
                "",
                "# Convert Excel file",
                "mcp-cli markitdown convert_to_markdown --uri \"file:///root/data.xlsx\"",
                "",
                "# Convert from URL",
                "mcp-cli markitdown convert_to_markdown --uri \"https://example.com/page.html\""
            ],
            "tools": [
                {"name": "convert_to_markdown", "description": "Convert file/URL to markdown", "params": ["uri"]}
            ]
        }
    },
    "document-edit": {
        "description": "Create and edit Office documents (Word, Excel, PDF)",
        "mcpCli": {
            "quickStart": "mcp-cli document-edit create_word_document --filepath \"/path/to/doc.docx\" --content \"Hello World\"",
            "examples": [
                "# Create Word document",
                "mcp-cli document-edit create_word_document --filepath \"/root/test.docx\" --content \"Document content here\"",
                "",
                "# Create Excel file",
                "mcp-cli document-edit create_excel_file --filepath \"/root/data.xlsx\" --content '[[\"Name\",\"Value\"],[\"A\",100],[\"B\",200]]'",
                "",
                "# Create PDF",
                "mcp-cli document-edit create_pdf_file --filepath \"/root/report.pdf\" --content \"PDF content here\"",
                "",
                "# Convert Word to PDF",
                "mcp-cli document-edit convert_word_to_pdf --source_path \"/root/doc.docx\" --target_path \"/root/doc.pdf\"",
                "",
                "# Convert CSV to Excel",
                "mcp-cli document-edit convert_csv_to_excel --source_path \"/root/data.csv\" --target_path \"/root/data.xlsx\""
            ],
            "tools": [
                {"name": "create_word_document", "description": "Create Word document", "params": ["filepath", "content"]},
                {"name": "edit_word_document", "description": "Edit Word document", "params": ["filepath", "operations"]},
                {"name": "create_excel_file", "description": "Create Excel file", "params": ["filepath", "content"]},
                {"name": "edit_excel_file", "description": "Edit Excel file", "params": ["filepath", "operations"]},
                {"name": "create_pdf_file", "description": "Create PDF file", "params": ["filepath", "content"]},
                {"name": "convert_txt_to_word", "description": "Convert TXT to Word", "params": ["source_path", "target_path"]},
                {"name": "convert_csv_to_excel", "description": "Convert CSV to Excel", "params": ["source_path", "target_path"]},
                {"name": "convert_word_to_pdf", "description": "Convert Word to PDF", "params": ["source_path", "target_path"]}
            ]
        }
    }
}

def main():
    print("=" * 60)
    print("Updating ChromaDB with mcp-cli usage information")
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

    # 각 MCP 서버별로 업데이트
    updated_count = 0
    added_count = 0

    for server_name, server_info in MCP_SERVERS.items():
        print(f"\n🔄 Processing: {server_name}")

        # 기존 항목 확인
        try:
            existing = collection.get(ids=[server_name])
            if existing['ids']:
                # 업데이트 - mcpCli를 JSON 문자열로 저장
                collection.update(
                    ids=[server_name],
                    metadatas=[{
                        "name": server_name,
                        "type": "MCP_Server",
                        "description": server_info["description"],
                        "mcpCli": json.dumps(server_info["mcpCli"])  # JSON string으로 변환
                    }]
                )
                print(f"   ✅ Updated: {server_name}")
                updated_count += 1
            else:
                raise ValueError("Not found")
        except:
            # 새로 추가 - mcpCli를 JSON 문자열로 저장
            collection.add(
                ids=[server_name],
                documents=[server_info["description"]],
                metadatas=[{
                    "name": server_name,
                    "type": "MCP_Server",
                    "description": server_info["description"],
                    "mcpCli": json.dumps(server_info["mcpCli"])  # JSON string으로 변환
                }]
            )
            print(f"   ✅ Added: {server_name}")
            added_count += 1

    print("\n" + "=" * 60)
    print(f"✅ Complete!")
    print(f"   - Updated: {updated_count}")
    print(f"   - Added: {added_count}")
    print(f"   - Total items: {collection.count()}")
    print("=" * 60)

if __name__ == "__main__":
    main()
