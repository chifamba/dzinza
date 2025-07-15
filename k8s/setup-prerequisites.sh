#!/bin/bash

# Dzinza Kubernetes Prerequisites Setup Script
# This script installs and configures prerequisites for the Kubernetes deployment

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

# Check if running on macOS
check_macos() {
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "This script is designed for macOS. Please install prerequisites manually on other systems."
        exit 1
    fi
    print_success "Running on macOS"
}

# Check if Homebrew is installed
check_homebrew() {
    if ! command -v brew &> /dev/null; then
        print_status "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        print_success "Homebrew installed"
    else
        print_success "Homebrew already installed"
    fi
}

# Install Docker Desktop
install_docker_desktop() {
    if ! command -v docker &> /dev/null; then
        print_status "Installing Docker Desktop..."
        brew install --cask docker
        
        print_warning "Please start Docker Desktop application and enable Kubernetes in settings"
        print_warning "Go to Docker Desktop → Settings → Kubernetes → Enable Kubernetes"
        print_warning "Allocate at least 8GB RAM and 4 CPU cores to Docker Desktop"
        
        read -p "Press enter after Docker Desktop is running and Kubernetes is enabled..."
        print_success "Docker Desktop installed"
    else
        print_success "Docker Desktop already installed"
    fi
}

# Install kubectl
install_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        print_status "Installing kubectl..."
        brew install kubectl
        print_success "kubectl installed"
    else
        print_success "kubectl already installed"
    fi
}

# Install Istio
install_istio() {
    if ! command -v istioctl &> /dev/null; then
        print_status "Installing Istio..."
        
        # Download Istio
        curl -L https://istio.io/downloadIstio | sh -
        
        # Find the latest Istio directory
        ISTIO_DIR=$(find . -name "istio-*" -type d | head -n 1)
        
        if [ -n "$ISTIO_DIR" ]; then
            # Copy istioctl to /usr/local/bin
            sudo cp "$ISTIO_DIR/bin/istioctl" /usr/local/bin/
            
            # Clean up
            rm -rf "$ISTIO_DIR"
            
            print_success "Istio installed"
        else
            print_error "Failed to find Istio directory"
            exit 1
        fi
    else
        print_success "Istio already installed"
    fi
}

# Install Helm (optional)
install_helm() {
    if ! command -v helm &> /dev/null; then
        print_status "Installing Helm..."
        brew install helm
        print_success "Helm installed"
    else
        print_success "Helm already installed"
    fi
}

# Verify Docker Desktop Kubernetes
verify_kubernetes() {
    print_status "Verifying Kubernetes cluster..."
    
    # Wait for Kubernetes to be ready
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if kubectl cluster-info &> /dev/null; then
            print_success "Kubernetes cluster is ready"
            return 0
        fi
        
        attempt=$((attempt + 1))
        print_status "Waiting for Kubernetes cluster... (attempt $attempt/$max_attempts)"
        sleep 10
    done
    
    print_error "Kubernetes cluster is not ready. Please check Docker Desktop settings."
    exit 1
}

# Check system resources
check_system_resources() {
    print_status "Checking system resources..."
    
    # Check available RAM
    local total_ram_gb=$(system_profiler SPHardwareDataType | grep "Memory:" | awk '{print $2}' | sed 's/GB//')
    if [ "$total_ram_gb" -lt 8 ]; then
        print_warning "System has less than 8GB RAM. Performance may be degraded."
    else
        print_success "Sufficient RAM available ($total_ram_gb GB)"
    fi
    
    # Check available disk space
    local available_space=$(df -h . | awk 'NR==2 {print $4}' | sed 's/Gi//')
    if [ "${available_space%.*}" -lt 20 ]; then
        print_warning "Less than 20GB disk space available. Consider freeing up space."
    else
        print_success "Sufficient disk space available"
    fi
}

# Create sample secrets file
create_sample_secrets() {
    print_status "Creating sample secrets file..."
    
    local secrets_file="k8s/manifests/secrets/dzinza-secrets-sample.yaml"
    
    cat > "$secrets_file" << 'EOF'
# Sample secrets file - COPY THIS TO dzinza-secrets.yaml AND UPDATE WITH REAL VALUES
# 
# cp k8s/manifests/secrets/dzinza-secrets-sample.yaml k8s/manifests/secrets/dzinza-secrets.yaml
# 
# Then edit dzinza-secrets.yaml with your actual secret values

apiVersion: v1
kind: Secret
metadata:
  name: dzinza-secrets
  namespace: dzinza
type: Opaque
stringData:
  # Database passwords - CHANGE THESE
  db_password: "your_postgres_password_here"
  mongo_password: "your_mongo_password_here"
  redis_password: "your_redis_password_here"
  elasticsearch_password: "your_elasticsearch_password_here"

  # JWT secrets - GENERATE STRONG RANDOM VALUES
  jwt_secret: "your_jwt_secret_256_bit_key_here"
  jwt_refresh_secret: "your_jwt_refresh_secret_256_bit_key_here"

  # API keys
  api_key_general: "your_general_api_key_here"

  # AWS/S3 credentials for Garage storage
  aws_access_key_id: "your_garage_access_key_here"
  aws_secret_access_key: "your_garage_secret_key_here"

  # SMTP configuration for email
  smtp_pass: "your_smtp_password_here"

  # Monitoring
  grafana_password: "your_grafana_admin_password_here"

  # OAuth credentials
  google_client_id: "your_google_oauth_client_id_here"
  google_client_secret: "your_google_oauth_client_secret_here"

  # MinIO/Storage credentials
  minio_access_key: "your_minio_access_key_here"
  minio_secret_key: "your_minio_secret_key_here"

  # Seed data
  seed_admin_password: "your_initial_admin_password_here"
EOF

    print_success "Sample secrets file created at $secrets_file"
    print_warning "Remember to copy this to dzinza-secrets.yaml and update with real values!"
}

# Print next steps
print_next_steps() {
    print_success "Prerequisites installation completed!"
    echo ""
    echo "Next Steps:"
    echo "==========="
    echo "1. Copy the sample secrets file and update with real values:"
    echo "   cp k8s/manifests/secrets/dzinza-secrets-sample.yaml k8s/manifests/secrets/dzinza-secrets.yaml"
    echo "   nano k8s/manifests/secrets/dzinza-secrets.yaml"
    echo ""
    echo "2. Deploy the application:"
    echo "   cd k8s"
    echo "   ./deploy.sh"
    echo ""
    echo "3. Access the application at:"
    echo "   http://dzinza.local"
    echo ""
    echo "Installed Tools:"
    echo "==============="
    echo "- Docker Desktop: $(docker --version 2>/dev/null || echo 'Not installed')"
    echo "- kubectl: $(kubectl version --client --short 2>/dev/null || echo 'Not installed')"
    echo "- istioctl: $(istioctl version --short 2>/dev/null || echo 'Not installed')"
    echo "- helm: $(helm version --short 2>/dev/null || echo 'Not installed')"
}

# Main function
main() {
    print_status "Starting Dzinza Kubernetes prerequisites setup..."
    
    check_macos
    check_homebrew
    install_docker_desktop
    install_kubectl
    install_istio
    install_helm
    verify_kubernetes
    check_system_resources
    create_sample_secrets
    print_next_steps
    
    print_success "Prerequisites setup completed successfully!"
}

# Run main function
main "$@"
