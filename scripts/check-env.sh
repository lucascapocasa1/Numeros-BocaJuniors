#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"
ENV_EXAMPLE="${PROJECT_ROOT}/.env.example"

echo "🔍 Validando configuración de entorno..."
echo ""

if [ ! -f "${ENV_FILE}" ]; then
    if [ -f "${ENV_EXAMPLE}" ]; then
        echo -e "${YELLOW}⚠️  Archivo .env no encontrado${NC}"
        echo "📋 Copiando desde .env.example..."
        cp "${ENV_EXAMPLE}" "${ENV_FILE}"
        echo -e "${GREEN}✓ Archivo .env creado exitosamente${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANTE: Edita el archivo .env con tus credenciales antes de continuar${NC}"
        echo ""
    else
        echo -e "${RED}❌ ERROR: No se encontró .env.example${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Archivo .env encontrado${NC}"
fi

if [ -f "${ENV_FILE}" ]; then
    set -a
    source "${ENV_FILE}"
    set +a
fi

CRITICAL_VARS=(
    "DB_DATABASE"
    "DB_USERNAME"
    "DB_PASSWORD"
    "DB_ROOT_PASSWORD"
    "JWT_SECRET"
)

ERRORS=0

echo ""
echo "📋 Validando variables críticas..."

for VAR in "${CRITICAL_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        echo -e "${RED}❌ ERROR: Variable ${VAR} no está definida o está vacía${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓ ${VAR}${NC}"
    fi
done

WARNINGS=0

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ${ERRORS} -gt 0 ]; then
    echo -e "${RED}❌ Validación FALLIDA: ${ERRORS} error(es) crítico(s)${NC}"
    echo ""
    echo "Por favor, edita el archivo .env y asegúrate de que todas las variables críticas estén configuradas."
    echo ""
    exit 1
fi

if [ ${WARNINGS} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Validación OK con advertencias (${WARNINGS})${NC}"
    echo ""
fi

if [ ${ERRORS} -eq 0 ] && [ ${WARNINGS} -eq 0 ]; then
    echo -e "${GREEN}✓ Validación EXITOSA${NC}"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit 0
