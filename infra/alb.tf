# =============================================================================
# שלב 5 (חלק א'): Application Load Balancer
# =============================================================================
# ה-ALB מקבל תעבורת HTTP/HTTPS מהאינטרנט ומפנה ל-ECS tasks (פורט 5000).
# =============================================================================

resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "${var.project_name}-alb"
  }
}

# -----------------------------------------------------------------------------
# Target group – ECS tasks (Fargate) רשומים כאן לפי IP
# -----------------------------------------------------------------------------
resource "aws_lb_target_group" "app" {
  name        = "${var.project_name}-tg"
  port        = var.app_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name = "${var.project_name}-tg"
  }
}

# -----------------------------------------------------------------------------
# Listener – פורט 80: forward או redirect ל-HTTPS
# -----------------------------------------------------------------------------
resource "aws_lb_listener" "http_forward" {
  count             = var.api_domain_name == "" || var.route53_zone_id == "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  count             = var.api_domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# -----------------------------------------------------------------------------
# Listener – פורט 443 (HTTPS) כאשר יש api_domain_name
# -----------------------------------------------------------------------------
resource "aws_lb_listener" "https" {
  count             = var.api_domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.alb[0].arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
