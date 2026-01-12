#!/usr/bin/env python3
"""
Search skills by relatedTo field in ChromaDB

Usage:
    python search-skills-by-related.py "tool1,tool2,tool3"

Example:
    python search-skills-by-related.py "sqlite_tiktok,pandas-excel"

Returns:
    JSON array of skills that have relatedTo containing any of the given tools
    Only returns metadata (name, summary, when, tokenSize), NOT full content
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

def search_skills_by_related(tool_names: list) -> list:
    """Search for skills that have relatedTo containing any of the given tools"""
    collection = get_collection()

    # Get all items (ChromaDB doesn't support complex where queries on JSON arrays)
    results = collection.get(
        include=["metadatas"]
    )

    if not results["ids"]:
        return []

    # Normalize tool names for matching
    tool_names_lower = [t.lower().strip() for t in tool_names]

    skills = []
    for i, id in enumerate(results["ids"]):
        metadata = results["metadatas"][i]

        # Only process Skills
        if metadata.get("type") != "Skill":
            continue

        # Check relatedTo field
        related_to = metadata.get("relatedTo")
        if not related_to:
            continue

        # Parse relatedTo if it's a JSON string
        try:
            if isinstance(related_to, str):
                related_to = json.loads(related_to)
        except:
            continue

        if not isinstance(related_to, list):
            continue

        # Check if any tool name matches
        related_to_lower = [r.lower().strip() for r in related_to]
        if not any(t in related_to_lower for t in tool_names_lower):
            continue

        # Extract skillMeta
        skill_meta = metadata.get("skillMeta")
        if skill_meta:
            try:
                if isinstance(skill_meta, str):
                    skill_meta = json.loads(skill_meta)
            except:
                skill_meta = {}
        else:
            skill_meta = {}

        skills.append({
            "name": metadata.get("name", id),
            "summary": skill_meta.get("summary", ""),
            "when": skill_meta.get("when", ""),
            "tokenSize": skill_meta.get("tokenSize", 0)
        })

    return skills

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: search-skills-by-related.py <tool1,tool2,...>"}))
        sys.exit(1)

    # Parse comma-separated tool names
    tool_names_str = sys.argv[1]
    tool_names = [t.strip() for t in tool_names_str.split(",") if t.strip()]

    if not tool_names:
        print(json.dumps([]))
        sys.exit(0)

    try:
        results = search_skills_by_related(tool_names)
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
