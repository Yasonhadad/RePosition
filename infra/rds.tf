# =============================================================================
# RDS PostgreSQL — Data Tier (private subnets, accessible from App Tier only)
# =============================================================================

resource "aws_db_subnet_group" "main" {
  name = "${var.project_name}-db-subnet-group"
  # RDS Single-AZ physically remains in its original subnet (eu-west-1a).
  # The legacy subnet must stay in the group. Security is enforced by SG, not subnet.
  subnet_ids = concat(aws_subnet.data[*].id, var.rds_legacy_subnet_id != "" ? [var.rds_legacy_subnet_id] : [])

  tags = { Name = "${var.project_name}-db-subnet-group" }
}

resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-db"

  engine               = "postgres"
  engine_version       = "16"
  instance_class       = var.rds_instance_class
  allocated_storage    = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage

  db_name  = var.rds_db_name
  username = var.rds_username
  password = random_password.rds.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  backup_retention_period = var.rds_backup_retention_days
  backup_window          = "03:00-04:00"

  skip_final_snapshot  = var.rds_skip_final_snapshot
  deletion_protection  = var.rds_deletion_protection
  apply_immediately    = true

  tags = { Name = "${var.project_name}-rds" }
}
