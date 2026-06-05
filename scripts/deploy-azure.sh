#!/usr/bin/env bash
#
# LifeOS Backend - Azure Deployment Script (Backend-only repo)
# Deploys only the backend to task-managamnet-backend
#
set -euo pipefail

RESOURCE_GROUP="task-managamnet-rg"
ACR_NAME="taskmanagamnetacr"
BACKEND_APP="task-managamnet-backend"

COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
IMAGE_TAG="${COMMIT_SHA}"

echo "🚀 Deploying Backend to Azure"
echo "   Resource Group : ${RESOURCE_GROUP}"
echo "   Registry       : ${ACR_NAME}"
echo "   Tag            : ${IMAGE_TAG}"
echo ""

echo "🔐 Logging into Azure Container Registry..."
az acr login --name "${ACR_NAME}"

echo ""
echo "📦 Building backend image..."
docker build -t "${ACR_NAME}.azurecr.io/task-managamnet/backend:${IMAGE_TAG}" \
             -t "${ACR_NAME}.azurecr.io/task-managamnet/backend:latest" .

echo "⬆️  Pushing backend image..."
docker push "${ACR_NAME}.azurecr.io/task-managamnet/backend:${IMAGE_TAG}"
docker push "${ACR_NAME}.azurecr.io/task-managamnet/backend:latest"

echo ""
echo "🔄 Updating task-managamnet-backend container app..."
az containerapp update \
  --name "${BACKEND_APP}" \
  --resource-group "${RESOURCE_GROUP}" \
  --image "${ACR_NAME}.azurecr.io/task-managamnet/backend:${IMAGE_TAG}" \
  --target-port 8080 \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv

echo ""
echo "✅ Backend deployment complete!"
echo "   URL: https://${BACKEND_APP}.ambitiousmushroom-6a766356.centralus.azurecontainerapps.io"
