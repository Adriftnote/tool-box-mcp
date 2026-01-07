#!/bin/bash
# Tool Box MCP Server - Setup Script
# This script initializes the required data for the MCP server

set -e

echo "=== Tool Box MCP Server Setup ==="
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check Python
echo "[1/4] Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "Error: Python not found. Please install Python 3.8+"
    exit 1
fi
echo "Using: $($PYTHON_CMD --version)"

# Install Python dependencies
echo ""
echo "[2/4] Installing Python dependencies..."
$PYTHON_CMD -m pip install --quiet chromadb sentence-transformers

# Create data directory
echo ""
echo "[3/4] Setting up data directory..."
mkdir -p "$PROJECT_ROOT/data"

# Initialize ChromaDB with sample data
echo ""
echo "[4/4] Initializing ChromaDB..."
$PYTHON_CMD << 'PYEOF'
import chromadb
import os
import json

project_root = os.environ.get('PROJECT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
data_dir = os.path.join(project_root, 'data')

# Create ChromaDB client
client = chromadb.PersistentClient(path=os.path.join(data_dir, 'chromadb'))

# Create or get collection
collection = client.get_or_create_collection(
    name="tools",
    metadata={"description": "AI tools registry"}
)

# Add sample tools if empty
if collection.count() == 0:
    sample_tools = [
        {
            "id": "example-mcp-server",
            "document": "Example MCP server for demonstration purposes. Use this as a template.",
            "metadata": {"type": "MCP_Server", "name": "example-mcp-server"}
        },
        {
            "id": "example-skill",
            "document": "Example skill for demonstration. Skills provide specialized knowledge.",
            "metadata": {"type": "Skill", "name": "example-skill"}
        }
    ]

    collection.add(
        ids=[t["id"] for t in sample_tools],
        documents=[t["document"] for t in sample_tools],
        metadatas=[t["metadata"] for t in sample_tools]
    )
    print(f"Added {len(sample_tools)} sample tools to ChromaDB")
else:
    print(f"ChromaDB already has {collection.count()} tools")

print("ChromaDB initialized successfully!")
PYEOF

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Edit data/mcp-config.json to add your MCP servers"
echo "2. Edit data/knowledge-graph.json to define tool relationships"
echo "3. Run: npm start"
echo ""
echo "Or use environment variables:"
echo "  TOOLHUB_GRAPH_PATH      - Path to knowledge-graph.json"
echo "  TOOLHUB_MCP_CONFIG      - Path to mcp-config.json"
echo "  TOOLHUB_PYTHON_PATH     - Python interpreter path"
