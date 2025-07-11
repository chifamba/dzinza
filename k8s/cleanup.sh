#!/bin/bash

# Dzinza Kubernetes Cleanup Script
# This script removes all Dzinza resources from Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Confirm cleanup
confirm_cleanup() {
    print_warning "This will remove ALL Dzinza resources from Kubernetes!"
    print_warning "This action cannot be undone!"
    echo ""
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleanup cancelled"
        exit 0
    fi
}

# Remove Dzinza namespace and all resources
remove_dzinza_resources() {
    print_status "Removing Dzinza namespace and all resources..."
    
    if kubectl get namespace dzinza &> /dev/null; then
        kubectl delete namespace dzinza
        print_success "Dzinza namespace and all resources removed"
    else
        print_warning "Dzinza namespace not found"
    fi
    
    if kubectl get namespace dzinza-system &> /dev/null; then
        kubectl delete namespace dzinza-system
        print_success "Dzinza-system namespace removed"
    else
        print_warning "Dzinza-system namespace not found"
    fi
}

# Remove Istio (optional)
remove_istio() {
    print_status "Do you want to remove Istio as well?"
    read -p "Remove Istio? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Removing Istio..."
        
        if command -v istioctl &> /dev/null; then
            istioctl uninstall --purge -y
            kubectl delete namespace istio-system
            print_success "Istio removed"
        else
            print_error "istioctl not found. Cannot remove Istio automatically."
            print_status "You may need to remove Istio manually"
        fi
    else
        print_status "Keeping Istio installation"
    fi
}

# Remove hostname entry
remove_hostname() {
    print_status "Removing hostname entry from /etc/hosts..."
    
    if grep -q "dzinza.local" /etc/hosts; then
        sudo sed -i '' '/dzinza.local/d' /etc/hosts
        print_success "Hostname entry removed from /etc/hosts"
    else
        print_warning "Hostname entry not found in /etc/hosts"
    fi
}

# Clean up Docker images (optional)
cleanup_docker_images() {
    print_status "Do you want to remove Dzinza Docker images?"
    read -p "Remove Docker images? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Removing Dzinza Docker images..."
        
        # Remove Dzinza images
        docker images | grep "dzinza/" | awk '{print $3}' | xargs -r docker rmi -f
        
        # Remove dangling images
        docker image prune -f
        
        print_success "Docker images cleaned up"
    else
        print_status "Keeping Docker images"
    fi
}

# Verify cleanup
verify_cleanup() {
    print_status "Verifying cleanup..."
    
    # Check for remaining Dzinza resources
    local remaining_pods=$(kubectl get pods --all-namespaces | grep dzinza | wc -l || echo "0")
    local remaining_services=$(kubectl get services --all-namespaces | grep dzinza | wc -l || echo "0")
    
    if [ "$remaining_pods" -eq 0 ] && [ "$remaining_services" -eq 0 ]; then
        print_success "Cleanup completed successfully!"
        print_success "No remaining Dzinza resources found"
    else
        print_warning "Some resources may still exist:"
        kubectl get all --all-namespaces | grep dzinza || true
    fi
}

# Print cleanup summary
print_cleanup_summary() {
    print_success "Cleanup completed!"
    echo ""
    echo "Cleanup Summary:"
    echo "==============="
    echo "✓ Dzinza namespace and resources removed"
    echo "✓ Hostname entry removed from /etc/hosts"
    
    if command -v istioctl &> /dev/null; then
        if kubectl get namespace istio-system &> /dev/null; then
            echo "- Istio: Still installed"
        else
            echo "✓ Istio: Removed"
        fi
    fi
    
    echo ""
    echo "What remains:"
    echo "============"
    echo "- Docker Desktop (if installed)"
    echo "- kubectl (if installed)"
    echo "- istioctl (if installed and not removed)"
    echo "- helm (if installed)"
    echo ""
    echo "To completely remove all tools, run:"
    echo "brew uninstall kubectl helm"
    echo "brew uninstall --cask docker"
    echo "sudo rm /usr/local/bin/istioctl"
}

# Main cleanup function
main() {
    print_status "Starting Dzinza Kubernetes cleanup..."
    
    confirm_cleanup
    remove_dzinza_resources
    remove_istio
    remove_hostname
    cleanup_docker_images
    verify_cleanup
    print_cleanup_summary
    
    print_success "Dzinza cleanup completed successfully!"
}

# Run main function
main "$@"
