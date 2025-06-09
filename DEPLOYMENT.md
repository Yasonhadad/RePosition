# 🚀 Deployment Guide - REPOSITION Football Analytics

## Local Development to Production

### Option 1: Cloud Hosting (Recommended)

#### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Build and deploy
npm run build
vercel --prod
```

#### Railway Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway deploy
```

### Option 2: VPS/Server Deployment

#### Setup Production Environment
```bash
# Clone on server
git clone <your-repo-url>
cd reposition-football-analytics

# Install dependencies
npm install --production

# Setup environment
cp .env.example .env
# Edit .env with production values

# Build application
npm run build

# Setup PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name "reposition-app"
pm2 startup
pm2 save
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 3: Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/reposition_db
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: reposition_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Environment Variables for Production

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database
PGHOST=your-postgres-host
PGPORT=5432
PGDATABASE=reposition_db
PGUSER=your-user
PGPASSWORD=your-password

# Security
SESSION_SECRET=very-long-random-string-for-production
NODE_ENV=production

# Optional: Analytics/Monitoring
SENTRY_DSN=your-sentry-dsn
ANALYTICS_ID=your-analytics-id
```

## Database Migration for Production

```bash
# Backup existing data (if any)
pg_dump $DATABASE_URL > backup.sql

# Run migrations
npm run db:push

# Import data if needed
psql $DATABASE_URL < backup.sql
```

## Performance Optimization

### Database Indexing
```sql
-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_players_club ON players(current_club_id);
CREATE INDEX IF NOT EXISTS idx_players_ovr ON players(ovr);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON player_favorites(user_id);
```

### Application Optimizations
```bash
# Enable gzip compression in production
# Add caching headers
# Use CDN for static assets
# Implement connection pooling
```

## Monitoring and Logging

### PM2 Monitoring
```bash
# View logs
pm2 logs reposition-app

# Monitor performance
pm2 monit

# Restart if needed
pm2 restart reposition-app
```

### Health Check Endpoint
Add to your application:
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
```

## Security Considerations

1. **Environment Variables**: Never commit .env files
2. **HTTPS**: Use SSL certificates (Let's Encrypt)
3. **Rate Limiting**: Implement API rate limiting
4. **CORS**: Configure CORS properly
5. **Session Security**: Use secure session settings
6. **Database Security**: Use connection pooling and prepared statements

## Backup Strategy

### Automated Database Backups
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > "backup_${DATE}.sql"
# Upload to cloud storage (AWS S3, Google Cloud, etc.)
```

### Schedule with Cron
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

## Scaling Considerations

1. **Database**: Use read replicas for heavy read operations
2. **Load Balancing**: Use nginx or cloud load balancers
3. **Caching**: Implement Redis for session storage and caching
4. **CDN**: Use CloudFlare or AWS CloudFront
5. **Monitoring**: Set up application monitoring (New Relic, DataDog)

## Troubleshooting Production Issues

### Common Problems
1. **Memory Issues**: Monitor Node.js memory usage
2. **Database Connections**: Implement connection pooling
3. **File Permissions**: Ensure proper file permissions
4. **Environment Variables**: Verify all variables are set
5. **Port Conflicts**: Ensure port 5000 is available

### Log Analysis
```bash
# View application logs
tail -f /var/log/reposition/app.log

# Check system resources
htop
df -h
free -m
```

## SSL Certificate Setup (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

This deployment guide covers most production scenarios. Choose the option that best fits your infrastructure and requirements.