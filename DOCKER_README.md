# PRD Builder - Docker Setup

Complete Docker configuration for the PRD Builder application with development and production environments.

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available for Docker
- Anthropic API key (get one at https://console.anthropic.com/)

## 🚀 Quick Start

### Production Environment

1. **Clone and setup environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your configuration
   nano .env
   ```

2. **Required environment variables**
   - `ANTHROPIC_API_KEY`: Your Claude API key
   - `JWT_SECRET`: Generate with `openssl rand -base64 64`
   - `REFRESH_TOKEN_SECRET`: Generate with `openssl rand -base64 64`
   - `DB_PASSWORD`: Choose a secure database password

3. **Build and start services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Docs: http://localhost:3001/api-docs (if enabled)

5. **Check logs**
   ```bash
   docker-compose logs -f
   ```

### Development Environment

1. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env for development
   ```

2. **Start development services**
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

3. **Features in development mode**
   - Hot reloading for frontend (Vite)
   - Hot reloading for backend (nodemon)
   - Node.js debugging on port 9229
   - Source maps enabled
   - PostgreSQL exposed on port 5432

4. **Access PgAdmin (optional)**
   ```bash
   docker-compose -f docker-compose.dev.yml --profile tools up
   ```
   - PgAdmin: http://localhost:5050
   - Default credentials in .env file

## 📁 Project Structure

```
.
├── backend/                 # Backend Node.js application
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # Frontend React application
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── Dockerfile              # Production backend image
├── Dockerfile.frontend     # Production frontend image
├── Dockerfile.dev          # Development backend image
├── Dockerfile.frontend.dev # Development frontend image
├── docker-compose.yml      # Production orchestration
├── docker-compose.dev.yml  # Development orchestration
├── nginx.conf              # Nginx configuration for frontend
├── init-db.sql            # Database initialization script
├── .env.example           # Environment variables template
└── .dockerignore          # Docker build exclusions
```

## 🛠️ Common Commands

### Starting Services

```bash
# Production
docker-compose up -d

# Development
docker-compose -f docker-compose.dev.yml up

# With Redis cache (optional)
docker-compose --profile with-redis up -d

# With development tools
docker-compose -f docker-compose.dev.yml --profile tools up
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: deletes data)
docker-compose down -v

# Development environment
docker-compose -f docker-compose.dev.yml down
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Rebuilding Images

```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build backend

# Force rebuild without cache
docker-compose build --no-cache

# Rebuild and restart
docker-compose up -d --build
```

### Database Operations

```bash
# Access PostgreSQL
docker exec -it prd-builder-db psql -U prdbuilder -d prdbuilder

# Run SQL script
docker exec -i prd-builder-db psql -U prdbuilder -d prdbuilder < backup.sql

# Backup database
docker exec prd-builder-db pg_dump -U prdbuilder prdbuilder > backup.sql

# Restore database
docker exec -i prd-builder-db psql -U prdbuilder -d prdbuilder < backup.sql
```

### Container Management

```bash
# List running containers
docker-compose ps

# Enter backend container
docker exec -it prd-builder-backend sh

# Enter frontend container
docker exec -it prd-builder-frontend sh

# View container resource usage
docker stats
```

## 🔧 Configuration

### Environment Variables

Key configuration options in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `DB_PASSWORD` | PostgreSQL password | `changeme` |
| `FRONTEND_PORT` | Frontend port | `3000` |
| `BACKEND_PORT` | Backend API port | `3001` |
| `NODE_ENV` | Environment mode | `production` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

### Database Configuration

The database is automatically initialized with:
- User management tables
- PRD storage tables
- Planning conversation storage
- Template system
- API usage tracking
- Default PRD template

### Network Configuration

All services communicate via the `prd-builder-network` bridge network:
- Frontend → Backend: Internal Docker DNS
- Backend → Database: Internal Docker DNS
- External access via exposed ports

## 🔒 Security Considerations

### Production Deployment

1. **Change default passwords**
   ```bash
   # Generate secure secrets
   openssl rand -base64 64  # For JWT_SECRET
   openssl rand -base64 64  # For REFRESH_TOKEN_SECRET
   openssl rand -base64 32  # For DB_PASSWORD
   ```

2. **Enable HTTPS**
   - Use a reverse proxy (nginx, Traefik, Caddy)
   - Obtain SSL certificates (Let's Encrypt)
   - Set `COOKIE_SECURE=true` in .env

3. **Set proper CORS**
   ```env
   CORS_ORIGIN=https://your-domain.com
   ```

4. **Use Docker secrets** (for Docker Swarm)
   ```bash
   echo "your_secret" | docker secret create jwt_secret -
   ```

5. **Restrict exposed ports**
   - Don't expose database port (5432) externally
   - Use firewall rules
   - Consider VPC/private networks

### Health Checks

All services include health checks:
- **Backend**: HTTP check on `/health` endpoint
- **Frontend**: Nginx availability check
- **Database**: PostgreSQL ready check
- **Redis**: Connection test

## 📊 Monitoring

### Service Status

```bash
# Check health status
docker-compose ps

# View health check logs
docker inspect prd-builder-backend | grep -A 10 Health
```

### Resource Usage

```bash
# Real-time stats
docker stats

# Container resource limits (add to docker-compose.yml)
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
```

## 🐛 Troubleshooting

### Service won't start

```bash
# Check logs
docker-compose logs backend

# Verify environment variables
docker-compose config

# Check port conflicts
netstat -tulpn | grep -E '3000|3001|5432'
```

### Database connection issues

```bash
# Test database connectivity
docker exec prd-builder-db pg_isready -U prdbuilder

# Check database logs
docker-compose logs postgres

# Recreate database
docker-compose down -v
docker-compose up -d
```

### Frontend can't connect to backend

1. Check CORS configuration in `.env`
2. Verify backend is running: `curl http://localhost:3001/health`
3. Check browser console for errors
4. Verify `VITE_API_URL` is correct

### Build failures

```bash
# Clear Docker build cache
docker builder prune

# Remove all images and rebuild
docker-compose down --rmi all
docker-compose build --no-cache
```

## 🔄 Updates and Maintenance

### Updating Dependencies

```bash
# Backend
docker-compose exec backend npm update
docker-compose restart backend

# Frontend
docker-compose exec frontend npm update
docker-compose restart frontend
```

### Database Migrations

```bash
# Run migrations (if using a migration tool)
docker-compose exec backend npm run migrate

# Create new migration
docker-compose exec backend npm run migrate:create
```

### Backup Strategy

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec prd-builder-db pg_dump -U prdbuilder prdbuilder > \
  $BACKUP_DIR/db_backup_$DATE.sql

# Backup volumes
docker run --rm -v prd-builder_postgres_data:/data -v \
  $BACKUP_DIR:/backup alpine tar czf \
  /backup/volume_backup_$DATE.tar.gz -C /data .
```

## 📝 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Anthropic API Documentation](https://docs.anthropic.com/)

## 📞 Support

For issues related to:
- Application features: See PRD document
- Docker setup: Check this README
- Claude API: https://docs.anthropic.com/
- Docker issues: https://docs.docker.com/

## 📄 License

See LICENSE file for details.
