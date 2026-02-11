# =============================================================================
# ECS Fargate – cluster, task definition, and service running the application.
# Task definition sources the image from ECR and secrets from Secrets Manager;
# the service keeps tasks running and attached to the ALB.
# =============================================================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Cluster – logical grouping for Fargate tasks
# -----------------------------------------------------------------------------
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "disabled"
  }

  tags = {
    Name = "${var.project_name}-cluster"
  }
}

# -----------------------------------------------------------------------------
# Log group – receives stdout/stderr from running containers
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = var.ecs_log_retention_days

  tags = {
    Name = "${var.project_name}-logs"
  }
}

# -----------------------------------------------------------------------------
# Execution role – grants task permission to pull images, read secrets, and write logs
# -----------------------------------------------------------------------------
resource "aws_iam_role" "ecs_execution" {
  name = "${var.project_name}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = { Name = "${var.project_name}-ecs-execution" }
}

resource "aws_iam_role_policy" "ecs_execution" {
  name = "${var.project_name}-ecs-execution"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer"
        ]
        Resource = aws_ecr_repository.app.arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.app.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.app.arn}:*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Task definition – Fargate-compatible container spec with image, CPU/memory, and secrets
# -----------------------------------------------------------------------------
resource "aws_ecs_task_definition" "app" {
  family                   = var.project_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = var.project_name
      image     = "${aws_ecr_repository.app.repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = var.app_port
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "BOOTSTRAP_ON_START", value = var.ecs_bootstrap_on_start ? "true" : "false" },
        # RDS uses a cert Node treats as self-signed; allow so pg/drizzle/session store can connect
        { name = "NODE_TLS_REJECT_UNAUTHORIZED", value = "0" }
      ]

      secrets = [
        { name = "DATABASE_URL", valueFrom = "${aws_secretsmanager_secret.app.arn}:DATABASE_URL::" },
        { name = "SESSION_SECRET", valueFrom = "${aws_secretsmanager_secret.app.arn}:SESSION_SECRET::" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-task"
  }
}

# -----------------------------------------------------------------------------
# Service – maintains the desired task count and registers them with the ALB
# -----------------------------------------------------------------------------
resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.ecs_desired_count
  launch_type     = "FARGATE"

  # Allow time for bootstrap (drizzle-kit + data_loader ~3 min) before ALB health checks can mark task unhealthy
  health_check_grace_period_seconds = 360

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = var.project_name
    container_port   = var.app_port
  }

  tags = {
    Name = "${var.project_name}-service"
  }
}
