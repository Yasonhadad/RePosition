# =============================================================================
# שלב 6: S3 + CloudFront – פרונט סטטי (React build)
# =============================================================================
# Build של ה-client (npm run build) מועלה ל-S3. CloudFront מפזר את הקבצים
# ומגיש אותם עם HTTPS. גישה ל-bucket רק דרך CloudFront (OAC).
# =============================================================================

# -----------------------------------------------------------------------------
# S3 bucket – אחסון קבצי הפרונט (ללא גישה ציבורית ישירה)
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-frontend-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "${var.project_name}-frontend"
  }
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy   = true
  ignore_public_acls    = true
  restrict_public_buckets = true
}

# -----------------------------------------------------------------------------
# Origin Access Control – רק CloudFront יכול לקרוא מ-S3
# -----------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.project_name}-frontend-oac"
  description                       = "OAC for ${var.project_name} frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# -----------------------------------------------------------------------------
# Bucket policy – CloudFront מורשה GetObject
# -----------------------------------------------------------------------------
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

# -----------------------------------------------------------------------------
# CloudFront distribution – S3 (פרונט) + ALB (API) כ-origins
# -----------------------------------------------------------------------------
# API דרך CloudFront מונע Mixed Content (HTTPS→HTTP). VITE_API_URL = כתובת CloudFront.
# -----------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "frontend" {
  enabled                 = true
  is_ipv6_enabled         = true
  default_root_object     = "index.html"
  comment                 = "${var.project_name} frontend"
  price_class             = var.cloudfront_price_class
  wait_for_deployment     = false  # apply מסתיים מהר; ההפצה ממשיכה ברקע
  aliases                 = var.domain_name != "" ? [var.domain_name] : []

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                 = "S3-${aws_s3_bucket.frontend.id}"
    origin_access_control_id  = aws_cloudfront_origin_access_control.frontend.id
  }

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-${var.project_name}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy  = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # /api/* → ALB (באקאנד). חיוני כדי שכל הקריאות יהיו דרך HTTPS (אותו origin).
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "ALB-${var.project_name}"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies {
        forward = "all"
      }
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend.id}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  # SPA – כל path שלא קובץ מחזיר index.html
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.domain_name == ""
    acm_certificate_arn            = var.domain_name != "" && var.route53_zone_id != "" ? aws_acm_certificate.cloudfront[0].arn : null
    ssl_support_method             = var.domain_name != "" ? "sni-only" : null
    minimum_protocol_version       = var.domain_name != "" ? "TLSv1.2_2021" : null
  }

  tags = {
    Name = "${var.project_name}-frontend"
  }
}
