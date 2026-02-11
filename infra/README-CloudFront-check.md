# בדיקה: למה CloudFront לא מציג את האתר

## 1. לוודא שכתובת CloudFront נכונה

- ב־Terraform: `terraform -chdir=infra output cloudfront_url` (או `cloudfront_domain_name`).
- או ב־AWS Console: **CloudFront** → **Distributions** → רק distribution אחד שמחובר ל־S3 של reposition (Origin = ה-bucket שלך).
- אם יש שני distributions – להשתמש ב־URL של זה ש־Terraform מנהל (ה־ID מופיע ב־output `cloudfront_distribution_id`).

## 2. לוודא ש־S3 מלא

- **AWS Console** → **S3** → bucket בשם `reposition-frontend-<ACCOUNT_ID>`.
- בתוך ה־bucket אמורים להיות **בשורש** (לא בתיקייה):
  - `index.html`
  - תיקייה `assets/` עם קבצי JS/CSS.

אם ה־bucket ריק או חסרים קבצים – להריץ שוב את העלאת הפרונט (ראו למטה).

## 3. להעלות פרונט ל־S3 (אם חסר)

**אופציה א' – דרך GitHub Actions**

- **Actions** → **Frontend (S3 + CloudFront)** → **Run workflow** (branch: main).
- לוודא ש־Variables: `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID` מוגדרים.

**אופציה ב' – מהמחשב**

```bash
npm run build
aws s3 sync dist/public s3://reposition-frontend-<ACCOUNT_ID> --delete
aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
```

(להחליף `<ACCOUNT_ID>` ו־`<DISTRIBUTION_ID>` בערכים מ־`terraform output`.)

## 4. Invalidation ב־CloudFront

אם העלית קבצים אבל עדיין רואים דף ריק/ישן:

- **CloudFront** → ה־distribution → **Invalidations** → **Create invalidation**.
- Paths: `/*` → Create.

## 5. בדיקה בדפדפן

- לפתוח את כתובת CloudFront.
- **F12** → **Network**: לראות אם הבקשה ל־`/` או ל־`/index.html` מחזירה 200 ומה ה־Response (למשל 403/404 = בעיית הרשאות או חסר קובץ ב־S3).
