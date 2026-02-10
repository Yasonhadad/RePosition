# =============================================================================
# שלב 2: RDS PostgreSQL
# =============================================================================
# RDS = שירות מסד נתונים מנוהל של AWS. אנחנו יוצרים instance של PostgreSQL
# שרץ בתוך ה-VPC שלנו, עם קבוצת האבטחה שכבר הגדרנו (רק ECS יכול להתחבר).
# =============================================================================

# -----------------------------------------------------------------------------
# DB Subnet Group
# -----------------------------------------------------------------------------
# RDS דורש "subnet group" – רשימת subnets (בשתי AZ שונות) שבהם ה-DB יכול לרוץ.
# אנחנו משתמשים באותם 2 subnets ציבוריים שיצרנו – ה-DB לא יקבל IP ציבורי
# (publicly_accessible = false), אז הוא נגיש רק מתוך ה-VPC (מ-ECS).
# -----------------------------------------------------------------------------
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.public[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# -----------------------------------------------------------------------------
# RDS Instance – ה-instance של PostgreSQL עצמו
# -----------------------------------------------------------------------------
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-db"

  # מנוע וגרסה – PostgreSQL 16 (תואם למהתמשנו ב-Docker)
  engine               = "postgres"
  engine_version       = "16"
  instance_class       = var.rds_instance_class
  allocated_storage    = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage

  # שם המסד, משתמש ראשי וסיסמה – הסיסמה נוצרת אוטומטית ונשמרת ב-Secrets Manager
  db_name  = var.rds_db_name
  username = var.rds_username
  password = random_password.rds.result

  # רשת ואבטחה
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false  # אין IP ציבורי – רק ECS בתוך ה-VPC יכול להתחבר

  # Backup (אפשר לשנות לפי צורך)
  backup_retention_period = var.rds_backup_retention_days
  backup_window          = "03:00-04:00"  # חלון גיבוי (UTC)

  # למניעת מחיקה בטעות – ב-production עדיף true
  skip_final_snapshot       = var.rds_skip_final_snapshot
  deletion_protection       = var.rds_deletion_protection

  tags = {
    Name = "${var.project_name}-rds"
  }
}
