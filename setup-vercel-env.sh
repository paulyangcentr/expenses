#!/bin/bash

echo "Setting up Vercel environment variables for production..."

# Database URL (your Supabase connection string)
echo "Setting DATABASE_URL..."
vercel env add DATABASE_URL production <<< "postgresql://postgres:[9788909024369Aa.]@db.algwhjylqlfribwaoear.supabase.co:5432/postgres"

# Database Provider
echo "Setting DATABASE_PROVIDER..."
vercel env add DATABASE_PROVIDER production <<< "postgresql"

# NextAuth URL (will be your Vercel app URL)
echo "Setting NEXTAUTH_URL..."
vercel env add NEXTAUTH_URL production <<< "https://expenses-89m6twzkr-paul-yangs-projects-f42f5b90.vercel.app"

# NextAuth Secret (generate a secure random string)
echo "Setting NEXTAUTH_SECRET..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
vercel env add NEXTAUTH_SECRET production <<< "$NEXTAUTH_SECRET"

# Email Server Configuration (you'll need to update these with your actual email credentials)
echo "Setting EMAIL_SERVER_HOST..."
vercel env add EMAIL_SERVER_HOST production <<< "smtp.gmail.com"

echo "Setting EMAIL_SERVER_PORT..."
vercel env add EMAIL_SERVER_PORT production <<< "587"

echo "Setting EMAIL_SERVER_USER..."
vercel env add EMAIL_SERVER_USER production <<< "your-email@gmail.com"

echo "Setting EMAIL_SERVER_PASSWORD..."
vercel env add EMAIL_SERVER_PASSWORD production <<< "your-app-password"

echo "Environment variables set up complete!"
echo ""
echo "IMPORTANT: You need to update the email server credentials with your actual Gmail credentials:"
echo "1. Go to your Gmail account settings"
echo "2. Enable 2-factor authentication"
echo "3. Generate an App Password"
echo "4. Update EMAIL_SERVER_USER and EMAIL_SERVER_PASSWORD in Vercel dashboard"
echo ""
echo "Or you can run: vercel env pull to download the current environment variables"
