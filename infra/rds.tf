# =============================================================================
# RDS PostgreSQL – managed database with private access from ECS only
# =============================================================================

# -----------------------------------------------------------------------------
# Subnet group – RDS requires subnets in at least two availability zones
# -----------------------------------------------------------------------------
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.public[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# -----------------------------------------------------------------------------
# Database instance – PostgreSQL with credentials stored in Secrets Manager
# -----------------------------------------------------------------------------
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-db"

  # Engine – PostgreSQL 16 (matches Docker/local setup)
  engine               = "postgres"
  engine_version       = "16"
  instance_class       = var.rds_instance_class
  allocated_storage    = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage

  # Credentials – password is auto-generated and stored in Secrets Manager
  db_name  = var.rds_db_name
  username = var.rds_username
  password = random_password.rds.result

  # Network and security – no public IP; only ECS within VPC can connect
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Backup – configurable retention and window (UTC)
  backup_retention_period = var.rds_backup_retention_days
  backup_window          = "03:00-04:00"

  # Snapshot and deletion protection – set skip_final_snapshot=false in production
  skip_final_snapshot       = var.rds_skip_final_snapshot
  deletion_protection       = var.rds_deletion_protection

  tags = {
    Name = "${var.project_name}-rds"
  }
}
