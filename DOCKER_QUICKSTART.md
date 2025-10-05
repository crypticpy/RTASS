# Docker Quick Start Guide

**Fire Department Radio Transcription System**

## One-Command Setup

```bash
./scripts/docker-start.sh
```

This automated script will:
- Verify Docker is installed and running
- Create `.env` file if missing
- Start PostgreSQL, Redis, and pgAdmin
- Wait for services to be healthy
- Initialize the database schema with Prisma

## Manual Setup (Alternative)

### 1. Start Docker Services

```bash
docker compose up -d
```

### 2. Wait for Services to be Ready

```bash
# Check status
docker compose ps

# Wait for healthy status
docker exec transcriber-postgres pg_isready -U transcriber
docker exec transcriber-redis redis-cli ping
```

### 3. Initialize Database

```bash
cd nextjs-app
npx prisma generate
npx prisma db push
```

### 4. Start Next.js Application

```bash
npm run dev
```

Access at: http://localhost:3000

## Service Access

| Service | URL | Credentials |
|---------|-----|-------------|
| Next.js App | http://localhost:3000 | N/A |
| PostgreSQL | localhost:5432 | transcriber / transcriber_password |
| Redis | localhost:6379 | No password |
| pgAdmin | http://localhost:5050 | admin@transcriber.local / admin |

## Common Commands

```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop services
docker compose down

# Stop and remove all data
docker compose down -v

# Check service health
docker compose ps
docker exec transcriber-postgres pg_isready
docker exec transcriber-redis redis-cli ping
```

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 5432 (PostgreSQL)
lsof -ti:5432 | xargs kill

# Find and kill process on port 6379 (Redis)
lsof -ti:6379 | xargs kill
```

### Container Won't Start

```bash
# View detailed logs
docker compose logs postgres

# Remove and recreate containers
docker compose down
docker compose up -d
```

### Database Connection Issues

```bash
# Verify DATABASE_URL in .env
cat nextjs-app/.env | grep DATABASE_URL

# Should be:
# postgresql://transcriber:transcriber_password@localhost:5432/transcriber_db?schema=public

# Test database connection
docker exec transcriber-postgres psql -U transcriber -d transcriber_db -c "SELECT 1;"
```

## Development Mode

Use development overrides for enhanced logging:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

**Note**: This uses a separate database named `transcriber_dev`.

## Production Notes

For production deployment:
1. Change all default passwords in `.env`
2. Enable Redis password authentication
3. Remove or disable pgAdmin service
4. Use external managed database services (recommended)
5. Set up automated backups
6. Configure SSL/TLS certificates
7. Restrict network access (firewall rules)

See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for comprehensive documentation.

---

**Need Help?** See full documentation in [DOCKER_SETUP.md](./DOCKER_SETUP.md)
