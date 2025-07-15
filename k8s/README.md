# Dzinza Kubernetes Deployment with Istio Service Mesh

This directory contains all the necessary Kubernetes manifests and scripts to deploy the Dzinza genealogy platform on a local Kubernetes cluster (Docker Desktop) with Istio service mesh.

## Architecture Overview

The Kubernetes deployment includes:

- **Microservices**: Auth, Backend (API Gateway), Genealogy, Search, Storage, Frontend
- **Databases**: PostgreSQL, MongoDB, Redis, Elasticsearch
- **Storage**: Garage (S3-compatible storage)
- **Service Mesh**: Istio for traffic management, security, and observability
- **Monitoring**: Built-in Istio observability tools (Kiali, Grafana, Jaeger)

## Prerequisites

### Required Software

1. **Docker Desktop** with Kubernetes enabled

   - Install Docker Desktop for macOS
   - Enable Kubernetes in Docker Desktop settings
   - Allocate at least 8GB RAM and 4 CPUs to Docker

2. **kubectl** - Kubernetes command-line tool

   ```bash
   brew install kubectl
   ```

3. **Istio** - Service mesh platform

   ```bash
   # Download and install Istio (latest stable version)
   curl -L https://istio.io/downloadIstio | sh -
   cd istio-*
   sudo cp bin/istioctl /usr/local/bin/
   ```

4. **Helm** (optional, for package management)
   ```bash
   brew install helm
   ```

### System Requirements

- **macOS** (tested on macOS)
- **8GB RAM minimum** (16GB recommended)
- **4 CPU cores minimum**
- **20GB free disk space**

## Quick Start

### 1. Prepare Secrets

Before deployment, you **must** update the secrets file with actual values:

```bash
# Edit the secrets file
nano k8s/manifests/secrets/dzinza-secrets.yaml
```

Replace all `REPLACE_WITH_ACTUAL_*` placeholders with real values:

- Database passwords
- JWT secrets (use strong random values)
- API keys
- SMTP credentials
- OAuth credentials

### 2. Deploy the Application

Run the automated deployment script:

```bash
cd k8s
./deploy.sh
```

The script will:

1. Verify prerequisites
2. Install Istio (if not already installed)
3. Build Docker images (optional)
4. Deploy all Kubernetes manifests
5. Configure Istio service mesh
6. Set up local hostname resolution

### 3. Access the Application

After successful deployment:

- **Main Application**: http://dzinza.local
- **API Gateway**: http://dzinza.local/api/v1
- **Individual Services**: Available through the gateway

## Manual Deployment

If you prefer manual deployment or need to troubleshoot:

### 1. Install Istio

```bash
# Install Istio with default profile
istioctl install --set values.defaultRevision=default -y

# Enable automatic sidecar injection
kubectl label namespace default istio-injection=enabled
```

### 2. Deploy in Order

```bash
cd k8s/manifests

# 1. Create namespaces
kubectl apply -f namespaces/

# 2. Deploy secrets (after updating with real values)
kubectl apply -f secrets/

# 3. Deploy config maps
kubectl apply -f configmaps/

# 4. Deploy databases
kubectl apply -f databases/

# 5. Wait for databases to be ready
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n dzinza
kubectl wait --for=condition=available --timeout=300s deployment/mongodb -n dzinza
kubectl wait --for=condition=available --timeout=300s deployment/redis -n dzinza
kubectl wait --for=condition=available --timeout=300s deployment/elasticsearch -n dzinza

# 6. Deploy application services
kubectl apply -f services/

# 7. Deploy Istio configuration
kubectl apply -f istio/
```

### 3. Build Docker Images

```bash
# Build all service images
docker build -t dzinza/auth-service:latest ./auth-service/
docker build -t dzinza/backend-service:latest ./backend-service/
docker build -t dzinza/genealogy-service:latest ./genealogy-service/
docker build -t dzinza/search-service:latest ./search-service/
docker build -t dzinza/storage-service:latest ./storage-service/
docker build -t dzinza/frontend:latest ./frontend/
```

### 4. Set Up Local Access

```bash
# Add hostname to /etc/hosts
echo "127.0.0.1 dzinza.local" | sudo tee -a /etc/hosts
```

## Directory Structure

```
k8s/
├── deploy.sh                    # Automated deployment script
├── README.md                    # This documentation
└── manifests/
    ├── namespaces/             # Kubernetes namespaces
    │   └── dzinza-namespace.yaml
    ├── secrets/                # Application secrets
    │   └── dzinza-secrets.yaml
    ├── configmaps/             # Configuration maps
    │   └── dzinza-config.yaml
    ├── databases/              # Database deployments
    │   ├── postgres.yaml
    │   ├── mongodb.yaml
    │   ├── redis.yaml
    │   └── elasticsearch.yaml
    ├── services/               # Application services
    │   ├── auth-service.yaml
    │   ├── backend-service.yaml
    │   ├── genealogy-service.yaml
    │   ├── search-service.yaml
    │   ├── storage-service.yaml
    │   ├── frontend.yaml
    │   └── garage-service.yaml
    └── istio/                  # Istio service mesh config
        ├── gateway.yaml
        └── destination-rules.yaml
```

## Service Details

### Application Services

| Service           | Port  | Purpose                        | Replicas |
| ----------------- | ----- | ------------------------------ | -------- |
| Frontend          | 8080  | React web application          | 2        |
| Backend Service   | 8000  | API Gateway                    | 2        |
| Auth Service      | 8000  | Authentication & authorization | 2        |
| Genealogy Service | 8000  | Family tree management         | 2        |
| Search Service    | 8000  | Search functionality           | 2        |
| Storage Service   | 8000  | File storage management        | 2        |
| Garage Service    | 39000 | S3-compatible storage          | 1        |

### Database Services

| Database      | Port  | Purpose                  | Storage |
| ------------- | ----- | ------------------------ | ------- |
| PostgreSQL    | 5432  | Main relational database | 10Gi    |
| MongoDB       | 27017 | Document storage         | 20Gi    |
| Redis         | 6379  | Caching & sessions       | 5Gi     |
| Elasticsearch | 9200  | Search indexing          | 15Gi    |

### Workers

- **Genealogy Worker**: Celery worker for background tasks (2 replicas)

## Istio Service Mesh Features

### Traffic Management

- **Gateway**: Ingress gateway for external traffic
- **Virtual Service**: Traffic routing rules
- **Destination Rules**: Load balancing and circuit breaking

### Security

- **Automatic mTLS**: Service-to-service encryption
- **Authorization Policies**: Access control between services
- **Network Policies**: Network segmentation

### Observability

- **Distributed Tracing**: Request tracing across services
- **Metrics Collection**: Prometheus metrics
- **Service Graph**: Visual service topology

## Monitoring and Observability

### Istio Dashboards

```bash
# Open Kiali dashboard (service mesh visualization)
istioctl dashboard kiali

# Open Grafana dashboard (metrics)
istioctl dashboard grafana

# Open Jaeger dashboard (distributed tracing)
istioctl dashboard jaeger

# Open Prometheus dashboard (raw metrics)
istioctl dashboard prometheus
```

### Kubernetes Monitoring

```bash
# View all pods
kubectl get pods -n dzinza

# View services
kubectl get services -n dzinza

# View deployments
kubectl get deployments -n dzinza

# Check pod logs
kubectl logs -f deployment/auth-service -n dzinza

# View Istio configuration
kubectl get gateway,virtualservice,destinationrule -n dzinza
```

## Troubleshooting

### Common Issues

1. **Pods stuck in Pending state**

   ```bash
   # Check resource allocation
   kubectl describe pod <pod-name> -n dzinza

   # Increase Docker Desktop resources if needed
   ```

2. **Services not accessible**

   ```bash
   # Check Istio ingress gateway
   kubectl get svc istio-ingressgateway -n istio-system

   # Verify hostname resolution
   ping dzinza.local
   ```

3. **Database connection issues**

   ```bash
   # Check database pod status
   kubectl get pods -n dzinza | grep -E "(postgres|mongodb|redis)"

   # Check database logs
   kubectl logs deployment/postgres -n dzinza
   ```

4. **Istio sidecar not injected**

   ```bash
   # Verify namespace labeling
   kubectl get namespace dzinza --show-labels

   # Restart deployment to inject sidecar
   kubectl rollout restart deployment/auth-service -n dzinza
   ```

### Debug Commands

```bash
# Get all resources in dzinza namespace
kubectl get all -n dzinza

# Describe a problematic pod
kubectl describe pod <pod-name> -n dzinza

# Check Istio proxy configuration
istioctl proxy-config cluster <pod-name> -n dzinza

# View Istio configuration
istioctl analyze -n dzinza

# Check service mesh connectivity
istioctl proxy-config endpoints <pod-name> -n dzinza
```

## Security Considerations

### Secrets Management

- Update all default passwords and secrets
- Use strong, randomly generated values
- Consider using external secret management (e.g., HashiCorp Vault)

### Network Security

- Istio automatically enables mTLS between services
- Network policies restrict inter-pod communication
- External access is controlled through Istio Gateway

### Image Security

- Use specific image tags instead of `latest`
- Scan images for vulnerabilities
- Use private registry for production

## Scaling

### Horizontal Pod Autoscaling

```yaml
# Example HPA for auth-service
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service-hpa
  namespace: dzinza
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Manual Scaling

```bash
# Scale a deployment
kubectl scale deployment auth-service --replicas=5 -n dzinza

# Scale multiple deployments
kubectl scale deployment frontend backend-service genealogy-service --replicas=3 -n dzinza
```

## Backup and Recovery

### Database Backups

```bash
# PostgreSQL backup
kubectl exec deployment/postgres -n dzinza -- pg_dump -U dzinza_user dzinza_db > backup.sql

# MongoDB backup
kubectl exec deployment/mongodb -n dzinza -- mongodump --uri="mongodb://dzinza_user:password@localhost:27017/dzinza_genealogy"

# Redis backup
kubectl exec deployment/redis -n dzinza -- redis-cli BGSAVE
```

### Configuration Backup

```bash
# Export all configurations
kubectl get all,configmap,secret,gateway,virtualservice,destinationrule -n dzinza -o yaml > dzinza-backup.yaml
```

## Cleanup

### Remove Application

```bash
# Remove all Dzinza resources
kubectl delete namespace dzinza

# Remove Istio (optional)
istioctl uninstall --purge -y
kubectl delete namespace istio-system
```

### Remove hostname entry

```bash
# Remove from /etc/hosts
sudo sed -i '' '/dzinza.local/d' /etc/hosts
```

## Performance Tuning

### Resource Requests and Limits

- Adjust CPU and memory requests/limits based on actual usage
- Monitor resource usage with Grafana dashboards
- Use Vertical Pod Autoscaler for automatic resource adjustment

### Database Optimization

- Configure appropriate connection pooling
- Tune database-specific parameters
- Consider read replicas for high-read workloads

### Istio Performance

- Adjust proxy resource limits
- Configure appropriate circuit breaker settings
- Monitor service mesh overhead

## Contributing

When adding new services or modifying existing ones:

1. Update the appropriate manifest files
2. Add health checks for all services
3. Configure Istio policies (if needed)
4. Update this documentation
5. Test the deployment thoroughly

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review Kubernetes and Istio logs
3. Consult Istio documentation
4. File an issue in the project repository
