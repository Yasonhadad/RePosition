# =============================================================================
# Elastic Container Registry – private Docker registry for application images.
# CI pushes images here; ECS pulls from here when starting tasks.
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
# Lifecycle policy – expire older images to cap storage usage and cost
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
