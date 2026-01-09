# Tool Box MCP Server - Windows Setup Script
# Run with: .\scripts\setup.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Tool Box MCP Server Setup (Windows) ===" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Set-Location $ProjectRoot

# Check Python
Write-Host "[1/5] Checking Python..." -ForegroundColor Yellow
$PythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $PythonCmd = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $PythonCmd = "python3"
} else {
    Write-Host "Error: Python not found. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}
$PythonVersion = & $PythonCmd --version
Write-Host "Using: $PythonVersion" -ForegroundColor Green

# Create Python virtual environment
Write-Host ""
Write-Host "[2/5] Creating Python virtual environment..." -ForegroundColor Yellow
$VenvPath = Join-Path $ProjectRoot "venv"
if (-not (Test-Path $VenvPath)) {
    & $PythonCmd -m venv $VenvPath
    Write-Host "Created venv at $VenvPath" -ForegroundColor Green
} else {
    Write-Host "venv already exists" -ForegroundColor Green
}

# Activate venv and install dependencies
Write-Host ""
Write-Host "[3/5] Installing Python dependencies in venv..." -ForegroundColor Yellow
$ActivateScript = Join-Path $VenvPath "Scripts\Activate.ps1"
. $ActivateScript
pip install --quiet --upgrade pip
pip install --quiet chromadb sentence-transformers
Write-Host "Dependencies installed" -ForegroundColor Green

# Create data directory
Write-Host ""
Write-Host "[4/5] Setting up data directory..." -ForegroundColor Yellow
$DataDir = Join-Path $ProjectRoot "data"
$VectorDbDir = Join-Path $DataDir "vector-db"
if (-not (Test-Path $VectorDbDir)) {
    New-Item -ItemType Directory -Path $VectorDbDir -Force | Out-Null
}
Write-Host "Data directory ready" -ForegroundColor Green

# Initialize ChromaDB with sample data
Write-Host ""
Write-Host "[5/5] Initializing ChromaDB..." -ForegroundColor Yellow

$InitScript = @"
import chromadb
import os

project_root = r'$ProjectRoot'
data_dir = os.path.join(project_root, 'data')

# Create ChromaDB client
client = chromadb.PersistentClient(path=os.path.join(data_dir, 'vector-db'))

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
"@

python -c $InitScript

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Edit data\mcp-config.json to add your MCP servers"
Write-Host "2. Edit data\knowledge-graph.json to define tool relationships"
Write-Host "3. Run: npm start"
Write-Host ""
Write-Host "Or use environment variables:" -ForegroundColor White
Write-Host "  TOOLHUB_GRAPH_PATH      - Path to knowledge-graph.json"
Write-Host "  TOOLHUB_MCP_CONFIG      - Path to mcp-config.json"
Write-Host "  TOOLHUB_PYTHON_PATH     - Python interpreter path"
