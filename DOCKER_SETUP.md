# Docker Setup - Fire Department Radio Transcription System

Complete guide for setting up and managing the Docker-based infrastructure for the Fire Department Radio Transcription System.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Service Details](#service-details)
- [Database Setup](#database-setup)
- [Service Management](#service-management)
- [Accessing Services](#accessing-services)
- [Data Persistence](#data-persistence)
- [Development Mode](#development-mode)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)
- [Backup and Restore](#backup-and-restore)

## Overview

The Docker Compose setup provides three core services:

| Service | Purpose | Port | Container Name |
|---------|---------|------|----------------|
| PostgreSQL 16 | Primary database (Prisma ORM) | 5432 | transcriber-postgres |
| Redis 7 | Cache, rate limiting, job queue | 6379 | transcriber-redis |
| pgAdmin 4 | Database management UI (optional) | 5050 | transcriber-pgadmin |

## Prerequisites

### Required Software

- **Docker Desktop**: Version 4.0 or higher
  - Download: https://www.docker.com/products/docker-desktop
- **Docker Compose**: Version 3.9 or higher (included with Docker Desktop)
- **Minimum System Requirements**:
  - 4GB RAM available for Docker
  - 10GB free disk space
  - macOS 10.15+, Windows 10+, or Linux kernel 4.0+

### Verification

Check your Docker installation:

```bash
# Verify Docker is installed and running
docker --version
# Expected: Docker version 24.0.0 or higher

# Verify Docker Compose is available
docker-compose --version
# Expected: Docker Compose version 2.0.0 or higher

# Verify Docker daemon is running
docker ps
# Should return empty list or running containers (no errors)
```

## Quick Start

### 1. Navigate to Project Directory

```bash
cd /Users/aiml/Projects/transcriber
```

### 2. Verify Environment Configuration

Ensure your `.env` file exists in the `nextjs-app` directory with correct connection strings:

```bash
cat nextjs-app/.env | grep -E "(DATABASE_URL|REDIS_URL)"
```

Expected output:
```
DATABASE_URL="postgresql://transcriber:transcriber_password@localhost:5432/transcriber_db?schema=public"
REDIS_URL="redis://localhost:6379"
```

### 3. Start All Services

```bash
docker-compose up -d
```

Expected output:
```
[+] Running 4/4
 ✔ Network transcriber_network        Created
 ✔ Container transcriber-postgres     Started
 ✔ Container transcriber-redis        Started
 ✔ Container transcriber-pgadmin      Started
```

### 4. Verify Services are Running

```bash
docker-compose ps
```

Expected output:
```
NAME                    IMAGE                   STATUS              PORTS
transcriber-pgadmin     dpage/pgadmin4:latest   Up 30 seconds       0.0.0.0:5050->80/tcp
transcriber-postgres    postgres:16-alpine      Up 30 seconds (healthy)   0.0.0.0:5432->5432/tcp
transcriber-redis       redis:7-alpine          Up 30 seconds (healthy)   0.0.0.0:6379->6379/tcp
```

Note: Wait for `(healthy)` status on postgres and redis before proceeding.

### 5. Initialize Database Schema

```bash
cd nextjs-app

# Generate Prisma client
npx prisma generate

# Push schema to database (creates all tables)
npx prisma db push

# Verify database is set up correctly
npx prisma db pull
```

Expected output:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "transcriber_db"

🚀  Your database is now in sync with your Prisma schema.
```

### 6. Start Next.js Application

```bash
npm run dev
```

Access the application at: http://localhost:3000

## Service Details

### PostgreSQL 16

**Purpose**: Primary relational database for storing all application data.

**Configuration**:
- Image: `postgres:16-alpine` (lightweight, production-ready)
- User: `transcriber`
- Password: `transcriber_password`
- Database: `transcriber_db`
- Character Encoding: UTF-8
- Max Connections: 100
- Shared Buffers: 256MB

**Data Models Stored**:
- Incidents (fire department emergency events)
- Transcripts (audio transcriptions with segments)
- Audits (compliance evaluations)
- Templates (compliance frameworks)
- PolicyDocuments (uploaded policy files)
- Units (fire department apparatus)
- SystemMetrics (performance tracking)

**Health Check**:
```bash
docker exec transcriber-postgres pg_isready -U transcriber -d transcriber_db
```

### Redis 7

**Purpose**: High-performance in-memory data store for caching and job tracking.

**Configuration**:
- Image: `redis:7-alpine`
- Persistence: AOF (Append Only File) enabled
- Max Memory: 256MB
- Eviction Policy: allkeys-lru (least recently used)
- Snapshot: Automatic snapshots at intervals

**Use Cases**:
- Rate limiting for OpenAI API calls
- Session caching
- Real-time job queue tracking
- Temporary data storage

**Health Check**:
```bash
docker exec transcriber-redis redis-cli ping
# Expected: PONG
```

### pgAdmin 4

**Purpose**: Web-based PostgreSQL administration tool.

**Configuration**:
- Image: `dpage/pgadmin4:latest`
- Email: `admin@transcriber.local`
- Password: `admin`
- Port: 5050

**Features**:
- Visual database browser
- SQL query editor with syntax highlighting
- Table data viewer and editor
- Query performance analysis
- Database backup and restore

## Database Setup

### Initial Migration

After starting Docker services for the first time:

```bash
cd nextjs-app

# Generate Prisma client types
npx prisma generate

# Create database schema
npx prisma db push

# Optional: Seed database with sample data (if seed script exists)
npx prisma db seed
```

### Viewing Database Schema

```bash
# Open Prisma Studio (visual database browser)
npx prisma studio
```

Access at: http://localhost:5555

### Manual Database Connection

Using psql command-line tool:

```bash
# Connect to database
docker exec -it transcriber-postgres psql -U transcriber -d transcriber_db

# List all tables
\dt

# Describe a specific table
\d incidents

# Exit
\q
```

## Service Management

### Starting Services

```bash
# Start all services in background
docker-compose up -d

# Start specific service
docker-compose up -d postgres

# Start with logs visible (foreground)
docker-compose up
```

### Stopping Services

```bash
# Stop all services (preserves data)
docker-compose down

# Stop specific service
docker-compose stop postgres

# Stop and remove volumes (DELETES ALL DATA!)
docker-compose down -v
```

### Restarting Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart postgres
```

### Viewing Logs

```bash
# View logs from all services
docker-compose logs -f

# View logs from specific service
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f pgadmin

# View last 100 lines
docker-compose logs --tail=100 postgres

# View logs without following
docker-compose logs postgres
```

### Checking Service Status

```bash
# List all containers with status
docker-compose ps

# View detailed container information
docker inspect transcriber-postgres

# Check resource usage
docker stats transcriber-postgres transcriber-redis
```

## Accessing Services

### PostgreSQL Database

**Connection Details**:
```
Host: localhost
Port: 5432
Database: transcriber_db
Username: transcriber
Password: transcriber_password
```

**Connection String**:
```
postgresql://transcriber:transcriber_password@localhost:5432/transcriber_db?schema=public
```

**GUI Clients**:
- pgAdmin 4 (included): http://localhost:5050
- DBeaver: https://dbeaver.io
- TablePlus: https://tableplus.com
- Postico (macOS): https://eggerapps.at/postico

### Redis Cache

**Connection Details**:
```
Host: localhost
Port: 6379
Password: (none - development mode)
```

**Connection String**:
```
redis://localhost:6379
```

**CLI Access**:
```bash
# Connect to Redis CLI
docker exec -it transcriber-redis redis-cli

# Test connection
127.0.0.1:6379> PING
PONG

# List all keys
127.0.0.1:6379> KEYS *

# Get a value
127.0.0.1:6379> GET key_name

# Exit
127.0.0.1:6379> exit
```

**GUI Clients**:
- RedisInsight: https://redis.com/redis-enterprise/redis-insight
- Another Redis Desktop Manager: https://goanother.com

### pgAdmin Database Manager

**Access**: http://localhost:5050

**Login Credentials**:
- Email: `admin@transcriber.local`
- Password: `admin`

**First-Time Setup**:

1. Open http://localhost:5050
2. Login with credentials above
3. Click "Add New Server"
4. **General Tab**:
   - Name: `Transcriber Local`
5. **Connection Tab**:
   - Host: `transcriber-postgres` (container name)
   - Port: `5432`
   - Database: `transcriber_db`
   - Username: `transcriber`
   - Password: `transcriber_password`
6. Click "Save"

## Data Persistence

### Volume Management

All data is stored in named Docker volumes:

```bash
# List all volumes
docker volume ls | grep transcriber

# Expected output:
# transcriber_postgres_data
# transcriber_redis_data
# transcriber_pgadmin_data

# Inspect volume details
docker volume inspect transcriber_postgres_data

# View volume size
docker system df -v
```

### Volume Locations

Docker stores volumes in:
- **macOS**: `/var/lib/docker/volumes/`
- **Windows**: `C:\ProgramData\docker\volumes\`
- **Linux**: `/var/lib/docker/volumes/`

### Backup Volumes

```bash
# Backup PostgreSQL database
docker exec transcriber-postgres pg_dump -U transcriber transcriber_db > backup.sql

# Backup with timestamp
docker exec transcriber-postgres pg_dump -U transcriber transcriber_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup Redis data
docker exec transcriber-redis redis-cli --rdb /data/dump.rdb
docker cp transcriber-redis:/data/dump.rdb ./redis_backup.rdb
```

### Restore from Backup

```bash
# Restore PostgreSQL database
cat backup.sql | docker exec -i transcriber-postgres psql -U transcriber -d transcriber_db

# Restore Redis data
docker cp redis_backup.rdb transcriber-redis:/data/dump.rdb
docker-compose restart redis
```

### Clean Volumes (CAUTION)

```bash
# Remove all volumes (DELETES ALL DATA!)
docker-compose down -v

# Remove specific volume
docker volume rm transcriber_postgres_data

# Remove all unused volumes
docker volume prune
```

## Development Mode

### Using Development Overrides

The `docker-compose.dev.yml` file provides development-specific settings:

```bash
# Start with development overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

**Development Features**:
- Separate database name (`transcriber_dev`)
- Enhanced logging for debugging
- Verbose Redis output
- pgAdmin debug mode enabled

### Switching Between Environments

```bash
# Production-like environment
docker-compose up -d

# Development environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Update .env for development database
# Change DATABASE_URL to: postgresql://transcriber:transcriber_password@localhost:5432/transcriber_dev?schema=public
```

## Troubleshooting

### Port Already in Use

**Problem**: `Error: port 5432 is already allocated`

**Solution**:

```bash
# Find process using port 5432
lsof -ti:5432

# Kill the process
kill $(lsof -ti:5432)

# Or stop PostgreSQL if installed locally
brew services stop postgresql@16  # macOS Homebrew
sudo service postgresql stop       # Linux
```

**Alternative**: Change port in `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"  # Use port 5433 instead
```

### Container Won't Start

**Problem**: Container exits immediately or shows unhealthy status

**Solution**:

```bash
# Check container logs
docker-compose logs postgres

# Check specific error
docker logs transcriber-postgres --tail 50

# Remove container and try again
docker-compose down
docker-compose up -d

# Check for file permission issues
docker exec transcriber-postgres ls -la /var/lib/postgresql/data
```

### Database Connection Refused

**Problem**: `ECONNREFUSED 127.0.0.1:5432`

**Solution**:

```bash
# Verify container is running
docker-compose ps

# Verify health check passes
docker inspect transcriber-postgres | grep Health -A 10

# Wait for container to be healthy
while [ "$(docker inspect -f {{.State.Health.Status}} transcriber-postgres)" != "healthy" ]; do
  echo "Waiting for postgres to be healthy..."
  sleep 2
done
echo "PostgreSQL is ready!"

# Test connection
docker exec transcriber-postgres pg_isready -U transcriber
```

### Prisma Migration Errors

**Problem**: `Error: P1001: Can't reach database server`

**Solution**:

```bash
# Verify DATABASE_URL is correct
cat nextjs-app/.env | grep DATABASE_URL

# Verify PostgreSQL is healthy
docker-compose ps

# Regenerate Prisma client
cd nextjs-app
npx prisma generate

# Force push schema
npx prisma db push --force-reset
```

### Redis Connection Issues

**Problem**: `Error connecting to Redis`

**Solution**:

```bash
# Verify Redis is running
docker-compose ps redis

# Test Redis connection
docker exec transcriber-redis redis-cli ping

# Check Redis logs
docker-compose logs redis

# Verify REDIS_URL in .env
cat nextjs-app/.env | grep REDIS_URL
```

### pgAdmin Login Issues

**Problem**: Cannot access pgAdmin at http://localhost:5050

**Solution**:

```bash
# Check if pgAdmin is running
docker-compose ps pgadmin

# Restart pgAdmin
docker-compose restart pgadmin

# Check pgAdmin logs
docker-compose logs pgadmin

# Verify credentials
# Email: admin@transcriber.local
# Password: admin

# Clear browser cache and cookies
```

### Out of Disk Space

**Problem**: `no space left on device`

**Solution**:

```bash
# Check Docker disk usage
docker system df

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused containers
docker container prune

# Clean everything (CAUTION)
docker system prune -a --volumes
```

### Container Memory Issues

**Problem**: Container keeps restarting or crashes

**Solution**:

```bash
# Check container resource usage
docker stats

# Increase Docker memory limit in Docker Desktop settings
# Docker Desktop > Settings > Resources > Memory

# Adjust PostgreSQL shared buffers in docker-compose.yml
environment:
  POSTGRES_SHARED_BUFFERS: 128MB  # Reduce if necessary

# Adjust Redis max memory
command: >
  redis-server --maxmemory 128mb  # Reduce if necessary
```

## Production Deployment

### Security Hardening

**1. Change Default Passwords**

Update `.env`:
```bash
POSTGRES_PASSWORD=<strong-random-password>
REDIS_PASSWORD=<strong-random-password>
PGADMIN_PASSWORD=<strong-random-password>
```

Update `docker-compose.yml` Redis command:
```yaml
command: >
  redis-server
  --requirepass <strong-redis-password>
  --appendonly yes
```

**2. Use Environment Variables**

Create `.env.production`:
```bash
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
REDIS_PASSWORD=${REDIS_PASSWORD}
```

Reference in `docker-compose.yml`:
```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

**3. Restrict Network Access**

Update `docker-compose.yml`:
```yaml
postgres:
  ports:
    - "127.0.0.1:5432:5432"  # Only localhost access
```

**4. Enable SSL/TLS**

For PostgreSQL:
```yaml
postgres:
  command: >
    postgres
    -c ssl=on
    -c ssl_cert_file=/var/lib/postgresql/server.crt
    -c ssl_key_file=/var/lib/postgresql/server.key
  volumes:
    - ./certs/server.crt:/var/lib/postgresql/server.crt
    - ./certs/server.key:/var/lib/postgresql/server.key
```

**5. Remove pgAdmin in Production**

Comment out or remove pgAdmin service from `docker-compose.yml`.

### Resource Optimization

**Adjust Memory Limits**:

```yaml
services:
  postgres:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Monitoring and Logging

**Configure Log Rotation**:

```yaml
services:
  postgres:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
```

**Add Health Monitoring**:

Use tools like:
- Prometheus + Grafana for metrics
- ELK Stack for log aggregation
- Sentry for error tracking

### Automated Backups

**Create backup script** (`scripts/backup.sh`):

```bash
#!/bin/bash
BACKUP_DIR=/backups
DATE=$(date +%Y%m%d_%H%M%S)

# Backup PostgreSQL
docker exec transcriber-postgres pg_dump -U transcriber transcriber_db | \
  gzip > $BACKUP_DIR/postgres_$DATE.sql.gz

# Backup Redis
docker exec transcriber-redis redis-cli --rdb /data/dump.rdb
docker cp transcriber-redis:/data/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete
```

**Schedule with cron**:

```bash
# Run daily at 2 AM
0 2 * * * /path/to/scripts/backup.sh
```

## Backup and Restore

### Full System Backup

```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup PostgreSQL
docker exec transcriber-postgres pg_dump -U transcriber transcriber_db | \
  gzip > backups/$(date +%Y%m%d)/postgres.sql.gz

# Backup Redis
docker exec transcriber-redis redis-cli SAVE
docker cp transcriber-redis:/data/dump.rdb backups/$(date +%Y%m%d)/redis.rdb

# Backup Docker volumes
docker run --rm -v transcriber_postgres_data:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/$(date +%Y%m%d)/postgres_volume.tar.gz /data

# Backup configuration files
tar czf backups/$(date +%Y%m%d)/config.tar.gz \
  docker-compose.yml \
  docker-compose.dev.yml \
  nextjs-app/.env
```

### Full System Restore

```bash
RESTORE_DATE=20250104  # Change to your backup date

# Stop all services
docker-compose down

# Restore PostgreSQL
gunzip < backups/$RESTORE_DATE/postgres.sql.gz | \
  docker exec -i transcriber-postgres psql -U transcriber -d transcriber_db

# Restore Redis
docker cp backups/$RESTORE_DATE/redis.rdb transcriber-redis:/data/dump.rdb

# Restart services
docker-compose up -d
```

## Additional Resources

### Official Documentation

- **Docker Compose**: https://docs.docker.com/compose/
- **PostgreSQL**: https://www.postgresql.org/docs/16/
- **Redis**: https://redis.io/documentation
- **Prisma**: https://www.prisma.io/docs
- **pgAdmin**: https://www.pgadmin.org/docs/

### Useful Commands Reference

```bash
# Quick health check
docker-compose ps && docker exec transcriber-postgres pg_isready && docker exec transcriber-redis redis-cli ping

# View all logs since startup
docker-compose logs --since 5m

# Export database schema
docker exec transcriber-postgres pg_dump -U transcriber -s transcriber_db > schema.sql

# Check PostgreSQL connections
docker exec transcriber-postgres psql -U transcriber -d transcriber_db -c "SELECT * FROM pg_stat_activity;"

# Monitor Redis commands
docker exec transcriber-redis redis-cli MONITOR

# Check Docker network
docker network inspect transcriber_network
```

---

**Document Version**: 1.0
**Last Updated**: 2025-01-04
**Maintained By**: Fire Department Radio Transcription System Team
