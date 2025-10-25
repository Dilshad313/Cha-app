# Cloudinary Setup Guide

This application uses Cloudinary for image and media storage. Follow these steps to configure it:

## Step 1: Create a Cloudinary Account

1. Go to [https://cloudinary.com/](https://cloudinary.com/)
2. Click "Sign Up" and create a free account
3. Verify your email address

## Step 2: Get Your Credentials

1. Log in to your Cloudinary dashboard
2. You'll see your credentials on the dashboard:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

## Step 3: Configure Environment Variables

1. In the `backend` folder, create a `.env` file (copy from `.env.example`)
2. Add your Cloudinary credentials:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

## Step 4: Restart the Server

After adding the credentials, restart your backend server:

```bash
npm run dev
```

## Troubleshooting

### Error: "Image upload service not configured"
- Make sure all three Cloudinary environment variables are set in `.env`
- Check that there are no extra spaces in the values
- Restart the server after adding credentials

### Error: "Failed to upload image"
- Verify your API credentials are correct
- Check your internet connection
- Make sure your Cloudinary account is active

### File Size Limits
- Free tier: 10MB per image
- Supported formats: JPG, PNG, GIF, WebP, etc.

## Testing

To test if Cloudinary is working:
1. Start the backend server
2. Check the console for: "✅ Cloudinary configured successfully"
3. Try sending an image in the chat

## Need Help?

- Cloudinary Documentation: [https://cloudinary.com/documentation](https://cloudinary.com/documentation)
- Free tier includes: 25 GB storage, 25 GB bandwidth/month
