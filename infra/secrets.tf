# =============================================================================
# Secrets Manager – ניהול סיסמאות וסודות האפליקציה
# =============================================================================
# Terraform יוצר סיסמאות אקראיות, מגדיר איתן את RDS, ושומר ב-Secrets Manager
# JSON אחד שהאפליקציה (ECS) תקבל כ-env vars. כך אין צורך להעביר סיסמאות ידנית.
# =============================================================================

# -----------------------------------------------------------------------------
# סיסמאות אקראיות (לא נשמרות בקוד – רק ב-state וב-Secrets Manager)
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
# Secret ב-Secrets Manager – ערך JSON עם DATABASE_URL ו-SESSION_SECRET
# -----------------------------------------------------------------------------
# ECS יקרא את ה-secret ויזריק את הערכים כ-env vars (DATABASE_URL, SESSION_SECRET).
# ה-secret נוצר אחרי ש-RDS קיים, כי אנחנו בונים את DATABASE_URL מה-endpoint.
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
    DATABASE_URL = "postgresql://${aws_db_instance.main.username}:${random_password.rds.result}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}?sslmode=require"
    SESSION_SECRET = random_password.session.result
  })
}
