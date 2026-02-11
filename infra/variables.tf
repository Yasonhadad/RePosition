variable "aws_region" {
  description = "AWS region (e.g. eu-west-1, us-east-1)"
  type        = string
  default     = "eu-west-1"
}

variable "project_name" {
  description = "Project name used for resource names"
  type        = string
  default     = "reposition"
}

variable "app_port" {
  description = "Port the app listens on (must match server)"
  type        = number
  default     = 5000
}

# -----------------------------------------------------------------------------
# ECR (שלב 4)
# -----------------------------------------------------------------------------
variable "ecr_keep_last_n_images" {
  description = "How many Docker images to keep in ECR (older ones are deleted)"
  type        = number
  default     = 10
}

# -----------------------------------------------------------------------------
# ECS (שלב 5) – Fargate
# -----------------------------------------------------------------------------
variable "ecs_task_cpu" {
  description = "Fargate task CPU units (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 512
}

variable "ecs_task_memory" {
  description = "Fargate task memory in MB (512, 1024, 2048, 3072, 4096, ...)"
  type        = number
  default     = 1024
}

variable "ecs_desired_count" {
  description = "Number of ECS tasks to run"
  type        = number
  default     = 1
}

variable "ecs_log_retention_days" {
  description = "CloudWatch log retention for ECS (days)"
  type        = number
  default     = 7
}

variable "ecs_bootstrap_on_start" {
  description = "If true, run schema (drizzle-kit push) + data load (data_loader.py) on container start. Set to false after first successful load to speed up future deployments."
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# S3 + CloudFront (שלב 6)
# -----------------------------------------------------------------------------
variable "cloudfront_price_class" {
  description = "CloudFront price class (PriceClass_All, PriceClass_200, PriceClass_100)"
  type        = string
  default     = "PriceClass_200"
}

# -----------------------------------------------------------------------------
# RDS (שלב 2)
# -----------------------------------------------------------------------------
variable "rds_db_name" {
  description = "Name of the PostgreSQL database to create"
  type        = string
  default     = "reposition_db"
}

variable "rds_username" {
  description = "Master username for RDS"
  type        = string
  default     = "reposition_user"
}

variable "rds_instance_class" {
  description = "RDS instance type (e.g. db.t3.micro for free tier)"
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
  description = "If true, no snapshot when destroying (dev only)"
  type        = bool
  default     = true
}

variable "rds_deletion_protection" {
  description = "If true, RDS cannot be deleted accidentally"
  type        = bool
  default     = false
}
