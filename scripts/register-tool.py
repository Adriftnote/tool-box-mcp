#!/root/.claude-memory/venv/bin/python3
"""
Register/Delete tools in ChromaDB for Progressive Loader
"""

import sys
sys.path.insert(0, '/root/.claude-memory/venv/lib/python3.12/site-packages')

import json
import chromadb
from chromadb.utils import embedding_functions

CHROMA_PATH = "/root/.claude-mem/vector-db"
COLLECTION_NAME = "claude_tools"

EMBEDDING_FUNCTION = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

def get_collection():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=EMBEDDING_FUNCTION
    )

def register_tool(data: dict) -> dict:
    """Register a new tool or update existing one"""
    collection = get_collection()

    tool_id = data.get("id") or data["name"]
    name = data["name"]
    tool_type = data.get("type", "MCP_Server")
    description = data.get("description", "")
    mcp_cli = data.get("mcpCli")
    skill_meta = data.get("skillMeta")

    # Build metadata
    metadata = {
        "name": name,
        "type": tool_type,
        "description": description
    }

    if mcp_cli:
        metadata["mcpCli"] = json.dumps(mcp_cli)

    if skill_meta:
        metadata["skillMeta"] = json.dumps(skill_meta)

    # Check if exists
    existing = collection.get(ids=[tool_id])

    if existing["ids"]:
        # Update
        collection.update(
            ids=[tool_id],
            documents=[description],
            metadatas=[metadata]
        )
        return {"success": True, "action": "updated", "id": tool_id}
    else:
        # Add new
        collection.add(
            ids=[tool_id],
            documents=[description],
            metadatas=[metadata]
        )
        return {"success": True, "action": "added", "id": tool_id}

def delete_tool(tool_id: str) -> dict:
    """Delete a tool from ChromaDB"""
    collection = get_collection()

    existing = collection.get(ids=[tool_id])
    if not existing["ids"]:
        return {"success": False, "error": f"Tool '{tool_id}' not found"}

    collection.delete(ids=[tool_id])
    return {"success": True, "action": "deleted", "id": tool_id}

def list_tools() -> dict:
    """List all registered tools"""
    collection = get_collection()

    # Get all items
    results = collection.get()

    tools = []
    for i, id in enumerate(results["ids"]):
        meta = results["metadatas"][i]
        tools.append({
            "id": id,
            "name": meta.get("name", id),
            "type": meta.get("type", "Unknown"),
            "hasMcpCli": "mcpCli" in meta,
            "hasSkillMeta": "skillMeta" in meta
        })

    # Group by type
    by_type = {}
    for tool in tools:
        t = tool["type"]
        if t not in by_type:
            by_type[t] = []
        by_type[t].append(tool)

    return {
        "success": True,
        "total": len(tools),
        "byType": by_type,
        "tools": tools
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: register-tool.py <action> [data]"}))
        sys.exit(1)

    action = sys.argv[1]

    try:
        if action == "register":
            if len(sys.argv) < 3:
                print(json.dumps({"error": "Missing tool data"}))
                sys.exit(1)
            data = json.loads(sys.argv[2])
            result = register_tool(data)

        elif action == "delete":
            if len(sys.argv) < 3:
                print(json.dumps({"error": "Missing tool ID"}))
                sys.exit(1)
            result = delete_tool(sys.argv[2])

        elif action == "list":
            result = list_tools()

        else:
            result = {"error": f"Unknown action: {action}"}

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
