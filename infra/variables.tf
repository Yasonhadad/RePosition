variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "reposition"
}

variable "app_port" {
  description = "Port the app listens on"
  type        = number
  default     = 5000
}

# -----------------------------------------------------------------------------
# ECR
# -----------------------------------------------------------------------------
variable "ecr_keep_last_n_images" {
  description = "Docker images to keep in ECR (older ones expire)"
  type        = number
  default     = 10
}

# -----------------------------------------------------------------------------
# EKS
# -----------------------------------------------------------------------------
variable "eks_cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.31"
}

variable "eks_system_instance_types" {
  description = "Instance types for the system (always-on) managed node group"
  type        = list(string)
  default     = ["t4g.medium"]
}

variable "eks_system_node_count" {
  description = "Desired number of nodes in the system node group"
  type        = number
  default     = 1
}

variable "eks_log_retention_days" {
  description = "CloudWatch log retention for EKS / Fluent Bit (days)"
  type        = number
  default     = 3
}

variable "bootstrap_on_start" {
  description = "Run schema push + data load on container start. Set false after first successful load."
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Custom domain and HTTPS (optional)
# -----------------------------------------------------------------------------
variable "domain_name" {
  description = "Custom domain for the frontend (e.g. re-position.org). Leave empty to skip."
  type        = string
  default     = ""
}

variable "api_domain_name" {
  description = "Custom domain for the API (e.g. api.re-position.org). Leave empty to skip."
  type        = string
  default     = ""
}

variable "eks_ingress_alb_dns" {
  description = "ALB DNS created by AWS LB Controller. Get with: kubectl get ingress -n reposition. Set after first deploy if not using api_domain_name."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID. Required if domain_name is set."
  type        = string
  default     = ""
}

# -----------------------------------------------------------------------------
# S3 and CloudFront
# -----------------------------------------------------------------------------
variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_200"
}

variable "enable_waf" {
  description = "Enable AWS WAF for CloudFront"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# RDS PostgreSQL
# -----------------------------------------------------------------------------
variable "rds_db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "reposition_db"
}

variable "rds_username" {
  description = "Master username for RDS"
  type        = string
  default     = "reposition_user"
}

variable "rds_instance_class" {
  description = "RDS instance type"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "Initial storage in GB"
  type        = number
  default     = 20
}

variable "rds_max_allocated_storage" {
  description = "Max storage for autoscaling (0 = disabled)"
  type        = number
  default     = 100
}

variable "rds_backup_retention_days" {
  description = "Days to keep automated backups"
  type        = number
  default     = 7
}

variable "rds_skip_final_snapshot" {
  description = "Skip snapshot on destroy (dev only)"
  type        = bool
  default     = true
}

variable "rds_deletion_protection" {
  description = "Prevent accidental RDS deletion"
  type        = bool
  default     = false
}

variable "rds_legacy_subnet_id" {
  description = "Old subnet ID still used by RDS during migration. Set to empty after first successful apply."
  type        = string
  default     = ""
}
