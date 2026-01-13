# PRD Builder - Makefile for Docker Operations

.PHONY: help setup dev prod stop restart logs clean rebuild test backup restore

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo '$(BLUE)PRD Builder - Docker Management$(NC)'
	@echo ''
	@echo 'Usage:'
	@echo '  make $(GREEN)<target>$(NC)'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Initial setup - create .env file from template
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)✓$(NC) Created .env file from template"; \
		echo "$(YELLOW)⚠$(NC)  Please edit .env and add your configuration"; \
		echo "$(YELLOW)⚠$(NC)  Required: ANTHROPIC_API_KEY, JWT_SECRET, REFRESH_TOKEN_SECRET, DB_PASSWORD"; \
	else \
		echo "$(YELLOW)⚠$(NC)  .env file already exists"; \
	fi

dev: ## Start development environment with hot-reloading
	@echo "$(BLUE)Starting development environment...$(NC)"
	docker-compose -f docker-compose.dev.yml up

dev-build: ## Build and start development environment
	@echo "$(BLUE)Building and starting development environment...$(NC)"
	docker-compose -f docker-compose.dev.yml up --build

dev-bg: ## Start development environment in background
	@echo "$(BLUE)Starting development environment in background...$(NC)"
	docker-compose -f docker-compose.dev.yml up -d

dev-tools: ## Start development environment with PgAdmin
	@echo "$(BLUE)Starting development environment with tools...$(NC)"
	docker-compose -f docker-compose.dev.yml --profile tools up

prod: ## Start production environment
	@echo "$(BLUE)Starting production environment...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓$(NC) Production environment started"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend:  http://localhost:3001"

prod-build: ## Build and start production environment
	@echo "$(BLUE)Building and starting production environment...$(NC)"
	docker-compose up -d --build
	@echo "$(GREEN)✓$(NC) Production environment built and started"

prod-redis: ## Start production with Redis cache
	@echo "$(BLUE)Starting production with Redis...$(NC)"
	docker-compose --profile with-redis up -d

stop: ## Stop all services
	@echo "$(BLUE)Stopping all services...$(NC)"
	docker-compose down
	docker-compose -f docker-compose.dev.yml down
	@echo "$(GREEN)✓$(NC) All services stopped"

restart: ## Restart all services
	@echo "$(BLUE)Restarting services...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✓$(NC) Services restarted"

restart-backend: ## Restart only backend service
	@echo "$(BLUE)Restarting backend...$(NC)"
	docker-compose restart backend
	@echo "$(GREEN)✓$(NC) Backend restarted"

restart-frontend: ## Restart only frontend service
	@echo "$(BLUE)Restarting frontend...$(NC)"
	docker-compose restart frontend
	@echo "$(GREEN)✓$(NC) Frontend restarted"

logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs
	docker-compose logs -f backend

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

logs-db: ## View database logs
	docker-compose logs -f postgres

ps: ## List running containers
	@docker-compose ps

status: ## Show status of all services
	@echo "$(BLUE)Service Status:$(NC)"
	@docker-compose ps
	@echo ""
	@echo "$(BLUE)Health Checks:$(NC)"
	@docker inspect prd-builder-backend 2>/dev/null | grep -A 5 '"Health"' || echo "Backend container not running"
	@docker inspect prd-builder-frontend 2>/dev/null | grep -A 5 '"Health"' || echo "Frontend container not running"

clean: ## Stop services and remove containers (keeps volumes)
	@echo "$(YELLOW)⚠$(NC)  This will stop and remove all containers"
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)Cleaning up...$(NC)"; \
		docker-compose down; \
		docker-compose -f docker-compose.dev.yml down; \
		echo "$(GREEN)✓$(NC) Containers removed (volumes preserved)"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
	fi

clean-all: ## Stop services and remove containers AND volumes (DESTRUCTIVE)
	@echo "$(RED)⚠ WARNING: This will DELETE ALL DATA including the database!$(NC)"
	@read -p "Are you sure? Type 'yes' to continue: " response; \
	if [ "$$response" = "yes" ]; then \
		echo "$(BLUE)Removing everything...$(NC)"; \
		docker-compose down -v; \
		docker-compose -f docker-compose.dev.yml down -v; \
		echo "$(GREEN)✓$(NC) All containers and volumes removed"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
	fi

rebuild: ## Rebuild all images without cache
	@echo "$(BLUE)Rebuilding all images...$(NC)"
	docker-compose build --no-cache
	@echo "$(GREEN)✓$(NC) All images rebuilt"

rebuild-backend: ## Rebuild backend image
	@echo "$(BLUE)Rebuilding backend...$(NC)"
	docker-compose build --no-cache backend
	@echo "$(GREEN)✓$(NC) Backend rebuilt"

rebuild-frontend: ## Rebuild frontend image
	@echo "$(BLUE)Rebuilding frontend...$(NC)"
	docker-compose build --no-cache frontend
	@echo "$(GREEN)✓$(NC) Frontend rebuilt"

shell-backend: ## Open shell in backend container
	docker exec -it prd-builder-backend sh

shell-frontend: ## Open shell in frontend container
	docker exec -it prd-builder-frontend sh

shell-db: ## Open PostgreSQL shell
	docker exec -it prd-builder-db psql -U prdbuilder -d prdbuilder

db-backup: ## Backup database to ./backups/
	@mkdir -p backups
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
	echo "$(BLUE)Backing up database...$(NC)"; \
	docker exec prd-builder-db pg_dump -U prdbuilder prdbuilder > backups/db_backup_$$TIMESTAMP.sql; \
	echo "$(GREEN)✓$(NC) Database backed up to backups/db_backup_$$TIMESTAMP.sql"

db-restore: ## Restore database from backup (requires BACKUP_FILE=path)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Error: BACKUP_FILE not specified$(NC)"; \
		echo "Usage: make db-restore BACKUP_FILE=backups/db_backup_YYYYMMDD_HHMMSS.sql"; \
		exit 1; \
	fi
	@echo "$(YELLOW)⚠$(NC)  This will overwrite the current database"
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)Restoring database...$(NC)"; \
		docker exec -i prd-builder-db psql -U prdbuilder -d prdbuilder < $(BACKUP_FILE); \
		echo "$(GREEN)✓$(NC) Database restored"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
	fi

test: ## Run tests (placeholder - implement based on your test setup)
	@echo "$(BLUE)Running tests...$(NC)"
	@echo "$(YELLOW)⚠$(NC)  Test target not yet implemented"
	@echo "Add your test commands here"

health: ## Check health of all services
	@echo "$(BLUE)Checking service health...$(NC)"
	@echo ""
	@echo "$(GREEN)Frontend:$(NC)"
	@curl -f http://localhost:3000/health 2>/dev/null && echo "  ✓ Healthy" || echo "  ✗ Unhealthy"
	@echo ""
	@echo "$(GREEN)Backend:$(NC)"
	@curl -f http://localhost:3001/health 2>/dev/null && echo "  ✓ Healthy" || echo "  ✗ Unhealthy"
	@echo ""
	@echo "$(GREEN)Database:$(NC)"
	@docker exec prd-builder-db pg_isready -U prdbuilder 2>/dev/null && echo "  ✓ Healthy" || echo "  ✗ Unhealthy"

prune: ## Clean up Docker system (remove unused images, containers, networks)
	@echo "$(BLUE)Pruning Docker system...$(NC)"
	docker system prune -f
	@echo "$(GREEN)✓$(NC) Docker system pruned"

prune-all: ## Aggressive cleanup - remove ALL unused Docker resources
	@echo "$(YELLOW)⚠$(NC)  This will remove all unused images, containers, volumes, and networks"
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)Pruning everything...$(NC)"; \
		docker system prune -a -f --volumes; \
		echo "$(GREEN)✓$(NC) Docker system fully pruned"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
	fi

validate-env: ## Validate .env file has required variables
	@echo "$(BLUE)Validating .env file...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(RED)✗$(NC) .env file not found"; \
		echo "Run: make setup"; \
		exit 1; \
	fi
	@echo "Checking required variables..."
	@grep -q "ANTHROPIC_API_KEY=sk-" .env && echo "  $(GREEN)✓$(NC) ANTHROPIC_API_KEY" || echo "  $(RED)✗$(NC) ANTHROPIC_API_KEY missing"
	@grep -q "JWT_SECRET=.\\{32,\\}" .env && echo "  $(GREEN)✓$(NC) JWT_SECRET" || echo "  $(YELLOW)⚠$(NC) JWT_SECRET too short or missing"
	@grep -q "REFRESH_TOKEN_SECRET=.\\{32,\\}" .env && echo "  $(GREEN)✓$(NC) REFRESH_TOKEN_SECRET" || echo "  $(YELLOW)⚠$(NC) REFRESH_TOKEN_SECRET too short or missing"
	@grep -q "DB_PASSWORD=.\\{8,\\}" .env && echo "  $(GREEN)✓$(NC) DB_PASSWORD" || echo "  $(YELLOW)⚠$(NC) DB_PASSWORD too short or missing"
	@echo "$(GREEN)✓$(NC) Validation complete"

generate-secrets: ## Generate secure secrets for .env
	@echo "$(BLUE)Generating secure secrets...$(NC)"
	@echo ""
	@echo "$(GREEN)JWT_SECRET:$(NC)"
	@openssl rand -base64 64 | tr -d '\n' && echo
	@echo ""
	@echo "$(GREEN)REFRESH_TOKEN_SECRET:$(NC)"
	@openssl rand -base64 64 | tr -d '\n' && echo
	@echo ""
	@echo "$(GREEN)DB_PASSWORD:$(NC)"
	@openssl rand -base64 32 | tr -d '\n' && echo
	@echo ""
	@echo "$(GREEN)SESSION_SECRET:$(NC)"
	@openssl rand -base64 32 | tr -d '\n' && echo
	@echo ""

install: setup validate-env prod ## Complete installation (setup, validate, start)
	@echo "$(GREEN)✓$(NC) Installation complete!"
	@echo ""
	@echo "Access your application:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:3001"
