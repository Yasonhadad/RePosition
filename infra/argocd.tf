# =============================================================================
# ArgoCD — GitOps controller (Non-HA install for cost savings).
# Watches the k8s/ directory in the Git repo for declarative deployments.
# =============================================================================

resource "helm_release" "argocd" {
  namespace        = "argocd"
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "7.7.5"
  create_namespace = true
  wait             = true

  values = [
    yamlencode({
      global = {
        nodeSelector = {
          "role" = "system"
        }
      }

      # Non-HA: single replica for all components
      controller = {
        replicas = 1
        resources = {
          requests = { cpu = "50m", memory = "128Mi" }
          limits   = { memory = "256Mi" }
        }
      }

      server = {
        replicas = 1
        resources = {
          requests = { cpu = "25m", memory = "64Mi" }
          limits   = { memory = "128Mi" }
        }
        service = {
          type = "ClusterIP"
        }
      }

      repoServer = {
        replicas = 1
        resources = {
          requests = { cpu = "25m", memory = "64Mi" }
          limits   = { memory = "128Mi" }
        }
      }

      redis = {
        resources = {
          requests = { cpu = "10m", memory = "32Mi" }
          limits   = { memory = "64Mi" }
        }
      }

      applicationSet = {
        replicas = 1
        resources = {
          requests = { cpu = "10m", memory = "32Mi" }
          limits   = { memory = "64Mi" }
        }
      }

      notifications = {
        enabled = false
      }

      dex = {
        enabled = false
      }
    })
  ]

  depends_on = [module.eks]
}
