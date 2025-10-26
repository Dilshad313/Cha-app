# Talko - Vercel Deployment Guide

## 🚀 Quick Fix for Current Issues

### Issue 1: 404 Error on Page Reload
**Fixed by:** `vercel.json` configuration
- All routes now redirect to `index.html`
- React Router handles client-side routing

### Issue 2: Chat Page Not Appearing After Login
**Cause:** Missing environment variable for backend URL
**Solution:** Set `VITE_BACKEND_URL` in Vercel

### Issue 3: Mobile View Breaking on Vercel
**Fixed by:**
- Enhanced viewport meta tags in `index.html`
- Proper CSS for mobile rendering
- Font size fixes to prevent iOS zoom

## 📋 Deployment Steps

### Step 1: Deploy Backend (if not already deployed)

1. Deploy your backend to a hosting service (e.g., Render, Railway, Heroku)
2. Note down your backend URL (e.g., `https://your-backend.onrender.com`)

### Step 2: Configure Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variable:

```
Name: VITE_BACKEND_URL
Value: https://your-backend-url.com/api
```

**Important:** 
- Replace `your-backend-url.com` with your actual backend URL
- Include `/api` at the end
- Example: `https://talko-backend.onrender.com/api`

### Step 3: Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to your Chat folder
cd Chat

# Deploy
vercel --prod
```

#### Option B: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `Chat`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add environment variable (see Step 2)
6. Click **"Deploy"**

### Step 4: Verify Deployment

1. **Test Routing:**
   - Visit any route (e.g., `/chat`, `/profile`)
   - Refresh the page
   - Should NOT show 404 error ✅

2. **Test Login:**
   - Login with credentials
   - Should redirect to `/chat` page ✅
   - Chat interface should load ✅

3. **Test Mobile View:**
   - Open browser DevTools
   - Toggle device toolbar (mobile view)
   - Layout should be responsive ✅

## 🔧 Files Created/Modified

### New Files:
1. **`vercel.json`** - Routing configuration for SPA
2. **`public/_redirects`** - Fallback redirect rule
3. **`.env.example`** - Environment variable template

### Modified Files:
1. **`index.html`** - Enhanced mobile viewport settings
2. **`vite.config.js`** - Production build optimization

## 🌐 Backend CORS Configuration

Ensure your backend allows requests from your Vercel domain:

```javascript
// backend/index.js
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://your-vercel-app.vercel.app', // Add your Vercel URL
    'https://your-custom-domain.com'      // Add custom domain if any
  ],
  credentials: true
};

app.use(cors(corsOptions));
```

## 📱 Mobile View Fixes Applied

1. **Viewport Meta Tag:**
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
   ```

2. **iOS Input Zoom Prevention:**
   ```css
   input, select, textarea {
     font-size: 16px !important;
   }
   ```

3. **Full Height Layout:**
   ```css
   html, body, #root {
     width: 100%;
     height: 100%;
     overflow: hidden;
   }
   ```

## 🐛 Troubleshooting

### Issue: Still Getting 404 on Reload
**Solution:**
1. Clear Vercel cache: Settings → Data Cache → Purge
2. Redeploy: Deployments → ⋯ → Redeploy

### Issue: Chat Page Blank After Login
**Check:**
1. Environment variable is set correctly
2. Backend URL is accessible (test in browser)
3. CORS is configured on backend
4. Check browser console for errors

### Issue: Mobile View Still Broken
**Check:**
1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Test in incognito/private mode
4. Check if CSS is loading (Network tab)

### Issue: WebSocket Connection Failed
**Solution:**
1. Ensure backend supports WebSocket
2. Check if backend URL is correct
3. Verify CORS settings include WebSocket

## 📊 Performance Optimization

The deployment includes:
- Code splitting for faster load times
- Vendor chunk separation
- Optimized build output
- Proper caching headers

## 🔒 Security Headers

Added security headers in `vercel.json`:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block

## ✅ Checklist Before Deployment

- [ ] Backend is deployed and accessible
- [ ] VITE_BACKEND_URL is set in Vercel
- [ ] CORS is configured on backend
- [ ] vercel.json exists in Chat folder
- [ ] Environment variable includes `/api` suffix
- [ ] Backend URL uses HTTPS (not HTTP)

## 🎉 Post-Deployment

After successful deployment:
1. Test all routes
2. Test login/logout
3. Test chat functionality
4. Test on mobile device (real device, not just DevTools)
5. Test WebSocket connection
6. Test notifications

## 📞 Support

If issues persist:
1. Check Vercel deployment logs
2. Check browser console errors
3. Check Network tab for failed requests
4. Verify backend is responding correctly
