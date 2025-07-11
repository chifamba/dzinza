#!/bin/bash

# Dzinza Kubernetes Deployment Script
# This script deploys the Dzinza application to Kubernetes with Istio service mesh

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

# Check if kubectl is installed
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    print_success "kubectl found"
}

# Check if istioctl is installed
check_istioctl() {
    if ! command -v istioctl &> /dev/null; then
        print_error "istioctl is not installed. Please install Istio first."
        exit 1
    fi
    print_success "istioctl found"
}

# Check if Docker Desktop Kubernetes is running
check_kubernetes() {
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Kubernetes cluster is not accessible. Please ensure Docker Desktop Kubernetes is enabled."
        exit 1
    fi
    print_success "Kubernetes cluster is accessible"
}

# Install Istio if not already installed
install_istio() {
    print_status "Checking Istio installation..."
    
    if ! kubectl get namespace istio-system &> /dev/null; then
        print_status "Installing Istio..."
        istioctl install --set values.defaultRevision=default -y
        
        print_status "Enabling Istio injection for default namespace..."
        kubectl label namespace default istio-injection=enabled --overwrite
        
        print_success "Istio installed successfully"
    else
        print_success "Istio is already installed"
    fi
}

# Deploy namespaces
deploy_namespaces() {
    print_status "Creating namespaces..."
    kubectl apply -f manifests/namespaces/
    print_success "Namespaces created"
}

# Deploy secrets (after updating with actual values)
deploy_secrets() {
    print_status "Deploying secrets..."
    print_warning "Please ensure you have updated the secrets in manifests/secrets/dzinza-secrets.yaml with actual values"
    read -p "Have you updated the secrets? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl apply -f manifests/secrets/
        print_success "Secrets deployed"
    else
        print_error "Please update the secrets before continuing"
        exit 1
    fi
}

# Deploy config maps
deploy_configmaps() {
    print_status "Deploying config maps..."
    kubectl apply -f manifests/configmaps/
    print_success "Config maps deployed"
}

# Deploy databases
deploy_databases() {
    print_status "Deploying databases..."
    kubectl apply -f manifests/databases/
    
    print_status "Waiting for databases to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/postgres -n dzinza
    kubectl wait --for=condition=available --timeout=300s deployment/mongodb -n dzinza
    kubectl wait --for=condition=available --timeout=300s deployment/redis -n dzinza
    kubectl wait --for=condition=available --timeout=300s deployment/elasticsearch -n dzinza
    
    print_success "Databases deployed and ready"
}

# Deploy services
deploy_services() {
    print_status "Deploying application services..."
    kubectl apply -f manifests/services/
    
    print_status "Waiting for services to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/auth-service -n dzinza
    kubectl wait --for=condition=available --timeout=300s deployment/backend-service -n dzinza
    kubectl wait --for=condition=available --timeout=300s deployment/genealogy-service -n dzinza
    kubectl wait --for=condition=available --timeout=300s deployment/search-service -n dzinza
    kubectl wait --for=condition=available --timeout=300s deployment/storage-service -n dzinza
    kubectl wait --for=condition=available --timeout=300s deployment/frontend -n dzinza
    kubectl wait --for=condition=available --timeout=300s deployment/garage-service -n dzinza
    
    print_success "Application services deployed and ready"
}

# Deploy Istio configuration
deploy_istio_config() {
    print_status "Deploying Istio configuration..."
    kubectl apply -f manifests/istio/
    print_success "Istio configuration deployed"
}

# Build and push Docker images
build_images() {
    print_status "Building Docker images..."
    print_warning "This will build images for all services. Ensure you have Docker running."
    
    read -p "Do you want to build Docker images? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Build auth service
        print_status "Building auth-service image..."
        docker build -t dzinza/auth-service:latest ./auth-service/
        
        # Build backend service
        print_status "Building backend-service image..."
        docker build -t dzinza/backend-service:latest ./backend-service/
        
        # Build genealogy service
        print_status "Building genealogy-service image..."
        docker build -t dzinza/genealogy-service:latest ./genealogy-service/
        
        # Build search service
        print_status "Building search-service image..."
        docker build -t dzinza/search-service:latest ./search-service/
        
        # Build storage service
        print_status "Building storage-service image..."
        docker build -t dzinza/storage-service:latest ./storage-service/
        
        # Build frontend
        print_status "Building frontend image..."
        docker build -t dzinza/frontend:latest ./frontend/
        
        print_success "All images built successfully"
    else
        print_warning "Skipping image build. Ensure images are available in your Docker daemon."
    fi
}

# Add hostname entry
add_hostname() {
    print_status "Adding hostname entry for dzinza.local..."
    
    if ! grep -q "dzinza.local" /etc/hosts; then
        print_status "Adding dzinza.local to /etc/hosts..."
        echo "127.0.0.1 dzinza.local" | sudo tee -a /etc/hosts
        print_success "Hostname added to /etc/hosts"
    else
        print_success "Hostname already exists in /etc/hosts"
    fi
}

# Get access information
get_access_info() {
    print_status "Getting access information..."
    
    # Get Istio ingress gateway external IP
    INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
    SECURE_INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="https")].port}')
    
    if [ -z "$INGRESS_HOST" ]; then
        INGRESS_HOST="localhost"
    fi
    
    print_success "Deployment completed successfully!"
    echo ""
    echo "Access Information:"
    echo "=================="
    echo "Application URL: http://dzinza.local:${INGRESS_PORT:-80}"
    echo "Application URL (HTTPS): https://dzinza.local:${SECURE_INGRESS_PORT:-443}"
    echo "Local access: http://localhost:${INGRESS_PORT:-80}"
    echo ""
    echo "Service URLs:"
    echo "- Frontend: http://dzinza.local:${INGRESS_PORT:-80}"
    echo "- API Gateway: http://dzinza.local:${INGRESS_PORT:-80}/api/v1"
    echo "- Auth Service: http://dzinza.local:${INGRESS_PORT:-80}/api/v1/auth"
    echo "- Genealogy Service: http://dzinza.local:${INGRESS_PORT:-80}/api/v1/genealogy"
    echo "- Search Service: http://dzinza.local:${INGRESS_PORT:-80}/api/v1/search"
    echo "- Storage Service: http://dzinza.local:${INGRESS_PORT:-80}/api/v1/storage"
    echo ""
    echo "Monitoring:"
    echo "- Istio Dashboard: istioctl dashboard kiali"
    echo "- Grafana: istioctl dashboard grafana"
    echo "- Jaeger: istioctl dashboard jaeger"
}

# Main deployment function
main() {
    print_status "Starting Dzinza Kubernetes deployment..."
    
    # Pre-deployment checks
    check_kubectl
    check_istioctl
    check_kubernetes
    
    # Build images
    build_images
    
    # Install Istio
    install_istio
    
    # Deploy in order
    deploy_namespaces
    deploy_secrets
    deploy_configmaps
    deploy_databases
    deploy_services
    deploy_istio_config
    
    # Post-deployment setup
    add_hostname
    get_access_info
    
    print_success "Dzinza deployment completed successfully!"
}

# Run main function
main "$@"
