# =============================================================================
# Custom domain + HTTPS – CloudFront (פרונט) + ALB (API)
# =============================================================================
# הפעלה: הגדר domain_name + route53_zone_id (ו־api_domain_name אם רוצה API נפרד).
# =============================================================================

data "aws_route53_zone" "main" {
  count        = var.domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  zone_id      = var.route53_zone_id
  private_zone = false
}

# -----------------------------------------------------------------------------
# ACM – תעודה ל-CloudFront (חייבת להיות ב־us-east-1)
# -----------------------------------------------------------------------------
resource "aws_acm_certificate" "cloudfront" {
  count             = var.domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cloudfront_cert_validation" {
  for_each = var.domain_name != "" && var.route53_zone_id != "" ? {
    for dvo in aws_acm_certificate.cloudfront[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "cloudfront" {
  count                   = var.domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cloudfront[0].arn
  validation_record_fqdns = [for r in aws_route53_record.cloudfront_cert_validation : r.fqdn]
}

# -----------------------------------------------------------------------------
# ACM – תעודה ל־ALB (אותו region)
# -----------------------------------------------------------------------------
resource "aws_acm_certificate" "alb" {
  count             = var.api_domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  domain_name       = var.api_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "alb_cert_validation" {
  for_each = var.api_domain_name != "" && var.route53_zone_id != "" ? {
    for dvo in aws_acm_certificate.alb[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "alb" {
  count                   = var.api_domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  certificate_arn         = aws_acm_certificate.alb[0].arn
  validation_record_fqdns = [for r in aws_route53_record.alb_cert_validation : r.fqdn]
}

# -----------------------------------------------------------------------------
# Route53 – פרונט → CloudFront
# -----------------------------------------------------------------------------
resource "aws_route53_record" "frontend" {
  count   = var.domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------
# Route53 – API → ALB (אם מוגדר api_domain_name)
# -----------------------------------------------------------------------------
resource "aws_route53_record" "api" {
  count   = var.api_domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.api_domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = false
  }
}
