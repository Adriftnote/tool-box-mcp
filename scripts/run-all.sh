#!/bin/bash
##############################################################################
# Progressive Loader - 전체 데이터 업데이트 스크립트
#
# ChromaDB와 Knowledge Graph를 최신 상태로 업데이트합니다.
#
# 실행 순서:
#   1. Phase 1: mcp-cli 사용법 추출 및 ChromaDB 업데이트
#   2. Phase 2: 스킬 메타데이터 추가
#
# 사용법:
#   ./scripts/run-all.sh
##############################################################################

set -e  # 에러 발생 시 즉시 종료

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Python 경로
PYTHON="/root/.claude-memory/venv/bin/python3"

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Progressive Loader - Data Update${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Python 환경 확인
echo -e "${YELLOW}[1/4]${NC} Python 환경 확인..."
if ! command -v "$PYTHON" &> /dev/null; then
    echo -e "${RED}❌ Python venv not found: $PYTHON${NC}"
    echo -e "${YELLOW}Please create venv first:${NC}"
    echo -e "  python3 -m venv /root/.claude-memory/venv"
    echo -e "  /root/.claude-memory/venv/bin/pip install chromadb"
    exit 1
fi

# ChromaDB 확인
if ! "$PYTHON" -c "import chromadb" &> /dev/null; then
    echo -e "${RED}❌ ChromaDB not installed${NC}"
    echo -e "${YELLOW}Installing ChromaDB...${NC}"
    "$PYTHON" -m pip install chromadb
fi

echo -e "${GREEN}✅ Python environment OK${NC}"
echo ""

# Phase 1: mcp-cli 사용법 추출
echo -e "${YELLOW}[2/4]${NC} Phase 1: Extracting mcp-cli usage..."
if ! "$PYTHON" "$SCRIPT_DIR/1-extract-mcp-cli-usage.py"; then
    echo -e "${RED}❌ Phase 1 failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Phase 1 complete${NC}"
echo ""

# Phase 2: 스킬 메타데이터 추가
echo -e "${YELLOW}[3/4]${NC} Phase 2: Adding skill metadata..."
if ! "$PYTHON" "$SCRIPT_DIR/2-add-skill-metadata.py"; then
    echo -e "${RED}❌ Phase 2 failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Phase 2 complete${NC}"
echo ""

# 최종 확인
echo -e "${YELLOW}[4/4]${NC} Verifying ChromaDB..."
if ! "$PYTHON" "$SCRIPT_DIR/check-chromadb.py"; then
    echo -e "${RED}❌ Verification failed${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ All updates complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}ChromaDB 위치:${NC} /root/.claude-mem/vector-db"
echo -e "${BLUE}Knowledge Graph:${NC} /root/.claude-memory/knowledge-graph.json"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Test with: npm run test:phase1"
echo -e "  2. Test with: npm run test:phase2"
echo -e "  3. Start MCP server: npm start"
echo ""
