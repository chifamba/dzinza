#!/bin/bash

# Garage S3 Storage Cluster Setup Script
# This script initializes the Garage cluster for the Dzinza platform

set -e

echo "🚀 Setting up Garage S3 Storage Cluster..."

# Wait for all Garage nodes to be ready
echo "⏳ Waiting for Garage nodes to be ready..."
sleep 10

# Get node IDs
echo "🔍 Getting node IDs..."
NODE1_ID=$(docker-compose exec garage1 /garage node id 2>/dev/null | grep -o '^[a-f0-9]\{64\}' || echo "")
NODE2_ID=$(docker-compose exec garage2 /garage node id 2>/dev/null | grep -o '^[a-f0-9]\{64\}' || echo "")
NODE3_ID=$(docker-compose exec garage3 /garage node id 2>/dev/null | grep -o '^[a-f0-9]\{64\}' || echo "")

if [ -z "$NODE1_ID" ] || [ -z "$NODE2_ID" ] || [ -z "$NODE3_ID" ]; then
    echo "❌ Failed to get node IDs. Nodes may not be ready yet."
    echo "   Trying to connect nodes manually..."
    
    # Try to connect nodes manually
    docker-compose exec garage1 /garage node connect garage2:39012 || true
    docker-compose exec garage1 /garage node connect garage3:39013 || true
    docker-compose exec garage2 /garage node connect garage1:39011 || true
    docker-compose exec garage2 /garage node connect garage3:39013 || true
    docker-compose exec garage3 /garage node connect garage1:39011 || true
    docker-compose exec garage3 /garage node connect garage2:39012 || true
    
    sleep 5
    
    # Try again
    NODE1_ID=$(docker-compose exec garage1 /garage node id 2>/dev/null | grep -o '^[a-f0-9]\{64\}' || echo "")
    NODE2_ID=$(docker-compose exec garage2 /garage node id 2>/dev/null | grep -o '^[a-f0-9]\{64\}' || echo "")
    NODE3_ID=$(docker-compose exec garage3 /garage node id 2>/dev/null | grep -o '^[a-f0-9]\{64\}' || echo "")
fi

if [ -z "$NODE1_ID" ] || [ -z "$NODE2_ID" ] || [ -z "$NODE3_ID" ]; then
    echo "❌ Still failed to get node IDs. Manual intervention required."
    echo "   Check if all Garage containers are running: docker-compose ps"
    exit 1
fi

echo "✅ Node IDs obtained:"
echo "   Node1: $NODE1_ID"
echo "   Node2: $NODE2_ID"
echo "   Node3: $NODE3_ID"

# Create layout
echo "🏗️ Creating cluster layout..."
docker-compose exec garage1 /garage layout assign \
    -z dc1 -c 1 $NODE1_ID $NODE2_ID $NODE3_ID

# Apply layout
echo "🔄 Applying cluster layout..."
docker-compose exec garage1 /garage layout apply --version 1

# Wait for layout to be applied
echo "⏳ Waiting for layout to be applied..."
sleep 10

# Create API keys
echo "🔑 Creating API keys..."
docker-compose exec garage1 /garage key create dzinza-storage-key || true

# Create bucket
echo "🪣 Creating storage bucket..."
docker-compose exec garage1 /garage bucket create dzinza-storage-bucket || true

# Allow API key to access bucket
echo "🔐 Setting bucket permissions..."
docker-compose exec garage1 /garage bucket allow dzinza-storage-bucket --read --write --key dzinza-storage-key || true

# Get key info
echo "📋 Getting key information..."
docker-compose exec garage1 /garage key info dzinza-storage-key || true

echo "✅ Garage cluster setup complete!"
echo ""
echo "🔧 To verify the setup:"
echo "   docker-compose exec garage1 /garage status"
echo "   docker-compose exec garage1 /garage bucket list"
echo "   docker-compose exec garage1 /garage key list"
echo ""
echo "🌐 S3 API endpoints:"
echo "   Node1: http://localhost:39000"
echo "   Node2: http://localhost:39002"
echo "   Node3: http://localhost:39003"
echo ""
echo "🔑 Use the dzinza-storage-key for S3 authentication"
