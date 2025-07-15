#!/bin/bash
# setup_garage_cluster.sh
# Script to fully initialize a 3-node Garage S3-compatible cluster for local development
# Usage: ./setup_garage_cluster.sh

set -euo pipefail

# 1. Stop and remove any existing Garage containers and volumes
echo "Stopping and removing existing Garage containers and volumes..."
docker compose down -v garage1 garage2 garage3 || true

docker compose rm -f garage1 garage2 garage3 || true

docker volume rm dzinza_garage1_data dzinza_garage1_meta dzinza_garage2_data dzinza_garage2_meta dzinza_garage3_data dzinza_garage3_meta || true

# 2. Start the 3 Garage nodes

echo "Starting Garage nodes..."
docker compose up -d garage1 garage2 garage3

# 3. Wait for all nodes to be healthy
sleep 5
echo "Waiting for Garage nodes to be ready..."
for i in {1..10}; do
  if docker compose exec garage1 /garage status && \
     docker compose exec garage2 /garage status && \
     docker compose exec garage3 /garage status; then
    break
  fi
  sleep 2
done

# 4. Assign all nodes to the cluster layout (zone 1, capacity 1024)
echo "Assigning nodes to cluster layout..."
# Dynamically get node IDs from status output
GARAGE1_ID=$(docker compose exec garage1 /garage status | grep garage1 | awk '{print $1}')
GARAGE2_ID=$(docker compose exec garage1 /garage status | grep garage2 | awk '{print $1}')
GARAGE3_ID=$(docker compose exec garage1 /garage status | grep garage3 | awk '{print $1}')

if [ -n "$GARAGE1_ID" ]; then
  docker compose exec garage1 /garage layout assign -z 1 -c 1024 $GARAGE1_ID
  sleep 1
else
  echo "Error: Could not retrieve garage1 node ID"
  exit 1
fi

if [ -n "$GARAGE2_ID" ]; then
  docker compose exec garage1 /garage layout assign -z 1 -c 1024 $GARAGE2_ID
  sleep 1
else
  echo "Error: Could not retrieve garage2 node ID"
  exit 1
fi

if [ -n "$GARAGE3_ID" ]; then
  docker compose exec garage1 /garage layout assign -z 1 -c 1024 $GARAGE3_ID
  sleep 1
else
  echo "Error: Could not retrieve garage3 node ID"
  exit 1
fi

echo "Staged layout:"
docker compose exec garage1 /garage layout show

# 5. Apply the layout
echo "Applying cluster layout..."
docker compose exec garage1 /garage layout apply --version 1
sleep 2

echo "Final layout:"
docker compose exec garage1 /garage layout show

# 6. Create the S3 bucket (if not already present)
echo "Creating S3 bucket 'dzinza-storage-bucket'..."
docker compose exec garage1 /garage bucket create dzinza-storage-bucket || true
sleep 1
docker compose exec garage1 /garage bucket list

echo "Garage 3-node cluster setup complete!"
