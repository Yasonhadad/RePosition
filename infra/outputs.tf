# =============================================================================
# Outputs
# =============================================================================

# -- VPC --
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs (ALB, NAT)"
  value       = aws_subnet.public[*].id
}

output "app_subnet_ids" {
  description = "App tier (private) subnet IDs (EKS nodes)"
  value       = aws_subnet.app[*].id
}

output "data_subnet_ids" {
  description = "Data tier (private) subnet IDs (RDS)"
  value       = aws_subnet.data[*].id
}

# -- Security Groups --
output "alb_security_group_id" {
  description = "Security group ID for ALB"
  value       = aws_security_group.alb.id
}

output "eks_nodes_security_group_id" {
  description = "Security group ID for EKS nodes"
  value       = aws_security_group.eks_nodes.id
}

output "rds_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

# -- EKS --
output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_certificate_authority" {
  description = "EKS cluster CA (base64)"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "eks_update_kubeconfig_command" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --name ${module.eks.cluster_name} --region ${var.aws_region}"
}

# -- RDS --
output "rds_endpoint" {
  description = "RDS connection endpoint (host:port)"
  value       = aws_db_instance.main.endpoint
}

output "rds_db_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

# -- Secrets --
output "app_secret_arn" {
  description = "ARN of the app secret in Secrets Manager"
  value       = aws_secretsmanager_secret.app.arn
}

# -- ECR --
output "ecr_repository_url" {
  description = "ECR repository URL for docker push/pull"
  value       = aws_ecr_repository.app.repository_url
}

# -- Frontend --
output "frontend_bucket_name" {
  description = "S3 bucket for frontend build"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "frontend_url" {
  description = "Frontend URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "api_url" {
  description = "API URL (ALB managed by K8s Ingress, or custom domain)"
  value       = var.api_domain_name != "" ? "https://${var.api_domain_name}" : "ALB DNS will be created by AWS LB Controller — run: kubectl get ingress -n reposition"
}
