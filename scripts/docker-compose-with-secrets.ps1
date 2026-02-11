# Fetches credentials from AWS Secrets Manager and runs docker compose.
# Requires: AWS CLI configured (aws configure) or AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.
# Secret "reposition/local" must exist – run scripts/create-local-secret.ps1 first.
$ErrorActionPreference = "Stop"
$SecretName = $env:APP_SECRET_NAME ?? "reposition/local"
$Region = $env:AWS_REGION ?? "eu-west-1"

$secretJson = aws secretsmanager get-secret-value --secret-id $SecretName --region $Region --query SecretString --output text 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Failed to fetch secret '$SecretName'. Run scripts/create-local-secret.ps1 to create it." -ForegroundColor Red
  Write-Host $secretJson
  exit 1
}

$secret = $secretJson | ConvertFrom-Json
if (-not $secret.POSTGRES_PASSWORD) {
  Write-Host "Secret must contain POSTGRES_PASSWORD. Run scripts/create-local-secret.ps1 to fix." -ForegroundColor Red
  exit 1
}

$env:POSTGRES_PASSWORD = $secret.POSTGRES_PASSWORD
$env:POSTGRES_USER = if ($secret.POSTGRES_USER) { $secret.POSTGRES_USER } else { "reposition_user" }
$env:POSTGRES_DB = if ($secret.POSTGRES_DB) { $secret.POSTGRES_DB } else { "reposition_db" }

Write-Host "Credentials loaded from Secrets Manager. Starting containers..." -ForegroundColor Green
docker compose up @args
