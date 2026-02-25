# RePosition – AWS Infrastructure (EKS)

Terraform-managed infrastructure for the RePosition application on AWS EKS.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) 1.0+
- [AWS CLI](https://aws.amazon.com/cli/) configured
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Helm](https://helm.sh/docs/intro/install/) 3.x

## Infrastructure Overview

| Component | Description |
|----------|-------------|
| **VPC (3-tier)** | 6 subnets: 2 public, 2 private app, 2 private data |
| **NAT Gateway** | Single NAT GW for private subnets (cost-optimised) |
| **S3 Gateway Endpoint** | Free endpoint for ECR image layers |
| **EKS Cluster** | Kubernetes 1.31 with KMS secrets encryption |
| **Karpenter** | Spot + Graviton node autoscaling |
| **AWS LB Controller** | ALB from Kubernetes Ingress |
| **External Secrets** | Syncs AWS Secrets Manager → K8s Secrets |
| **ArgoCD** | GitOps (Non-HA) |
| **Fluent Bit** | Logs → CloudWatch |
| **RDS PostgreSQL** | Managed DB in data tier (private) |
| **Secrets Manager** | DATABASE_URL + SESSION_SECRET |
| **ECR** | Docker image registry |
| **S3 + CloudFront** | Static frontend hosting |
| **WAF** | Web Application Firewall for CloudFront |

---

## Architecture

```
Internet
    ↓
CloudFront (WAF) ──→ S3 (Frontend)
    ↓
CloudFront /api/* ──→ ALB (Public Subnets)
                        ↓
                   EKS Nodes (App Tier – Private Subnets)
                        ↓  ←── NAT GW (outbound internet)
                   RDS PostgreSQL (Data Tier – Private Subnets)
```

### VPC Layout

| Subnet | CIDR | AZ | Tier |
|--------|------|----|------|
| `public-1` | `10.0.1.0/24` | az-1 | Public (ALB, NAT) |
| `public-2` | `10.0.2.0/24` | az-2 | Public (ALB) |
| `app-1` | `10.0.11.0/24` | az-1 | Private – App (EKS) |
| `app-2` | `10.0.12.0/24` | az-2 | Private – App (EKS) |
| `data-1` | `10.0.21.0/24` | az-1 | Private – Data (RDS) |
| `data-2` | `10.0.22.0/24` | az-2 | Private – Data (RDS) |

### Security Groups

```
ALB SG (80, 443 from internet)
   → EKS Nodes SG (5000 from ALB)
      → RDS SG (5432 from EKS only)
```

---

## Quick Start

### 1. Deploy Infrastructure

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

terraform init
terraform plan
terraform apply
```

### 2. Configure kubectl

```bash
aws eks update-kubeconfig --name reposition --region eu-west-1
kubectl get nodes   # verify connection
```

### 3. Build and Push First Image

```bash
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin <ecr_repository_url>
docker build -t reposition .
docker tag reposition:latest <ecr_repository_url>:latest
docker push <ecr_repository_url>:latest
```

### 4. Deploy Application via ArgoCD

```bash
# Update k8s/charts/reposition/values-production.yaml with:
# - image.repository: <ecr_repository_url>
# - ingress annotations: subnet IDs, cert ARN, SG, WAF ARN (from terraform output)

kubectl apply -f k8s/platform/argocd-app.yaml
```

### 5. Get ALB DNS and Connect CloudFront

```bash
# Wait for ALB creation
kubectl get ingress -n reposition

# Copy the ALB DNS from ADDRESS column, then:
terraform apply -var eks_ingress_alb_dns="<ALB_DNS>"
```

---

## EKS Components

### Karpenter (Node Autoscaling)

- **System Node Group**: 1× `t4g.medium` On-Demand (Karpenter controller + add-ons)
- **Workload Nodes**: Spot instances, ARM64 (Graviton): `t4g.small`, `t4g.medium`, `m7g.medium`
- **Consolidation**: `WhenEmptyOrUnderutilized` — removes idle nodes within 60s
- **Limits**: max 8 vCPU, 16Gi memory

### Platform Add-ons

| Add-on | Namespace | Purpose |
|--------|-----------|---------|
| Karpenter | `kube-system` | Node autoscaling |
| AWS LB Controller | `kube-system` | ALB from Ingress |
| External Secrets | `external-secrets` | Secrets Manager → K8s |
| Fluent Bit | `kube-system` | Logs → CloudWatch |
| ArgoCD | `argocd` | GitOps deployments |

### Pod Identity (IAM)

| Role | Permissions |
|------|-------------|
| `reposition-aws-lb-controller` | ELB, EC2, ACM, WAF |
| `reposition-external-secrets` | SecretsManager:GetSecretValue |
| `reposition-fluent-bit` | CloudWatch Logs |
| `reposition-karpenter-node` | EC2, SSM, Pricing |

---

## Helm Chart

Located at `k8s/charts/reposition/`. Templates:

| Template | Resource |
|----------|----------|
| `deployment.yaml` | Deployment with probes, security context, topology spread |
| `service.yaml` | ClusterIP Service |
| `ingress.yaml` | ALB Ingress (internet-facing, HTTPS) |
| `external-secret.yaml` | SecretStore + ExternalSecret |
| `network-policy.yaml` | Default deny + explicit allow rules |
| `hpa.yaml` | HPA (1-4 replicas, CPU 80%) |
| `namespace.yaml` | Namespace with Pod Security Standards (restricted) |

---

## RDS PostgreSQL

- **Engine**: PostgreSQL 16
- **Location**: Data Tier (private subnets)
- **Access**: EKS nodes only (via Security Group)
- **Credentials**: Auto-generated, stored in Secrets Manager (`reposition/app`)

---

## GitHub Actions (CI/CD)

| Workflow | Trigger | Action |
|----------|---------|--------|
| **Backend** | Push to `main` (server, Dockerfile, etc.) | Build → Push to ECR → `kubectl set image` |
| **Frontend** | Push to `main` (client, vite, etc.) | Build → S3 sync → CloudFront invalidation |
| **Rollback Backend** | Manual (image digest) | `kubectl set image` to previous digest |
| **Rollback Frontend** | Manual (commit SHA) | Build from commit → S3 sync |

### GitHub Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_ROLE_ARN` | **Yes** | — | IAM Role ARN (OIDC) |
| `AWS_REGION` | No | `eu-west-1` | AWS region |
| `ECR_REPOSITORY` | No | `reposition` | ECR repository name |
| `EKS_CLUSTER` | No | `reposition` | EKS cluster name |
| `S3_BUCKET` | **Yes** (frontend) | — | Frontend S3 bucket |
| `CLOUDFRONT_DISTRIBUTION_ID` | **Yes** (frontend) | — | CloudFront distribution ID |
| `VITE_API_URL` | **Yes** (frontend) | — | CloudFront URL for API proxy |

---

## Custom Domain and HTTPS

1. Create a Route53 hosted zone and copy the Zone ID
2. Set in `terraform.tfvars`:
   ```hcl
   domain_name     = "re-position.org"
   api_domain_name = "api.re-position.org"
   route53_zone_id = "Z1234567890ABCDEF"
   ```
3. `terraform apply` — creates ACM certificates and DNS records
4. After deploy: set `eks_ingress_alb_dns` to connect Route53 → ALB

---

## Cost Estimate (~$170/month)

| Resource | Monthly |
|----------|---------|
| EKS Control Plane | ~$73 |
| System Node (t4g.medium On-Demand) | ~$24 |
| App Node (t4g.small Spot) | ~$3.5 |
| NAT Gateway | ~$32 |
| RDS db.t3.micro | ~$15 |
| ALB | ~$16 |
| Other (Secrets, CloudWatch, ECR, S3, CF) | ~$6 |

---

## Terraform Files

| File | Description |
|------|-------------|
| `main.tf` | VPC, subnets (3-tier), NAT GW, S3 endpoint |
| `eks.tf` | EKS cluster, node group, Karpenter, KMS |
| `pod_identity.tf` | IAM roles + Pod Identity associations |
| `addons.tf` | Helm: LB Controller, ESO, Fluent Bit |
| `argocd.tf` | Helm: ArgoCD (Non-HA) |
| `security_groups.tf` | ALB → EKS → RDS security groups |
| `rds.tf` | RDS PostgreSQL in data tier |
| `secrets.tf` | Secrets Manager + random passwords |
| `ecr.tf` | ECR repository + lifecycle |
| `s3-cloudfront.tf` | S3, CloudFront, OAC |
| `domain.tf` | ACM certificates, Route53 records |
| `waf.tf` | WAF for CloudFront |
| `variables.tf` | Input variables |
| `outputs.tf` | Output values |
| `versions.tf` | Provider versions |
