# RePosition – AWS Infrastructure

Terraform-managed infrastructure for the RePosition application on AWS.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) 1.0+
- [AWS CLI](https://aws.amazon.com/cli/) configured (`aws configure` or `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`)

## Infrastructure Overview

| Component | Description |
|----------|-------------|
| **VPC + Security Groups** | Network and security groups for ALB, ECS, RDS |
| **RDS PostgreSQL + Secrets Manager** | Database and credential storage |
| **ECR** | Docker image registry |
| **ECS (Fargate)** | Cluster, ALB, Task Definition, Service |
| **S3 + CloudFront** | Static frontend hosting |
| **WAF** | Web Application Firewall for CloudFront |
| **GitHub Actions** | CI/CD pipelines |

---

## VPC and Security Groups

### Resources Created

- **VPC** – CIDR `10.0.0.0/16`
- **2 public subnets** – across two Availability Zones for ALB and Fargate
- **Internet Gateway** – internet access (for ECR image pulls)
- **Security groups:**
  - **ALB** – ingress on ports 80, 443 from internet
  - **ECS** – ingress on app port (5000) from ALB only
  - **RDS** – ingress on 5432 from ECS only

### Commands

```bash
cd infra
terraform init
terraform plan   # Review changes
terraform apply  # Apply (confirm with yes)
```

### Outputs

- `vpc_id`
- `public_subnet_ids`
- `alb_security_group_id`
- `ecs_security_group_id`
- `rds_security_group_id`

### Region

Default: `eu-west-1`. Override via:

```bash
terraform apply -var="aws_region=us-east-1"
```

Or in `terraform.tfvars`:

```hcl
aws_region   = "eu-west-1"
project_name = "reposition"
```

---

## RDS PostgreSQL and Secrets Manager

### Resources Created

- **DB Subnet Group** – RDS placed in the two existing subnets
- **RDS Instance** – PostgreSQL 16; password is auto-generated
- **Secrets Manager** – single secret `reposition/app` with JSON:
  - `DATABASE_URL` – PostgreSQL connection string (includes password)
  - `SESSION_SECRET` – session signing key (randomly generated)

The database is **not** internet-accessible (`publicly_accessible = false`). Only ECS within the VPC connects, and credentials are injected from Secrets Manager.

### Commands

No passwords need to be provided; Terraform generates and stores them:

```bash
cd infra
terraform init   # First time after adding random provider
terraform plan
terraform apply
```

### Outputs

- `rds_endpoint`, `rds_port`, `rds_db_name`, `rds_username` – for debugging
- **`app_secret_arn`** – used by ECS to inject `DATABASE_URL` and `SESSION_SECRET`

### Notes

- RDS creation takes several minutes
- Passwords are stored in Terraform state and Secrets Manager only, never in Git

---

## Elastic Container Registry (ECR)

### Resources Created

- **ECR repository** – Docker image registry for the application
- **Image scanning** – automatic vulnerability scan on push
- **Lifecycle policy** – retains only the last N images (default: 10)

### Commands

```bash
cd infra
terraform plan
terraform apply
```

### Outputs

- **`ecr_repository_url`** – for `docker push` / `docker pull`
- **`ecr_repository_arn`** – repository ARN

GitHub Actions: use `aws ecr get-login-password`, tag the image with `ecr_repository_url:tag`, and `docker push`.

---

## ECS Fargate and ALB

### Resources Created

- **ALB** – Application Load Balancer on port 80, forwards to target group
- **Target group** – health check on `/`, port 5000
- **ECS Cluster** – Fargate
- **Task Definition** – image from ECR (`reposition:latest`), env from Secrets Manager (`DATABASE_URL`, `SESSION_SECRET`), `NODE_ENV=production`, `BOOTSTRAP_ON_START`
- **ECS Service** – runs N tasks (default: 1), connected to ALB
- **CloudWatch Log Group** – container logs
- **IAM Role** – permissions for ECR image pull, Secrets Manager read, log write

### Commands

```bash
cd infra
terraform plan
terraform apply
```

### After Apply

The service expects `reposition:latest` in ECR. On first run, build and push manually or via GitHub Actions:

```bash
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.eu-west-1.amazonaws.com
docker build -t reposition .
docker tag reposition:latest <ecr_repository_url>:latest
docker push <ecr_repository_url>:latest
```

Then in ECS Console: **Update service** → **Force new deployment**, or re-run the pipeline.

### Outputs

- **`alb_dns_name`** – app URL: `http://<alb_dns_name>`
- **`alb_zone_id`** – for Route53 CNAME if using custom domain

---

## S3 and CloudFront (Frontend)

### Resources Created

- **S3 bucket** – stores frontend build artifacts; access restricted to CloudFront (OAC)
- **CloudFront distribution** – serves content over HTTPS with caching; SPA support (404 → `index.html`); 403 remains unchanged for WAF blocks
- **Origin Access Control** – only CloudFront can read from the bucket

### Commands

```bash
cd infra
terraform plan
terraform apply
```

### Frontend Upload (manual or GitHub Actions)

Build output goes to `dist/public` (Vite). Upload to S3:

```bash
npm run build
aws s3 sync dist/public s3://<frontend_bucket_name> --delete
aws cloudfront create-invalidation --distribution-id <cloudfront_distribution_id> --paths "/*"
```

### CloudFront Deployment Interrupted

If `apply` was interrupted while CloudFront was deploying, **import** the existing distribution before running `apply` again to avoid creating a duplicate:

```bash
cd infra
terraform import aws_cloudfront_distribution.frontend <ID-FROM-CONSOLE>
terraform apply
```

Replace `<ID-FROM-CONSOLE>` with the distribution ID from the AWS Console.

**If two distributions exist:** delete the orphan in the Console (the one not in `terraform state list` / outputs): Disable → wait for Deployed → Delete. Keep the one Terraform manages (`cloudfront_distribution_id`).

### Outputs

- **`frontend_bucket_name`** – S3 bucket for uploads
- **`cloudfront_distribution_id`** – for post-deploy invalidation
- **`cloudfront_domain_name`** – e.g. `xxx.cloudfront.net`
- **`cloudfront_url`** – frontend URL: `https://<domain>.cloudfront.net`

---

## WAF (Web Application Firewall)

CloudFront is protected by AWS WAF with these rules:

| Rule | Description |
|------|-------------|
| **AWSManagedRulesCommonRuleSet** | XSS, path traversal, common exploits |
| **AWSManagedRulesSQLiRuleSet** | SQL Injection |
| **AWSManagedRulesKnownBadInputsRuleSet** | Known malicious inputs |
| **RateLimitRule** | Block IPs exceeding 2000 requests per 5 minutes |

**Disable:** In `terraform.tfvars`: `enable_waf = false`

---

## GitHub Actions (CI/CD)

Workflows in `.github/workflows/`:

| Workflow | Trigger | Action |
|----------|---------|--------|
| **Backend** | Push to `main` (server, Dockerfile, etc.) | Build Docker → Push to ECR → ECS force new deployment |
| **Frontend** | Push to `main` (client, vite, etc.) | Build with `VITE_API_URL` → Sync to S3 → CloudFront invalidation |

### GitHub Configuration

**Variables (Settings → Secrets and variables → Actions → Variables):**

| Variable | Required | Description |
|----------|----------|-------------|
| `AWS_ROLE_ARN` | **Yes** | IAM Role ARN for OIDC (e.g. `arn:aws:iam::123456789:role/github-actions-oidc`) |

**Additional variables:**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_REGION` | No | `eu-west-1` | AWS region |
| `ECR_REPOSITORY` | No | `reposition` | ECR repository name |
| `ECS_CLUSTER` | No | `reposition-cluster` | ECS cluster name |
| `ECS_SERVICE` | No | `reposition-service` | ECS service name |
| `S3_BUCKET` | **Yes** (frontend) | — | Frontend S3 bucket (from `frontend_bucket_name`) |
| `CLOUDFRONT_DISTRIBUTION_ID` | **Yes** (frontend) | — | CloudFront distribution ID (from `cloudfront_distribution_id`) |
| `VITE_API_URL` | **Yes** (CloudFront) | — | CloudFront URL (e.g. `https://xxx.cloudfront.net`). CloudFront routes `/api/*` to ALB, avoiding Mixed Content. |

When using CloudFront, set `VITE_API_URL` to the CloudFront URL (or custom domain). CloudFront proxies `/api/*` to the ALB.

### Custom Domain and HTTPS

1. **Route53:** Create a hosted zone for your domain and copy the Zone ID
2. **Terraform:** Set in `terraform.tfvars` or apply:
   - `domain_name` = frontend domain (e.g. `app.reposition.com`)
   - `api_domain_name` = (optional) API domain (e.g. `api.reposition.com`)
   - `route53_zone_id` = Route53 Zone ID
3. **`terraform apply`** – creates ACM certificates, DNS records, and attaches domains to CloudFront/ALB
4. **GitHub:** Update `VITE_API_URL` – when frontend and API share an origin (e.g. `re-position.org`), set it to **empty** (`""`) since API is at `/api/*` on same origin. With a separate API domain, set the API URL.

### Backend Rollback (by digest)

1. **Find working image digest:** ECR → Repositories → reposition → Images → Image digest (e.g. `sha256:a1b2c3d4...`)
2. **Run Rollback workflow:** Actions → **Rollback Backend (by Digest)** → Run workflow → paste digest → Run
3. ECS deploys the previous image

(ECR retains up to 10 images; see `ecr_keep_last_n_images` in `variables.tf`.)

### Frontend Rollback (by commit)

**Option 1 – Workflow:** Actions → **Rollback Frontend (by Commit)** → Run workflow → enter commit SHA of a working version. The workflow builds from that commit and uploads to S3.

**Option 2 – git revert:** `git revert <commit>` → push. The Frontend workflow runs and deploys the reverted build.

**Option 3 – S3 versioning:** The bucket has versioning; restore previous object versions manually in the Console (S3 → Object → Versions → Restore).

### Manual Run

Any workflow can be run manually from Actions → select workflow → Run workflow.
