# =============================================================================
# שלב 4: ECR – Elastic Container Registry
# =============================================================================
# מאגר Docker images בתוך AWS. ה-image של האפליקציה ( Dockerfile) יידחף
# לכאן ב-GitHub Actions, ו-ECS ימשוך מכאן את ה-image להרצת ה-containers.
# =============================================================================

resource "aws_ecr_repository" "app" {
  name                 = var.project_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.project_name}-ecr"
  }
}

# -----------------------------------------------------------------------------
# Lifecycle policy – שומר רק את X התמונות האחרונות (חוסך מקום ועלות)
# -----------------------------------------------------------------------------
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last ${var.ecr_keep_last_n_images} images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.ecr_keep_last_n_images
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
