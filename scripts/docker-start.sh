#!/bin/bash
# ============================================================================
# Docker Quick Start Script - Fire Department Radio Transcription System
# ============================================================================
# This script automates the Docker setup and initialization process
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Fire Department Radio Transcription System - Docker Setup${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker daemon is not running${NC}"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed and running${NC}"
echo ""

# Check if .env file exists
if [ ! -f "nextjs-app/.env" ]; then
    echo -e "${YELLOW}Warning: .env file not found in nextjs-app directory${NC}"
    echo "Creating .env from .env.docker.example..."

    if [ -f ".env.docker.example" ]; then
        cp .env.docker.example nextjs-app/.env
        echo -e "${GREEN}✓ Created nextjs-app/.env${NC}"
        echo -e "${YELLOW}⚠ Please edit nextjs-app/.env and add your OPENAI_API_KEY${NC}"
    else
        echo -e "${RED}Error: .env.docker.example not found${NC}"
        exit 1
    fi
    echo ""
fi

# Stop any existing containers
echo -e "${BLUE}Stopping any existing containers...${NC}"
docker compose down 2>/dev/null || true
echo ""

# Start Docker services
echo -e "${BLUE}Starting Docker services...${NC}"
docker compose up -d

echo ""
echo -e "${BLUE}Waiting for services to be healthy...${NC}"

# Wait for PostgreSQL to be healthy
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec transcriber-postgres pg_isready -U transcriber &>/dev/null; then
        echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2

    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo -e "${RED}Error: PostgreSQL failed to start${NC}"
        docker compose logs postgres
        exit 1
    fi
done

# Wait for Redis to be healthy
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec transcriber-redis redis-cli ping &>/dev/null; then
        echo -e "${GREEN}✓ Redis is ready${NC}"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2

    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo -e "${RED}Error: Redis failed to start${NC}"
        docker compose logs redis
        exit 1
    fi
done

echo ""
echo -e "${BLUE}Checking Prisma setup...${NC}"

# Check if Prisma client is generated
cd nextjs-app

if [ ! -d "node_modules/@prisma/client" ]; then
    echo -e "${YELLOW}Generating Prisma client...${NC}"
    npx prisma generate
    echo -e "${GREEN}✓ Prisma client generated${NC}"
else
    echo -e "${GREEN}✓ Prisma client already exists${NC}"
fi

# Push database schema
echo -e "${BLUE}Pushing database schema...${NC}"
npx prisma db push --skip-generate
echo -e "${GREEN}✓ Database schema synchronized${NC}"

echo ""
echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}Docker Setup Complete!${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo -e "${BLUE}Services Running:${NC}"
echo -e "  ${GREEN}✓${NC} PostgreSQL:  localhost:5432"
echo -e "  ${GREEN}✓${NC} Redis:       localhost:6379"
echo -e "  ${GREEN}✓${NC} pgAdmin:     http://localhost:5050"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Start the Next.js app: ${YELLOW}cd nextjs-app && npm run dev${NC}"
echo -e "  2. Access the app:        ${YELLOW}http://localhost:3000${NC}"
echo -e "  3. View logs:             ${YELLOW}docker compose logs -f${NC}"
echo -e "  4. Stop services:         ${YELLOW}docker compose down${NC}"
echo ""
echo -e "${BLUE}pgAdmin Access:${NC}"
echo -e "  URL:      http://localhost:5050"
echo -e "  Email:    admin@transcriber.local"
echo -e "  Password: admin"
echo ""
echo -e "${YELLOW}Note: Make sure to add your OPENAI_API_KEY in nextjs-app/.env${NC}"
echo ""
