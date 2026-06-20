# Deployment Guide

To deploy this EcoTrace AI application to **Vercel**, follow these steps:

## Prerequisites
- A [Vercel](https://vercel.com) account.
- Your project pushed to a GitHub, GitLab, or Bitbucket repository.

## Steps to Deploy

1. **Connect Repository**:
   - Create a new project in Vercel and select your repository.
   
2. **Configure Build Settings**:
   - Vercel should automatically detect the framework (Vite).
   - Ensure the "Build Command" is set to `npm run build`.
   - Ensure the "Output Directory" is set to `dist`.

3. **Environment Variables**:
   - Go to the **Environment Variables** section in your Vercel project settings.
   - Add a new variable:
     - **Key**: `GEMINI_API_KEY`
     - **Value**: Your Google Gemini API Key.
   
4. **Deploy**:
   - Click **Deploy**. Vercel will build your frontend and set up the Express backend as a serverless function based on the `vercel.json` configuration provided.

## How it Works
- The `vercel.json` file routes all requests starting with `/api` to the `server.ts` file.
- All other requests are handled by the Vite static build in the `dist` folder.
- The `server.ts` file has been modified to export the Express app, allowing Vercel to use it as a serverless handler.
