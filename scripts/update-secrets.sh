#!/usr/bin/env bash
#
# LifeOS - Update Secrets on Azure Container Apps (lifeos-backend)
# This script now matches the exact secrets used by the working ai102-backend.
#
set -euo pipefail

RESOURCE_GROUP="AI102"
BACKEND_APP="lifeos-backend"

echo "🔐 Updating all required secrets for ${BACKEND_APP}..."

# === EDIT THESE VALUES WITH REAL SECRETS BEFORE RUNNING ===
# You can copy the real values from the old ai102-backend or from your secret store.

az containerapp secret set \
  --name "${BACKEND_APP}" \
  --resource-group "${RESOURCE_GROUP}" \
  --secrets \
    database-url="Host=ai102pg6683.postgres.database.azure.com;Port=5432;Database=lifeos;Username=lifeos;Password=YOUR_PG_PASSWORD;SSL Mode=Require" \
    storage-conn="YOUR_AZURE_STORAGE_CONNECTION_STRING" \
    openai-endpoint="https://ai102openai6636.openai.azure.com/" \
    openai-key="YOUR_AZURE_OPENAI_KEY" \
    search-endpoint="https://ai102search8563.search.windows.net" \
    search-key="YOUR_AZURE_SEARCH_KEY" \
    docintel-endpoint="https://ai102docintel03201903.cognitiveservices.azure.com/" \
    docintel-key="YOUR_DOCUMENT_INTELLIGENCE_KEY" \
    ai102acr8402azurecrio-ai102acr8402="YOUR_ACR_PASSWORD" \
    jwt-secret="$(openssl rand -hex 48)"

echo "✅ Secrets updated. Restarting the app to apply changes..."
az containerapp revision restart \
  --name "${BACKEND_APP}" \
  --resource-group "${RESOURCE_GROUP}"

echo "🎉 Done! Your backend now has the same secrets as the working ai102-backend."
echo ""
echo "Next steps:"
echo "  1. Make sure the PostgreSQL 'lifeos' database exists and the user has access"
echo "  2. Run: ./scripts/deploy-azure.sh   (or let GitHub Actions do it)"
