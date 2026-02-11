output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs (for ALB and ECS)"
  value       = aws_subnet.public[*].id
}

output "alb_security_group_id" {
  description = "Security group ID for ALB"
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "Security group ID for ECS tasks"
  value       = aws_security_group.ecs.id
}

output "rds_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

# -----------------------------------------------------------------------------
# Database connection details
# -----------------------------------------------------------------------------
output "rds_endpoint" {
  description = "RDS connection endpoint (host:port)"
  value       = aws_db_instance.main.endpoint
}

output "rds_port" {
  description = "RDS port"
  value       = aws_db_instance.main.port
}

output "rds_db_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "rds_username" {
  description = "Master username (password is in Secrets Manager)"
  value       = aws_db_instance.main.username
}

# -----------------------------------------------------------------------------
# Secrets Manager – ARN used by ECS to inject env vars into tasks
# -----------------------------------------------------------------------------
output "app_secret_arn" {
  description = "ARN of the app secret (DATABASE_URL, SESSION_SECRET) for ECS task definition"
  value       = aws_secretsmanager_secret.app.arn
}

# -----------------------------------------------------------------------------
# ECR – image registry URL for push/pull
# -----------------------------------------------------------------------------
output "ecr_repository_url" {
  description = "ECR repository URL for docker push/pull (e.g. 123456789012.dkr.ecr.eu-west-1.amazonaws.com/reposition)"
  value       = aws_ecr_repository.app.repository_url
}

output "ecr_repository_arn" {
  description = "ECR repository ARN"
  value       = aws_ecr_repository.app.arn
}

# -----------------------------------------------------------------------------
# Load balancer URLs
# -----------------------------------------------------------------------------
output "alb_dns_name" {
  description = "ALB DNS name – access the app via http://<this-value>"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB Route53 zone ID (for CNAME setup when using custom domain)"
  value       = aws_lb.main.zone_id
}

# -----------------------------------------------------------------------------
# Frontend – S3 bucket and CloudFront
# -----------------------------------------------------------------------------
output "frontend_bucket_name" {
  description = "S3 bucket name for frontend build upload (e.g. in GitHub Actions)"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID – for invalidation after deploy"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "CloudFront domain (e.g. xxx.cloudfront.net)"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_url" {
  description = "Frontend URL – https://<domain>.cloudfront.net"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

# -----------------------------------------------------------------------------
# Custom domain (when domain_name and route53_zone_id are set)
# -----------------------------------------------------------------------------
output "frontend_url" {
  description = "Frontend URL with custom domain (if configured)"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "api_url" {
  description = "API URL – custom domain or ALB"
  value       = var.api_domain_name != "" ? "https://${var.api_domain_name}" : "http://${aws_lb.main.dns_name}"
}
