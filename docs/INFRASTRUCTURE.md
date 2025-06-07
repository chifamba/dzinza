# Infrastructure

This document outlines the cloud infrastructure and DevOps setup for the Dzinza Genealogy Platform.

## Cloud Architecture

### AWS Infrastructure

#### Core Services
- **EKS (Elastic Kubernetes Service)**: Container orchestration
- **RDS (PostgreSQL)**: Primary database
- **ElastiCache (Redis)**: Caching and session storage
- **Amazon OpenSearch**: Search functionality
- **S3**: Object storage for photos and documents
- **CloudFront**: CDN for global content delivery
- **Route 53**: DNS management
- **Application Load Balancer**: Traffic distribution

#### Security Services
- **WAF (Web Application Firewall)**: Protection against common attacks
- **Shield**: DDoS protection
- **KMS**: Key management for encryption
- **Secrets Manager**: Secure credential storage
- **IAM**: Identity and access management

#### Monitoring & Logging
- **CloudWatch**: Metrics and alerting
- **X-Ray**: Distributed tracing
- **VPC Flow Logs**: Network monitoring
- **Config**: Compliance monitoring

### Kubernetes Configuration

#### Cluster Setup
```yaml
# cluster-config.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: dzinza-production
  region: us-west-2
  version: "1.27"

nodeGroups:
  - name: worker-nodes
    instanceType: t3.medium
    desiredCapacity: 3
    minSize: 2
    maxSize: 10
    volumeSize: 20
    ssh:
      allow: false
```

#### Namespaces
- `production`: Production workloads
- `staging`: Staging environment
- `monitoring`: Observability stack
- `ingress-nginx`: Ingress controller

### Infrastructure as Code

#### Terraform Modules
```hcl
# main.tf
module "vpc" {
  source = "./modules/vpc"
  environment = var.environment
}

module "eks" {
  source = "./modules/eks"
  vpc_id = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
}

module "rds" {
  source = "./modules/rds"
  vpc_id = module.vpc.vpc_id
  subnet_ids = module.vpc.database_subnet_ids
}
```

#### Environment Management
- **Development**: Single node cluster, reduced resources
- **Staging**: Production-like setup with smaller instances
- **Production**: Multi-AZ, auto-scaling, full security

## Container Strategy

### Docker Images

#### Base Images
```dockerfile
# Base Node.js image
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Build stage
FROM base AS builder
COPY . .
RUN npm run build

# Runtime stage
FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

#### Image Optimization
- Multi-stage builds to reduce image size
- Alpine Linux base images
- Layer caching optimization
- Security scanning with Trivy

### Container Registry
- **Amazon ECR**: Private container registry
- **Image Scanning**: Automated vulnerability detection
- **Lifecycle Policies**: Automatic cleanup of old images

## Network Architecture

### VPC Design
```
Internet Gateway
    |
Public Subnets (NAT Gateways)
    |
Private Subnets (Application)
    |
Database Subnets (Isolated)
```

#### Security Groups
- **ALB Security Group**: HTTP/HTTPS from internet
- **Application Security Group**: Traffic from ALB only
- **Database Security Group**: Traffic from application only

#### Network ACLs
- Subnet-level security controls
- Allow necessary traffic only
- Log denied connections

## CI/CD Pipeline

### GitHub Actions Integration
```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2
      
      - name: Deploy to EKS
        run: |
          aws eks update-kubeconfig --name dzinza-production
          kubectl apply -f k8s/
```

### Deployment Strategies
- **Blue-Green Deployments**: Zero-downtime updates
- **Canary Releases**: Gradual rollouts
- **Rollback Procedures**: Quick recovery from issues

## Backup and Disaster Recovery

### Database Backups
- **Automated Backups**: Daily full backups
- **Point-in-time Recovery**: Up to 35 days
- **Cross-region Replication**: Disaster recovery
- **Backup Testing**: Monthly restore verification

### Application Data
- **S3 Versioning**: File history preservation
- **Cross-region Replication**: Geographic redundancy
- **Lifecycle Policies**: Cost optimization

### Recovery Procedures
1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Disaster Recovery Testing**: Quarterly

## Performance Optimization

### Auto-scaling
```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dzinza-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dzinza-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Cluster Auto-scaling
- Node groups scale based on pod requirements
- Spot instances for cost optimization
- Reserved instances for predictable workloads

## Cost Optimization

### Resource Management
- **Right-sizing**: Regular instance type review
- **Spot Instances**: 70% cost savings for non-critical workloads
- **Reserved Instances**: 1-year terms for stable workloads
- **Cost Monitoring**: AWS Cost Explorer integration

### Optimization Strategies
- Automated resource cleanup
- Development environment scheduling
- Storage lifecycle policies
- CDN optimization

## Security Hardening

### Container Security
- Non-root user execution
- Read-only file systems
- Minimal base images
- Regular security updates

### Kubernetes Security
- Pod Security Standards
- Network Policies
- Service Mesh (Istio)
- Secret management with External Secrets Operator

### Compliance
- **SOC 2 Type II**: Security controls
- **GDPR**: Data protection compliance
- **HIPAA**: Healthcare data requirements (if applicable)

## Troubleshooting

### Common Issues

#### Pod Not Starting
```bash
# Check pod status
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name> --previous

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp
```

#### Database Connection Issues
```bash
# Test database connectivity
kubectl run postgres-test --image=postgres:13 --rm -it -- psql -h <rds-endpoint> -U <username>

# Check security groups
aws ec2 describe-security-groups --group-ids <sg-id>
```

#### Performance Issues
```bash
# Check resource usage
kubectl top nodes
kubectl top pods

# Check HPA status
kubectl get hpa
```

### Monitoring Dashboards
- Infrastructure overview
- Application performance
- Database metrics
- Security events

## Maintenance Procedures

### Regular Tasks
- **Weekly**: Security patch review
- **Monthly**: Backup testing
- **Quarterly**: Disaster recovery testing
- **Annually**: Full security audit

### Upgrade Procedures
1. **Kubernetes**: Rolling cluster upgrades
2. **Applications**: Blue-green deployments
3. **Database**: Maintenance windows
4. **Security**: Immediate critical patches

## Contact Information

### Infrastructure Team
- **Primary Contact**: DevOps Lead
- **Escalation**: Engineering Manager
- **Emergency**: 24/7 on-call rotation

### External Support
- **AWS Support**: Enterprise level
- **Third-party Services**: Datadog, PagerDuty
- **Security Consultants**: Annual penetration testing
