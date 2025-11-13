# 🚀 Deployment Guide - PDF Packet Generator

## Overview

This application has **TWO** parts that need to be deployed separately:

1. **Frontend (React App)** → Netlify ✅ (Already deployed at https://pdf-packet.netlify.app/)
2. **Backend (Cloudflare Worker)** → Cloudflare Workers ⚠️ (Needs deployment)

---

## 📋 Step-by-Step Deployment

### Part 1: Deploy Cloudflare Worker (Backend)

The worker handles PDF generation on the server side.

#### 1.1 Install Wrangler CLI (if not already installed)

```bash
npm install -g wrangler
```

#### 1.2 Login to Cloudflare

```bash
wrangler login
```

This will open a browser window for you to authorize Wrangler.

#### 1.3 Deploy the Worker

```bash
cd worker
wrangler deploy
```

**Output will show your worker URL, like:**
```
Published pdf-packet-generator (X.XX sec)
  https://pdf-packet-generator.YOUR-SUBDOMAIN.workers.dev
```

**📝 SAVE THIS URL!** You'll need it for the next step.

---

### Part 2: Configure Netlify Frontend

#### 2.1 Set Environment Variable in Netlify

1. Go to: https://app.netlify.com/sites/pdf-packet/settings/deploys
2. Click **Environment variables**
3. Add new variable:
   - **Key:** `VITE_WORKER_URL`
   - **Value:** `https://pdf-packet-generator.YOUR-SUBDOMAIN.workers.dev`
     (Use the URL from Step 1.3)

#### 2.2 Redeploy Netlify Site

After adding the environment variable:

1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**

---

## 🧪 Testing Production Deployment

### Test the Worker Directly

```bash
curl -X POST https://pdf-packet-generator.YOUR-SUBDOMAIN.workers.dev/generate-packet \
  -H "Content-Type: application/json" \
  -d '{"projectData":{"projectName":"Test"},"documents":[]}'
```

You should get a PDF response (binary data).

### Test the Full App

1. Visit: https://pdf-packet.netlify.app/
2. Go to `/admin` (password: `admin123`)
3. Upload some PDFs
4. Create a packet
5. Generate PDF ✅

---

## 🔧 Alternative: Quick Deploy Commands

### Deploy Everything at Once

```bash
# From project root
cd worker
wrangler deploy
cd ..

# Copy the worker URL and update .env
echo "VITE_WORKER_URL=https://pdf-packet-generator.YOUR-SUBDOMAIN.workers.dev" > .env

# Rebuild and deploy frontend (if using manual deploy)
npm run build
# Then upload dist/ folder to Netlify or commit changes for auto-deploy
```

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to PDF Worker"

**Solution:**
- Ensure worker is deployed (`wrangler deploy`)
- Verify `VITE_WORKER_URL` is set in Netlify
- Check worker URL is correct (no trailing slash)

### Issue: CORS Errors

**Solution:**
The worker already has CORS headers configured. If you see CORS errors:

1. Check the worker is deployed and accessible
2. Verify the URL is correct (HTTPS, not HTTP)

### Issue: "Failed to fetch"

**Possible causes:**
- Worker not deployed
- Wrong worker URL in environment variable
- Worker crashed (check Cloudflare dashboard logs)

---

## 📊 Monitoring

### Cloudflare Dashboard

View worker logs and metrics:
https://dash.cloudflare.com/ → Workers & Pages → pdf-packet-generator

### Netlify Dashboard

View frontend deployments:
https://app.netlify.com/sites/pdf-packet/overview

---

## 🔄 Updating After Code Changes

### Update Worker

```bash
cd worker
wrangler deploy
```

### Update Frontend

Netlify auto-deploys on git push. Or manually:

```bash
npm run build
# Upload dist/ folder to Netlify
```

---

## 💰 Cost Estimate

### Cloudflare Workers
- **Free Tier:** 100,000 requests/day
- **Paid:** $5/month for 10M requests

### Netlify
- **Free Tier:** 100GB bandwidth/month
- **Current usage:** Well within free tier

**Total Cost:** $0/month (free tier sufficient for most use cases)

---

## 🎯 Quick Reference

| Component | Service | URL |
|-----------|---------|-----|
| Frontend | Netlify | https://pdf-packet.netlify.app/ |
| Worker | Cloudflare | https://pdf-packet-generator.YOUR-SUBDOMAIN.workers.dev |
| Admin | Frontend | https://pdf-packet.netlify.app/admin |

---

## ✅ Deployment Checklist

- [ ] Cloudflare Worker deployed (`wrangler deploy`)
- [ ] Worker URL saved
- [ ] `VITE_WORKER_URL` set in Netlify environment variables
- [ ] Netlify site redeployed after env var change
- [ ] Test PDF generation in production
- [ ] Test admin panel document upload
- [ ] Verify all features work

---

**Need Help?** Check Cloudflare and Netlify documentation or contact support.

