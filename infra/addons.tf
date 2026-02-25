# =============================================================================
# Platform add-ons: AWS Load Balancer Controller, External Secrets, Fluent Bit.
# Deployed via Helm into the EKS cluster.
# =============================================================================

# -----------------------------------------------------------------------------
# AWS Load Balancer Controller — creates and manages ALBs from Ingress resources
# -----------------------------------------------------------------------------
resource "helm_release" "aws_lb_controller" {
  namespace        = "kube-system"
  name             = "aws-load-balancer-controller"
  repository       = "https://aws.github.io/eks-charts"
  chart            = "aws-load-balancer-controller"
  version          = "1.10.0"
  create_namespace = false
  wait             = true

  values = [
    yamlencode({
      clusterName = module.eks.cluster_name
      region      = var.aws_region
      vpcId       = aws_vpc.main.id

      serviceAccount = {
        create = true
        name   = "aws-load-balancer-controller"
      }

      resources = {
        requests = { cpu = "50m", memory = "128Mi" }
        limits   = { memory = "128Mi" }
      }

      nodeSelector = {
        "role" = "system"
      }
    })
  ]

  depends_on = [
    module.eks,
    aws_eks_pod_identity_association.lb_controller,
  ]
}

# -----------------------------------------------------------------------------
# External Secrets Operator — syncs AWS Secrets Manager → K8s Secrets
# -----------------------------------------------------------------------------
resource "helm_release" "external_secrets" {
  namespace        = "external-secrets"
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  version          = "0.12.1"
  create_namespace = true
  wait             = true

  values = [
    yamlencode({
      serviceAccount = {
        create = true
        name   = "external-secrets"
      }

      resources = {
        requests = { cpu = "25m", memory = "64Mi" }
        limits   = { memory = "128Mi" }
      }

      webhook = {
        resources = {
          requests = { cpu = "10m", memory = "32Mi" }
          limits   = { memory = "64Mi" }
        }
      }

      certController = {
        resources = {
          requests = { cpu = "10m", memory = "32Mi" }
          limits   = { memory = "64Mi" }
        }
      }

      nodeSelector = {
        "role" = "system"
      }
    })
  ]

  depends_on = [
    module.eks,
    aws_eks_pod_identity_association.external_secrets,
  ]
}

# -----------------------------------------------------------------------------
# Fluent Bit — collects container logs and ships to CloudWatch
# -----------------------------------------------------------------------------
resource "helm_release" "fluent_bit" {
  namespace        = "kube-system"
  name             = "fluent-bit"
  repository       = "https://fluent.github.io/helm-charts"
  chart            = "fluent-bit"
  version          = "0.48.0"
  create_namespace = false
  wait             = true

  values = [
    yamlencode({
      serviceAccount = {
        create = true
        name   = "fluent-bit"
      }

      resources = {
        requests = { cpu = "25m", memory = "64Mi" }
        limits   = { memory = "128Mi" }
      }

      config = {
        outputs = <<-EOT
          [OUTPUT]
              Name              cloudwatch_logs
              Match             *
              region            ${var.aws_region}
              log_group_name    /eks/${var.project_name}
              log_stream_prefix fluent-bit-
              auto_create_group false
        EOT
      }
    })
  ]

  depends_on = [
    module.eks,
    aws_eks_pod_identity_association.fluent_bit,
  ]
}
