# =============================================================================
# Security groups: ALB (public) → EKS nodes (app tier) → RDS (data tier)
# =============================================================================

# -----------------------------------------------------------------------------
# ALB — allow HTTP/HTTPS from internet
# -----------------------------------------------------------------------------
resource "aws_security_group" "alb" {
  name_prefix = "${var.project_name}-alb-"
  description = "ALB - public internet access"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-alb-sg" }
}

# -----------------------------------------------------------------------------
# EKS nodes (App Tier) — accepts traffic from ALB and inter-node communication
# -----------------------------------------------------------------------------
resource "aws_security_group" "eks_nodes" {
  name_prefix = "${var.project_name}-eks-nodes-"
  description = "EKS worker nodes - app tier"
  vpc_id      = aws_vpc.main.id

  # App port from ALB
  ingress {
    description     = "App port from ALB"
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Inter-node (pod-to-pod, kubelet, etc.)
  ingress {
    description = "Inter-node communication"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name                         = "${var.project_name}-eks-nodes-sg"
    "karpenter.sh/discovery"     = var.project_name
  }
}

# -----------------------------------------------------------------------------
# RDS (Data Tier) — PostgreSQL from EKS nodes only
# -----------------------------------------------------------------------------
resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-rds-"
  description = "RDS - PostgreSQL from app tier only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from EKS nodes"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  # Also allow from EKS cluster primary security group (for pods using VPC CNI)
  ingress {
    description     = "PostgreSQL from EKS cluster SG"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.cluster_primary_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-rds-sg" }
}
