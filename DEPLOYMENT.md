# Deployment Guide

This guide will help you deploy your Next.js jewelry app to Vercel.

## Prerequisites

- A GitHub account (or GitLab/Bitbucket)
- A Vercel account (free tier available)
- Your Supabase project credentials

## Step 1: Push to GitHub

If your code isn't already in a Git repository:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in (or create an account)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. **Configure Environment Variables:**
   - Add the following environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
6. Click **"Deploy"**

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow the prompts and add environment variables when asked

## Step 3: Configure Environment Variables

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anonymous key
3. Select environments: **Production**, **Preview**, and **Development**
4. Click **Save**

After adding environment variables, **redeploy** your application for changes to take effect.

## Step 4: Get Your Supabase Credentials

If you don't have your Supabase credentials:

1. Go to [supabase.com](https://supabase.com) and sign in
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → Use as `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → Use as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 5: Verify Deployment

After deployment:

1. Visit your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
2. Test the application functionality
3. Check browser console for any errors

## Post-Deployment Checklist

- [ ] Environment variables are set correctly
- [ ] Supabase storage bucket `cad-renders` exists and has proper permissions
- [ ] Supabase table `orders` exists with correct schema
- [ ] Application loads without errors
- [ ] Form submission works
- [ ] File uploads work correctly

## Troubleshooting

### Build Errors
- Check that all dependencies are in `package.json`
- Ensure Node.js version is compatible (Vercel uses Node 18+ by default)

### Environment Variable Issues
- Verify variables are prefixed with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding/changing environment variables

### Supabase Connection Issues
- Verify your Supabase project is active
- Check that CORS is configured correctly in Supabase
- Ensure your Supabase tables and storage buckets exist

## Continuous Deployment

Vercel automatically deploys:
- **Production**: Every push to `main` branch
- **Preview**: Every push to other branches (creates preview URLs)

## Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

## Need Help?

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/app/building-your-application/deploying)
- [Supabase Documentation](https://supabase.com/docs)
