# =============================================================================
# ALB is now managed by AWS Load Balancer Controller via Kubernetes Ingress.
# This file is kept only for the Terraform-managed ALB reference that
# CloudFront uses as an origin. If you use a custom api_domain_name,
# update CloudFront to point to the Ingress ALB DNS after deployment.
# =============================================================================
#
# The ALB, target group, and listeners that were previously here have been
# removed. The AWS Load Balancer Controller (deployed in addons.tf) now
# creates and manages the ALB from the Kubernetes Ingress resource defined
# in k8s/charts/reposition/templates/ingress.yaml.
#
# After `kubectl get ingress -n reposition`, the ALB DNS will be available
# under the ADDRESS column. Use that DNS for Route53 / CloudFront config.
# =============================================================================
