#!/usr/bin/env python3
"""
Search tools in ChromaDB using vector similarity

Usage:
    python search-tools.py "query string" [limit]

Example:
    python search-tools.py "excel file creation" 5

Returns:
    JSON array of matching tools with similarity scores
"""

import sys
import os
import glob

# 프로젝트 루트 경로 (스크립트 위치 기준)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# venv site-packages 경로 자동 탐색 (Cross-platform)
def find_venv_site_packages():
    # Windows 경로 먼저 확인
    win_path = os.path.join(PROJECT_ROOT, "venv", "Lib", "site-packages")
    if os.path.exists(win_path):
        return win_path
    # Linux/Mac 경로
    unix_lib = os.path.join(PROJECT_ROOT, "venv", "lib")
    if os.path.exists(unix_lib):
        site_packages = glob.glob(os.path.join(unix_lib, "python*/site-packages"))
        if site_packages:
            return site_packages[0]
    return None

venv_site_packages = find_venv_site_packages()
if venv_site_packages:
    sys.path.insert(0, venv_site_packages)

import json
import chromadb
from chromadb.utils import embedding_functions

# ChromaDB 설정
CHROMA_PATH = os.path.join(PROJECT_ROOT, "data", "vector-db")
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

def search_tools(query: str, limit: int = 5) -> list:
    """Search for tools using vector similarity"""
    collection = get_collection()

    # Query ChromaDB
    results = collection.query(
        query_texts=[query],
        n_results=limit,
        include=["documents", "metadatas", "distances"]
    )

    if not results["ids"] or not results["ids"][0]:
        return []

    tools = []
    for i, id in enumerate(results["ids"][0]):
        metadata = results["metadatas"][0][i]
        distance = results["distances"][0][i]

        # Convert distance to similarity (ChromaDB uses L2 distance by default)
        # Similarity = 1 / (1 + distance) for a 0-1 scale
        similarity = 1 / (1 + distance)

        tool = {
            "name": metadata.get("name", id),
            "type": metadata.get("type", "Tool"),
            "description": metadata.get("description", results["documents"][0][i] if results["documents"] else ""),
            "similarity": round(similarity, 4)
        }

        # Add optional fields if present
        if "mcpCli" in metadata:
            try:
                tool["mcpCli"] = json.loads(metadata["mcpCli"])
            except:
                tool["mcpCli"] = metadata["mcpCli"]

        if "skillMeta" in metadata:
            try:
                tool["skillMeta"] = json.loads(metadata["skillMeta"])
            except:
                tool["skillMeta"] = metadata["skillMeta"]

        # Template-specific fields
        if "instances" in metadata:
            try:
                tool["instances"] = json.loads(metadata["instances"])
            except:
                tool["instances"] = metadata["instances"]

        if "mcpCliPattern" in metadata:
            tool["mcpCliPattern"] = metadata["mcpCliPattern"]

        if "tools" in metadata:
            try:
                tool["tools"] = json.loads(metadata["tools"])
            except:
                tool["tools"] = metadata["tools"]

        if "examples" in metadata:
            try:
                tool["examples"] = json.loads(metadata["examples"])
            except:
                tool["examples"] = metadata["examples"]

        tools.append(tool)

    return tools

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: search-tools.py <query> [limit]"}))
        sys.exit(1)

    query = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 5

    try:
        results = search_tools(query, limit)
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
