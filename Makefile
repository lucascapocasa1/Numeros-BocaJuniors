COMPOSE := docker compose

-include .env.local

.PHONY: help up down build restart logs shell-api shell-frontend migrate seed fresh test lint fresh-start db-pull

# Colors for output
GREEN=\033[0;32m
NC=\033[0m # No Color

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Environment ──────────────────────────────────────────────

setup: ## Initial project setup
	@cp -n .env.example .env 2>/dev/null || true
	@cp -n backend/.env.example backend/.env 2>/dev/null || true
	@echo "Environment files created. Edit .env as needed."

up: ## Start all containers
	$(COMPOSE) up -d

down: ## Stop all containers
	$(COMPOSE) down

build: ## Build/rebuild containers
	$(COMPOSE) build

restart: ## Restart all containers
	$(COMPOSE) restart

logs: ## Tail container logs
	$(COMPOSE) logs -f

logs-api: ## Tail API logs
	$(COMPOSE) logs -f api

logs-frontend: ## Tail frontend logs
	$(COMPOSE) logs -f frontend

# ─── Backend ──────────────────────────────────────────────────

shell-api: ## Open shell in API container
	$(COMPOSE) exec api sh

composer-install: ## Install PHP dependencies
	$(COMPOSE) exec api composer install

migrate: ## Run database migrations
	$(COMPOSE) exec api php artisan migrate

migrate-rollback: ## Run database migrations
	$(COMPOSE) exec api php artisan migrate:rollback

seed: ## Run database seeders
	$(COMPOSE) exec api php artisan db:seed

fresh: ## Fresh migration + seed
	$(COMPOSE) exec api php artisan migrate:fresh --seed

test: ## Run backend tests
	$(COMPOSE) exec api php vendor/bin/phpunit

key-generate: ## Generate JWT secret
	$(COMPOSE) exec api php artisan jwt:secret

# ─── Frontend ─────────────────────────────────────────────────

shell-frontend: ## Open shell in frontend container
	$(COMPOSE) exec frontend sh

npm-install: ## Install frontend dependencies
	$(COMPOSE) exec frontend npm install

# ─── Database ─────────────────────────────────────────────────

db: ## Open MySQL CLI
	$(COMPOSE) exec mysql mysql -u app -psecret numeros_rojos

redis-cli: ## Open Redis CLI
	$(COMPOSE) exec redis redis-cli

# ─── Utilities ────────────────────────────────────────────────

status: ## Show container status
	$(COMPOSE) ps

clean: ## Remove volumes and containers
	$(COMPOSE) down -v --remove-orphans

export-csv: ## Export economy_records to CSV (usage: make export-csv TABLE=economy_records)
	$(COMPOSE) exec api php artisan export:csv $(TABLE)

fresh-start: ## Fresh install: down, build, up, npm-install, migrate:fresh --seed
	$(COMPOSE) down
	$(COMPOSE) build
	$(COMPOSE) up -d
	$(COMPOSE) exec frontend npm install
	$(COMPOSE) exec api composer install
	$(COMPOSE) exec api php artisan migrate:fresh --seed
	@echo ""
	@echo "$(GREEN)=====================================$(NC)"
	@echo "$(GREEN)   Números Rojos está listo!$(NC)"
	@echo "$(GREEN)=====================================$(NC)"
	@echo "$(GREEN)Frontend: http://localhost:$${FRONTEND_PORT:-5173}$(NC)"
	@echo "$(GREEN)API:      http://localhost:$${NGINX_PORT:-8080}$(NC)"
	@echo ""

# ─── Production ─────────────────────────────────────────────────

SERVER ?= $(error SERVER no definido. Crea .env.local con SERVER=user@ip)
DEPLOY_PATH ?= $(error DEPLOY_PATH no definido. Crea .env.local con DEPLOY_PATH=/ruta/proyecto)

prod-build: ## Construir para producción
	docker compose -f docker-compose.prod.yml --env-file .env.prod build

prod-up: ## Levantar en modo producción
	docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

prod-down: ## Parar producción
	docker compose -f docker-compose.prod.yml --env-file .env.prod down

prod-restart: ## Reiniciar producción
	docker compose -f docker-compose.prod.yml --env-file .env.prod restart

prod-logs: ## Ver logs de producción
	docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f

prod-migrate: ## Ejecutar migraciones en producción
	@echo "⏳ Esperando a que la base de datos esté disponible..."
	@docker compose -f docker-compose.prod.yml --env-file .env.prod exec mysql sh -c "\
		until mysqladmin ping -h localhost -u root -p\$$MYSQL_ROOT_PASSWORD --silent; do \
			echo 'Esperando base de datos...'; \
			sleep 2; \
		done"
	@echo "✅ Base de datos lista"
	@docker compose -f docker-compose.prod.yml --env-file .env.prod exec api php artisan migrate --force
	@echo "$(GREEN)Migraciones aplicadas$(NC)"

cache-warm: ## Precalentar caché de BeSoccer en producción
	docker compose -f docker-compose.prod.yml --env-file .env.prod exec api php artisan besoccer:warm-cache

prod-status: ## Ver estado de producción
	docker compose -f docker-compose.prod.yml --env-file .env.prod ps

ssh-vps: ## Conectar al VPS
	ssh $(SERVER)

db-pull: ## Descargar BD de producción a local. Uso: make db-pull [TABLE=tabla] [FORCE=1]
	@if [ -z "$(FORCE)" ]; then \
		read -p "Esto reemplazara datos en la BD local. Continuar? [y/N] " confirm && \
		{ [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; } || { echo "Cancelado."; exit 1; }; \
	fi
	@if [ -n "$(TABLE)" ]; then \
		echo "Descargando tabla '$(TABLE)' desde produccion..."; \
		ssh $(SERVER) "cd $(DEPLOY_PATH) && docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T mysql sh -c 'mysqldump -u root -p\$$MYSQL_ROOT_PASSWORD --add-drop-table \$$MYSQL_DATABASE $(TABLE)'" \
		| $(COMPOSE) exec -T mysql sh -c "mysql -u \$$MYSQL_USER -p\$$MYSQL_PASSWORD \$$MYSQL_DATABASE"; \
	else \
		echo "Descargando base de datos completa desde produccion..."; \
		ssh $(SERVER) "cd $(DEPLOY_PATH) && docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T mysql sh -c 'mysqldump -u root -p\$$MYSQL_ROOT_PASSWORD --add-drop-table \$$MYSQL_DATABASE'" \
		| $(COMPOSE) exec -T mysql sh -c "mysql -u \$$MYSQL_USER -p\$$MYSQL_PASSWORD \$$MYSQL_DATABASE"; \
	fi
	@echo "$(GREEN)Base de datos local actualizada$(NC)"

deploy: ## Deploy a producción (usage: make deploy TAG=x.x.x)
	@if [ -z "$(TAG)" ]; then \
		echo "Error: TAG is required. Use: make deploy TAG=x.x.x"; \
		exit 1; \
	fi
	@echo "Checking current branch..."
	@CURRENT_BRANCH=$$(git branch --show-current); \
	if [ "$$CURRENT_BRANCH" != "main" ]; then \
		echo "Current branch is $$CURRENT_BRANCH, merging with main..."; \
		git checkout main && \
		git pull origin main && \
		git merge $$CURRENT_BRANCH && \
		git push origin main; \
	else \
		echo "Already on main branch"; \
	fi
	@echo "Creating release $(TAG)..."
	@git tag -a $(TAG) -m "Release version $(TAG)"
	@git push origin $(TAG)
	@echo "Release $(TAG) created and pushed successfully!"
	@echo "🚀 Iniciando deploy del tag $(TAG) a $(SERVER)..."
	@echo "🔧 Ejecutando deploy en el servidor..."
	@ssh $(SERVER) "cd $(DEPLOY_PATH) && \
		echo '📦 Descargando código del repositorio...' && \
		git fetch --tags && \
		git checkout $(TAG) && \
		echo '🔄 Parando servicios...' && \
		make prod-down 2>/dev/null || true && \
		echo '🏗️  Construyendo imágenes...' && \
		make prod-build && \
		echo '⚡ Iniciando servicios...' && \
		make prod-up && \
		echo '🗄️  Ejecutando migraciones...' && \
		make prod-migrate && \
		echo '🧹 Limpiando imágenes antiguas...' && \
		docker image prune -f && \
		echo '🔥 Precalentando caché de BeSoccer...' && \
		docker compose -f docker-compose.prod.yml --env-file .env.prod exec api php artisan besoccer:warm-cache"
	@echo "✅ Deploy completado exitosamente!"
