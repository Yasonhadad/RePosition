# =============================================================================
# EKS Cluster, System Node Group, Karpenter, and KMS secrets encryption.
# Uses terraform-aws-modules/eks for production-grade setup.
# =============================================================================

# -----------------------------------------------------------------------------
# KMS key — envelope encryption for Kubernetes secrets at rest
# -----------------------------------------------------------------------------
resource "aws_kms_key" "eks" {
  description             = "EKS secret encryption for ${var.project_name}"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags                    = { Name = "${var.project_name}-eks-kms" }
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${var.project_name}-eks"
  target_key_id = aws_kms_key.eks.key_id
}

# -----------------------------------------------------------------------------
# EKS Cluster (terraform-aws-modules/eks)
# -----------------------------------------------------------------------------
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.project_name
  cluster_version = var.eks_cluster_version

  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.app[*].id

  # Public + private endpoint: allows kubectl from outside and node communication via private
  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  # Secrets encryption at rest
  cluster_encryption_config = {
    provider_key_arn = aws_kms_key.eks.arn
    resources        = ["secrets"]
  }

  # Control plane logging — audit only (cost-conscious)
  cluster_enabled_log_types = ["audit"]

  # EKS add-ons (Pod Identity Agent is required for Pod Identity to work)
  cluster_addons = {
    eks-pod-identity-agent = {
      most_recent = true
    }
  }

  # Let the module manage the aws-auth ConfigMap
  enable_cluster_creator_admin_permissions = true

  # Node security group: tag for Karpenter discovery
  node_security_group_tags = {
    "karpenter.sh/discovery" = var.project_name
  }

  # ── System managed node group ──────────────────────────────────────────────
  # Runs Karpenter controller and critical platform add-ons. Always-on, On-Demand.
  eks_managed_node_groups = {
    system = {
      name            = "${var.project_name}-system"
      instance_types  = var.eks_system_instance_types
      ami_type        = "AL2023_ARM_64_STANDARD"

      min_size     = 1
      max_size     = 2
      desired_size = var.eks_system_node_count

      labels = {
        "role"                    = "system"
        "karpenter.sh/controller" = "true"
      }

      taints = []

      iam_role_additional_policies = {
        ssm = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
      }
    }
  }

  tags = {
    Name = "${var.project_name}-eks"
  }
}

# -----------------------------------------------------------------------------
# Helm / kubectl provider configuration
# -----------------------------------------------------------------------------
provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name, "--region", var.aws_region]
    }
  }
}

provider "kubectl" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  load_config_file       = false

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name, "--region", var.aws_region]
  }
}

# -----------------------------------------------------------------------------
# Karpenter (via EKS module submodule)
# -----------------------------------------------------------------------------
module "karpenter" {
  source  = "terraform-aws-modules/eks/aws//modules/karpenter"
  version = "~> 20.0"

  cluster_name = module.eks.cluster_name

  enable_pod_identity             = true
  create_pod_identity_association = true

  node_iam_role_use_name_prefix = false
  node_iam_role_name            = "${var.project_name}-karpenter-node"

  node_iam_role_additional_policies = {
    ssm = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  }

  tags = { Name = "${var.project_name}-karpenter" }
}

resource "helm_release" "karpenter" {
  namespace        = "kube-system"
  name             = "karpenter"
  repository       = "oci://public.ecr.aws/karpenter"
  chart            = "karpenter"
  version          = "1.1.1"
  wait             = true
  timeout          = 600
  create_namespace = false

  values = [
    yamlencode({
      settings = {
        clusterName       = module.eks.cluster_name
        clusterEndpoint   = module.eks.cluster_endpoint
        interruptionQueue = module.karpenter.queue_name
      }
      serviceAccount = {
        name = "karpenter"
      }
      replicas = 1
      controller = {
        resources = {
          requests = { cpu = "100m", memory = "512Mi" }
          limits   = { memory = "512Mi" }
        }
      }
      nodeSelector = {
        "karpenter.sh/controller" = "true"
      }
      topologySpreadConstraints = []
    })
  ]

  depends_on = [module.karpenter]
}

# -----------------------------------------------------------------------------
# Karpenter NodePool + EC2NodeClass (Spot, ARM64/Graviton)
# -----------------------------------------------------------------------------
resource "kubectl_manifest" "karpenter_node_class" {
  yaml_body = yamlencode({
    apiVersion = "karpenter.k8s.aws/v1"
    kind       = "EC2NodeClass"
    metadata   = { name = "default" }
    spec = {
      role            = module.karpenter.node_iam_role_name
      amiSelectorTerms = [{ alias = "al2023@latest" }]
      subnetSelectorTerms = [
        { tags = { "karpenter.sh/discovery" = var.project_name } }
      ]
      securityGroupSelectorTerms = [
        { tags = { "karpenter.sh/discovery" = var.project_name } }
      ]
      tags = {
        "karpenter.sh/discovery" = var.project_name
        Name                     = "${var.project_name}-karpenter-node"
      }
    }
  })

  depends_on = [helm_release.karpenter]
}

resource "kubectl_manifest" "karpenter_node_pool" {
  yaml_body = yamlencode({
    apiVersion = "karpenter.sh/v1"
    kind       = "NodePool"
    metadata   = { name = "default" }
    spec = {
      template = {
        spec = {
          requirements = [
            { key = "karpenter.sh/capacity-type", operator = "In", values = ["spot"] },
            { key = "kubernetes.io/arch", operator = "In", values = ["arm64", "amd64"] },
            { key = "node.kubernetes.io/instance-type", operator = "In", values = ["t4g.small", "t4g.medium", "m7g.medium", "t3.small", "t3.medium"] },
          ]
          nodeClassRef = {
            group = "karpenter.k8s.aws"
            kind  = "EC2NodeClass"
            name  = "default"
          }
        }
      }
      limits = {
        cpu    = "8"
        memory = "16Gi"
      }
      disruption = {
        consolidationPolicy = "WhenEmptyOrUnderutilized"
        consolidateAfter    = "60s"
      }
    }
  })

  depends_on = [kubectl_manifest.karpenter_node_class]
}

# -----------------------------------------------------------------------------
# CloudWatch log group for Fluent Bit
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "app" {
  name              = "/eks/${var.project_name}"
  retention_in_days = var.eks_log_retention_days

  tags = { Name = "${var.project_name}-logs" }
}
