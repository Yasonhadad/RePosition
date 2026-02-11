#!/bin/bash
# Fetches credentials from AWS Secrets Manager and runs docker compose.
# Requires: AWS CLI configured. Secret "reposition/local" must exist – run scripts/create-local-secret.sh first.
set -e
SECRET_NAME="${APP_SECRET_NAME:-reposition/local}"
REGION="${AWS_REGION:-eu-west-1}"

secret_json=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --region "$REGION" --query SecretString --output text 2>/dev/null) || {
  echo "Failed to fetch secret '$SECRET_NAME'. Run scripts/create-local-secret.sh to create it."
  exit 1
}

POSTGRES_PASSWORD=$(echo "$secret_json" | jq -r '.POSTGRES_PASSWORD')
if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "null" ]; then
  echo "Secret must contain POSTGRES_PASSWORD. Run scripts/create-local-secret.sh to fix."
  exit 1
fi

export POSTGRES_PASSWORD
export POSTGRES_USER=$(echo "$secret_json" | jq -r '.POSTGRES_USER // "reposition_user"')
export POSTGRES_DB=$(echo "$secret_json" | jq -r '.POSTGRES_DB // "reposition_db"')

echo "Credentials loaded from Secrets Manager. Starting containers..."
exec docker compose "$@"
