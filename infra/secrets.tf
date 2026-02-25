# =============================================================================
# Secrets Manager – Application secrets and credentials
# =============================================================================
# Terraform generates random passwords, configures RDS, and stores a single JSON
# secret in Secrets Manager. External Secrets Operator syncs these into K8s.
# =============================================================================

# -----------------------------------------------------------------------------
# Random passwords – stored only in Terraform state and Secrets Manager
# -----------------------------------------------------------------------------
resource "random_password" "rds" {
  length           = 32
  special          = true
  override_special  = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "session" {
  length           = 64
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# -----------------------------------------------------------------------------
# Secrets Manager secret – JSON with DATABASE_URL and SESSION_SECRET
# -----------------------------------------------------------------------------
# ESO syncs these into a K8s Secret. Created after RDS because DATABASE_URL
# includes the RDS endpoint.
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "app" {
  name        = "${var.project_name}/app"
  description = "RePosition app: DATABASE_URL and SESSION_SECRET"

  tags = {
    Name = "${var.project_name}-app-secret"
  }
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    # Password may contain %[] etc. – must be URL-encoded so clients (Node, Python) can parse the URL
    DATABASE_URL = "postgresql://${aws_db_instance.main.username}:${urlencode(random_password.rds.result)}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}?sslmode=require"
    SESSION_SECRET = random_password.session.result
  })
}
