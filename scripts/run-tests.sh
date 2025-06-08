#!/bin/bash
# Run all tests

echo "Running Dzinza test suite..."

# Frontend tests
echo "Running frontend tests..."
npm run test:coverage

# Backend tests
echo "Running backend tests..."
cd backend && npm run test:coverage && cd ..

# E2E tests
echo "Running E2E tests..."
npm run test:e2e

# Accessibility tests
echo "Running accessibility tests..."
npm run test:accessibility

echo "All tests completed!"
