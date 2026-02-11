# RePosition – AWS Infrastructure

תשתית ב־Terraform לפי סדר השלבים.

## דרישות

- [Terraform](https://www.terraform.io/downloads) (1.0+)
- AWS CLI מוגדר (`aws configure` או env: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`)

## סדר השלבים (כולל)

| # | שלב | תיאור |
|---|-----|--------|
| 1 | **VPC + Security Groups** | רשת + קבוצות אבטחה (ALB, ECS, RDS) |
| 2 | RDS PostgreSQL + Secrets Manager | מסד נתונים + סיסמאות ב-Secrets Manager |
| 3 | (משולב בשלב 2) | — |
| 4 | ECR | מאגר Docker images |
| 5 | ECS (Fargate) | Cluster, ALB, Task Definition, Service |
| 6 | S3 + CloudFront | פרונט סטטי |
| 7 | GitHub Actions | CI/CD |
| 8 | Bootstrap | טעינת נתונים ראשונית |

---

## שלב 1: VPC + Security Groups

### מה נוצר

- **VPC** עם CIDR `10.0.0.0/16`
- **2 subnets ציבוריים** (בשתי Availability Zones) – ל־ALB ו־Fargate
- **Internet Gateway** – גישה לאינטרנט (למשיכת images מ־ECR)
- **Security groups:**
  - **ALB** – כניסה על פורטים 80, 443 מהאינטרנט
  - **ECS** – כניסה על פורט האפליקציה (5000) רק מ־ALB
  - **RDS** – כניסה על 5432 רק מ־ECS

### הרצה

```bash
cd infra
terraform init
terraform plan   # לבדיקה
terraform apply  # יישום (יאשר עם yes)
```

### פלטים (לשלבים הבאים)

- `vpc_id`
- `public_subnet_ids`
- `alb_security_group_id`
- `ecs_security_group_id`
- `rds_security_group_id`

### אזור (Region)

ברירת מחדל: `eu-west-1`. לשינוי:

```bash
terraform apply -var="aws_region=us-east-1"
```

או קובץ `terraform.tfvars`:

```hcl
aws_region   = "eu-west-1"
project_name = "reposition"
```

---

## שלב 2: RDS PostgreSQL + Secrets Manager

### מה נוצר

- **DB Subnet Group** – חיבור ה-RDS ל־2 ה-subnets הקיימים (בשתי AZ).
- **RDS Instance** – PostgreSQL 16, סיסמה **נוצרת אוטומטית** (לא מעבירים ידנית).
- **Secrets Manager** – סוד אחד `reposition/app` עם JSON:
  - `DATABASE_URL` – מחרוזת החיבור ל־PostgreSQL (כולל סיסמה)
  - `SESSION_SECRET` – סוד לסשן של האפליקציה (נוצר אקראית)

ה-DB **לא** נגיש מהאינטרנט (`publicly_accessible = false`). רק ECS בתוך ה-VPC מתחבר, ומקבל את `DATABASE_URL` ו־`SESSION_SECRET` מ-Secrets Manager (בלי להעביר סיסמאות בקוד או ב-env).

### הרצה

**אין צורך להעביר סיסמאות** – Terraform יוצר סיסמאות אקראיות ושומר ב-Secrets Manager:

```bash
cd infra
terraform init   # פעם ראשונה אחרי הוספת provider random
terraform plan
terraform apply
```

### פלטים (לשלב 5 – ECS)

- `rds_endpoint`, `rds_port`, `rds_db_name`, `rds_username` – למידע/דיבוג.
- **`app_secret_arn`** – ARN של הסוד ב-Secrets Manager. ב־ECS נשתמש בו כדי להזריק `DATABASE_URL` ו־`SESSION_SECRET` ל־container.

### הערות

- יצירת RDS לוקחת כמה דקות. הסיסמאות נמצאות ב־Terraform state וב-Secrets Manager – לא ב-Git.
- אם כבר הרצת שלב 2 עם `rds_password` (משתנה): אחרי `terraform apply` עם הקוד החדש, סיסמת RDS תוחלף לסיסמה האקראית החדשה שתישמר ב-Secrets Manager.

---

## שלב 4: ECR (Elastic Container Registry)

### מה נוצר

- **ECR repository** – מאגר לתמונות Docker של האפליקציה (שם: `reposition`).
- **Image scanning** – סריקה אוטומטית ב-push לגילוי פגיעויות.
- **Lifecycle policy** – שומר רק את X התמונות האחרונות (ברירת מחדל: 10); ישנות נמחקות אוטומטית.

### הרצה

```bash
cd infra
terraform plan
terraform apply
```

### פלטים (לשלב 5 – ECS ו-GitHub Actions)

- **`ecr_repository_url`** – כתובת ל־`docker push` / `docker pull` (למשל `699475953070.dkr.ecr.eu-west-1.amazonaws.com/reposition`).
- **`ecr_repository_arn`** – ARN של ה-repository.

ב־GitHub Actions: התחברות ל־ECR עם `aws ecr get-login-password`, tag של ה-image עם `ecr_repository_url:tag`, ו־`docker push`.

---

## שלב 5: ECS (Fargate) + ALB

### מה נוצר

- **ALB** – Application Load Balancer על פורט 80, מפנה ל-target group.
- **Target group** – health check על `/`, פורט 5000.
- **ECS Cluster** – Fargate.
- **Task Definition** – image מ־ECR (`reposition:latest`), env מ־Secrets Manager (`DATABASE_URL`, `SESSION_SECRET`), `NODE_ENV=production`, `BOOTSTRAP_ON_START` (משתנה).
- **ECS Service** – מריץ task אחד (ברירת מחדל), מחובר ל־ALB.
- **CloudWatch Log Group** – לוגים של ה-container.
- **IAM Role** – הרשאות למשיכת image מ־ECR, קריאת סודות מ־Secrets Manager, כתיבת לוגים.

### הרצה

```bash
cd infra
terraform plan
terraform apply
```

### אחרי ה-apply

ה-Service מחפש image `reposition:latest` ב־ECR. **בפעם הראשונה** אין עדיין image – צריך לבנות ולדחוף (ידנית או דרך GitHub Actions):

```bash
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.eu-west-1.amazonaws.com
docker build -t reposition .
docker tag reposition:latest <ecr_repository_url>:latest
docker push <ecr_repository_url>:latest
```

אחרי ה-push: ב-ECS Console לעשות **Update service** → **Force new deployment**, או להריץ שוב את ה-pipeline ב-GitHub Actions (שלב 7).

### פלטים

- **`alb_dns_name`** – כתובת האתר: `http://<alb_dns_name>` (למשל `http://reposition-alb-xxx.eu-west-1.elb.amazonaws.com`).
- **`alb_zone_id`** – לשימוש ב-Route53 אם יש דומיין מותאם.

---

## שלב 6: S3 + CloudFront (פרונט)

### מה נוצר

- **S3 bucket** – אחסון קבצי הפרונט (build של `client/`). גישה חסומה – רק CloudFront יכול לקרוא (OAC).
- **CloudFront distribution** – מפזר את הקבצים, HTTPS, cache. תמיכה ב-SPA (404/403 → `index.html`).
- **Origin Access Control** – רק CloudFront מורשה לגשת ל-bucket.

### הרצה

```bash
cd infra
terraform plan
terraform apply
```

### העלאת פרונט (ידנית או ב-GitHub Actions)

ה-build יוצא ל־`dist/public` (מ־vite). העלאה ל-S3:

```bash
npm run build
aws s3 sync dist/public s3://<frontend_bucket_name> --delete
aws cloudfront create-invalidation --distribution-id <cloudfront_distribution_id> --paths "/*"
```

### אם ה-apply הופסק לפני סיום (CloudFront "Deploying")

**חשוב:** אם ה-distribution כבר מופיע ב-Console, **חובה** לייבא אותו לפני `terraform apply` נוסף. אחרת Terraform ייצור distribution **שני** (כפילות ועלות).

```bash
cd infra
terraform import aws_cloudfront_distribution.frontend <ID-FROM-CONSOLE>
terraform apply
```

(החלף `<ID-FROM-CONSOLE>` ב-ID של ה-distribution הקיים, למשל `E347S21BSBPF91`.)

**אם כבר נוצרו שני distributions:** מחק את הישן (זה שלא מופיע ב-`terraform state list` / ב-outputs) ב-Console: בחר → Disable → אחרי ש-Deployed → Delete. השאר רק את זה ש-Terraform מנהל (ה-output `cloudfront_distribution_id`).

### פלטים

- **`frontend_bucket_name`** – שם ה-S3 bucket להעלאה.
- **`cloudfront_distribution_id`** – ל-invalidation אחרי deploy.
- **`cloudfront_domain_name`** – דומיין CloudFront (xxx.cloudfront.net).
- **`cloudfront_url`** – כתובת הפרונט: `https://<domain>.cloudfront.net`.

---

## שלב 7: GitHub Actions (CI/CD)

ב־`.github/workflows/` מוגדרים שני workflows:

| Workflow | טריגר | פעולה |
|----------|--------|--------|
| **Backend** | דחיפה ל־`main` (שינויים ב־server, Dockerfile, וכו') | Build Docker → Push ל־ECR → עדכון ECS (force new deployment) |
| **Frontend** | דחיפה ל־`main` (שינויים ב־client, vite, וכו') | Build עם `VITE_API_URL` → Sync ל־S3 → Invalidation ב־CloudFront |

### הגדרות ב־GitHub

**Variables (Settings → Secrets and variables → Actions → Variables):**

| Variable | חובה | תיאור |
|----------|------|--------|
| `AWS_ROLE_ARN` | **כן** | ARN של ה־IAM Role שנוצר ל-OIDC (למשל `arn:aws:iam::123456789:role/github-actions-oidc`). ראה OIDC setup. |

**Variables נוספות:**

| Variable | חובה | ברירת מחדל | תיאור |
|----------|------|------------|--------|
| `AWS_REGION` | לא | `eu-west-1` | אזור AWS |
| `ECR_REPOSITORY` | לא | `reposition` | שם ה-repository ב־ECR |
| `ECS_CLUSTER` | לא | `reposition-cluster` | שם ה-ECS cluster |
| `ECS_SERVICE` | לא | `reposition-service` | שם ה-ECS service |
| `S3_BUCKET` | **כן (פרונט)** | — | שם ה-S3 bucket של הפרונט (למשל מהפלט `frontend_bucket_name`) |
| `CLOUDFRONT_DISTRIBUTION_ID` | **כן (פרונט)** | — | ID של ה־CloudFront distribution (למשל מהפלט `cloudfront_distribution_id`) |
| `VITE_API_URL` | **כן (CloudFront)** | — | כתובת CloudFront (למשל `https://xxx.cloudfront.net`) – CloudFront מפנה /api ל־ALB, כך שאין Mixed Content. נבנית into ה-build. |

**חשוב:** כשנכנסים דרך CloudFront, יש להגדיר `VITE_API_URL` לכתובת ה־**CloudFront** (או לדומיין המותאם). CloudFront מפנה `/api/*` ל־ALB מאחורי הקלעים.

### דומיין מותאם + HTTPS

כדי להשתמש בדומיין משלך (למשל `app.reposition.com`) עם HTTPS:

1. **Route53:** ליצור hosted zone לדומיין (אם עדיין לא קיים), ולהעתיק את ה־Zone ID.
2. **Variables ב־`terraform.tfvars` או ל־apply:**
   - `domain_name` = כתובת הפרונט (למשל `app.reposition.com`)
   - `api_domain_name` = (אופציונלי) כתובת ה-API (למשל `api.reposition.com`) – גישה ישירה ל־ALB עם HTTPS
   - `route53_zone_id` = Zone ID מה־Route53
3. **`terraform apply`** – ייווצרו תעודות ACM, רשומות DNS, ו־CloudFront/ALB יתווספו לדומיין.
4. **GitHub:** לעדכן `VITE_API_URL` – כשהכל על דומיין אחד (למשל re-position.org): להגדיר **ריק** (`""`) כי ה-API נגיש דרך `/api/*` באותו origin. כשיש דומיין נפרד ל-API: להגדיר את כתובת ה-API.

### Rollback לבקאנד (לפי digest)

אם הגרסה האחרונה שבורה ורוצים לחזור לגרסה קודמת:

1. **למצוא digest של image שעבד:** ECR → Repositories → reposition → Images. עמודה "Image digest" (למשל `sha256:a1b2c3d4...`).
2. **להריץ Rollback workflow:** Actions → **Rollback Backend (by Digest)** → Run workflow → להדביק את ה-digest → Run.
3. ECS יגש ל-image הקודם ויריץ deployment חדש.

(ECR שומר עד 10 images – ראה `ecr_keep_last_n_images` ב־variables.tf.)

### Rollback לפרונט (לפי commit)

**אופציה 1 – Workflow:** Actions → **Rollback Frontend (by Commit)** → Run workflow → להזין commit SHA של הגרסה שעבדה (מ־GitHub → Commits). ה-workflow יבנה מאותו commit ויעלה ל-S3.

**אופציה 2 – git revert:** `git revert <commit>` → push. ה-Frontend workflow ירוץ אוטומטית ויעלה build מהגרסה המחזורית.

**אופציה 3 – S3 versioning:** ה-bucket עם versioning – אפשר לשחזר גרסאות קודמות ידנית ב-Console (S3 → Object → Versions → Restore).

### הרצה ידנית

ניתן להריץ כל workflow ידנית: Actions → בחר workflow → Run workflow.
