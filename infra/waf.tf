# =============================================================================
# Web Application Firewall – attached to CloudFront, must be in us-east-1
# =============================================================================
# Managed rules: SQL injection, XSS, known bad inputs, plus rate limiting.
# =============================================================================

# -----------------------------------------------------------------------------
# WAF log destination – S3 bucket in us-east-1 (required for CloudFront WAF)
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "waf_logs" {
  count    = var.enable_waf ? 1 : 0
  provider = aws.us_east_1
  # AWS requires aws-waf-logs- prefix for WAF logging
  bucket   = "aws-waf-logs-${var.project_name}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "${var.project_name}-waf-logs"
  }
}

resource "aws_s3_bucket_policy" "waf_logs" {
  count    = var.enable_waf ? 1 : 0
  provider = aws.us_east_1
  bucket   = aws_s3_bucket.waf_logs[0].id

  # Policy per AWS documentation – delivery.logs.amazonaws.com
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSLogDeliveryWrite"
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.waf_logs[0].arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl"      = "bucket-owner-full-control"
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnLike = {
            "aws:SourceArn" = "arn:aws:logs:us-east-1:${data.aws_caller_identity.current.account_id}:*"
          }
        }
      },
      {
        Sid    = "AWSLogDeliveryAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.waf_logs[0].arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnLike = {
            "aws:SourceArn" = "arn:aws:logs:us-east-1:${data.aws_caller_identity.current.account_id}:*"
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Logging configuration – request logs for analysis and troubleshooting
# -----------------------------------------------------------------------------
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  count                   = var.enable_waf ? 1 : 0
  provider                = aws.us_east_1
  resource_arn            = aws_wafv2_web_acl.main[0].arn
  log_destination_configs = [aws_s3_bucket.waf_logs[0].arn]
}

resource "aws_wafv2_web_acl" "main" {
  count    = var.enable_waf ? 1 : 0
  provider = aws.us_east_1
  name        = "${var.project_name}-waf"
  description = "WAF for ${var.project_name} CloudFront"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Common exploits – OWASP-style rules (XSS, path traversal, etc.)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # SQL Injection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Known bad inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Rate limiting – blocks IPs exceeding 2000 requests per 5 minutes
  rule {
    name     = "RateLimitRule"
    priority = 4

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Name = "${var.project_name}-waf"
  }
}
