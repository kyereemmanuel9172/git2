# Deployment Guide

This guide covers deploying the Church Management System to Vercel (frontend) and Railway (backend).

## Prerequisites

- GitHub repository with the code
- Vercel account (https://vercel.com)
- Railway account (https://railway.app)
- PostgreSQL database (Railway or external)

## Environment Variables

### Backend (Railway)

Set these in your Railway service:

```bash
DATABASE_URL=postgresql://user:password@host:5432/church_db?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=8h
NODE_ENV=production
PORT=3002
FRONTEND_URL=https://your-app.vercel.app

# Email (Resend)
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@yourchurch.com

# SMS (optional)
SMS_PROVIDER=dev
```

### Frontend (Vercel)

Set these in your Vercel project:

```bash
NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app/api
```

## Deployment Steps

### 1. Deploy Backend to Railway

1. Go to https://railway.app and create a new project
2. Add a PostgreSQL service
3. Add a new service from GitHub repo
4. Set the root directory to `backend`
5. Configure environment variables
6. Railway will auto-deploy on push to main

### 2. Deploy Frontend to Vercel

1. Go to https://vercel.com and import the GitHub repo
2. Set the framework preset to Next.js
3. Set the root directory to `frontend`
4. Add environment variables
5. Deploy

### 3. Database Migration

After deployment, run the database migration:

```bash
# In Railway terminal or via CLI
npx prisma migrate deploy
npm run seed
```

## Docker Deployment

For self-hosted deployment with Docker:

```bash
# Build and start all services
docker-compose up -d

# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Seed the database
docker-compose exec backend npm run seed
```

## Environment Variable Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | No |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | Yes |
| `JWT_EXPIRES_IN` | Token expiration time | No (default: 8h) |
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port | No (default: 3002) |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |
| `RESEND_API_KEY` | Resend API key for emails | No |
| `SMS_PROVIDER` | SMS provider (twilio/africastalking/dev) | No |

## Health Check

Once deployed, verify the backend is running:

```bash
curl https://your-railway-app.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 100,
  "database": "connected"
}
```

## Troubleshooting

### CORS Errors

Ensure `FRONTEND_URL` is set correctly in the backend environment.

### Database Connection Issues

Verify the `DATABASE_URL` is correct and the database is accessible from Railway.

### Build Failures

Check the build logs in Railway/Vercel dashboard for specific error messages.
