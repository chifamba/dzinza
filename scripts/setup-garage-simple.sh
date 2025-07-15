#!/bin/bash

# Simple Garage S3 Storage Cluster Setup Script
# This script initializes a single-node Garage cluster for development

set -e

echo "🚀 Setting up Garage S3 Storage Cluster (Simple Mode)..."

# Wait for Garage to be ready
echo "⏳ Waiting for Garage to be ready..."
sleep 10

# Get node ID from garage1
echo "🔍 Getting node ID from garage1..."
NODE1_ID=$(docker-compose exec -T garage1 /garage node id 2>/dev/null | head -1 | cut -d'@' -f1)

if [ -z "$NODE1_ID" ]; then
    echo "❌ Failed to get node ID from garage1"
    exit 1
fi

echo "✅ Node ID obtained: $NODE1_ID"

# Create layout for single node
echo "🏗️ Creating single-node cluster layout..."
docker-compose exec -T garage1 /garage layout assign -z dc1 -c 1024 $NODE1_ID

# Apply layout
echo "🔄 Applying cluster layout..."
docker-compose exec -T garage1 /garage layout apply --version 1

# Wait for layout to be applied
echo "⏳ Waiting for layout to be applied..."
sleep 10

# Create API keys
echo "🔑 Creating API keys..."
docker-compose exec -T garage1 /garage key create dzinza-storage-key || true

# Create bucket
echo "🪣 Creating storage bucket..."
docker-compose exec -T garage1 /garage bucket create dzinza-storage-bucket || true

# Allow API key to access bucket
echo "🔐 Setting bucket permissions..."
docker-compose exec -T garage1 /garage bucket allow dzinza-storage-bucket --read --write --key dzinza-storage-key || true

# Get key info
echo "📋 Getting key information..."
docker-compose exec -T garage1 /garage key info dzinza-storage-key || true

echo "✅ Garage cluster setup complete!"
echo ""
echo "🔧 To verify the setup:"
echo "   docker-compose exec garage1 /garage status"
echo "   docker-compose exec garage1 /garage bucket list"
echo "   docker-compose exec garage1 /garage key list"
echo ""
echo "🌐 S3 API endpoint: http://localhost:39000"
echo "🔑 Use the dzinza-storage-key for S3 authentication"
