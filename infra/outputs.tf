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
# RDS outputs – לצורך בניית DATABASE_URL ו-Secrets Manager
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
# Secrets Manager – ל-ECS (להזרקת env vars מהסוד)
# -----------------------------------------------------------------------------
output "app_secret_arn" {
  description = "ARN of the app secret (DATABASE_URL, SESSION_SECRET) for ECS task definition"
  value       = aws_secretsmanager_secret.app.arn
}

# -----------------------------------------------------------------------------
# ECR (שלב 4) – ל-ECS Task Definition ו-GitHub Actions
# -----------------------------------------------------------------------------
output "ecr_repository_url" {
  description = "ECR repository URL for docker push/pull (e.g. 699475953070.dkr.ecr.eu-west-1.amazonaws.com/reposition)"
  value       = aws_ecr_repository.app.repository_url
}

output "ecr_repository_arn" {
  description = "ECR repository ARN"
  value       = aws_ecr_repository.app.arn
}

# -----------------------------------------------------------------------------
# ECS + ALB (שלב 5) – כתובת האתר
# -----------------------------------------------------------------------------
output "alb_dns_name" {
  description = "ALB DNS name – גש לאתר דרך http://<this-value>"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB Route53 zone ID (להגדרת CNAME אם יש דומיין)"
  value       = aws_lb.main.zone_id
}

# -----------------------------------------------------------------------------
# S3 + CloudFront (שלב 6) – פרונט
# -----------------------------------------------------------------------------
output "frontend_bucket_name" {
  description = "S3 bucket name להעלאת build של הפרונט (למשל ב-GitHub Actions)"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID – ל-invalidation אחרי deploy"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "CloudFront domain (למשל xxx.cloudfront.net)"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_url" {
  description = "כתובת הפרונט – https://<domain>.cloudfront.net"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}
