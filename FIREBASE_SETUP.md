# Firebase Setup Guide for Expenses Tracker

## 🚀 Why Firebase?

Firebase provides a complete backend solution that's perfect for this expenses tracker:
- **Authentication**: Built-in email/password auth
- **Database**: Firestore for real-time data
- **Hosting**: Global CDN with automatic scaling
- **Security**: Row-level security rules
- **No deployment limits**: Unlike Vercel's free tier

## 📋 Prerequisites

1. **Firebase Account**: Sign up at [firebase.google.com](https://firebase.google.com)
2. **Node.js**: Version 18 or higher
3. **Firebase CLI**: Install globally with `npm install -g firebase-tools`

## 🔧 Step-by-Step Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Enter project name: `expenses-tracker`
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

### 3. Create Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll add security rules later)
4. Select a location (choose closest to your users)
5. Click "Done"

### 4. Get Firebase Configuration

1. In Firebase Console, go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" → "Web"
4. Register app with name: `expenses-tracker-web`
5. Copy the configuration object

### 5. Set Environment Variables

1. Copy `firebase-config-template.env` to `.env.local`
2. Replace the placeholder values with your actual Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-actual-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 6. Initialize Firebase CLI

```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select these options:
# - Hosting: Configure files for Firebase Hosting
# - Firestore: Configure security rules and indexes
# - Use existing project
# - Select your project
# - Public directory: out
# - Single-page app: Yes
# - Overwrite index.html: No
```

### 7. Deploy Security Rules

```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

### 8. Test Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
# Sign up with email/password
# Test the app functionality
```

### 9. Deploy to Firebase Hosting

```bash
# Build and deploy
npm run firebase:deploy

# Or manually:
npm run export
firebase deploy
```

## 🔒 Security Rules

The app includes Firestore security rules that ensure:
- Users can only access their own data
- All operations require authentication
- Data is protected by user ID

## 📊 Data Structure

### Collections

1. **transactions**: User's financial transactions
2. **categories**: Spending/saving categories
3. **accounts**: Bank accounts, credit cards, etc.
4. **budgets**: Monthly budget limits
5. **savings_goals**: Savings targets
6. **rules**: Auto-categorization rules

### Example Document Structure

```javascript
// Transaction
{
  userId: "user123",
  accountId: "account456",
  date: Timestamp,
  description: "Grocery shopping",
  merchant: "Whole Foods",
  amount: -125.50,
  currency: "USD",
  categoryId: "groceries",
  tags: "food,essential",
  isTransfer: false,
  notes: "Weekly groceries",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## 🚀 Benefits of Firebase

1. **No Database Setup**: Firestore is fully managed
2. **Real-time Updates**: Data syncs automatically
3. **Scalable**: Handles millions of users
4. **Secure**: Built-in authentication and security rules
5. **Fast**: Global CDN with edge caching
6. **Free Tier**: Generous free limits
7. **No Deployment Limits**: Unlike Vercel

## 🔧 Troubleshooting

### Common Issues

1. **Authentication Errors**: Check Firebase Auth is enabled
2. **Database Errors**: Verify Firestore is created
3. **Deployment Errors**: Ensure Firebase CLI is logged in
4. **Environment Variables**: Make sure all Firebase config is set

### Getting Help

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

## 🎯 Next Steps

After setup, you can:
1. Add Google Sign-in
2. Implement data export/import
3. Add push notifications
4. Set up analytics
5. Configure custom domains

## 💰 Cost

Firebase has a generous free tier:
- **Authentication**: 10,000 users/month
- **Firestore**: 1GB storage, 50,000 reads/day, 20,000 writes/day
- **Hosting**: 10GB storage, 360MB/day transfer

Perfect for personal use and small teams!

