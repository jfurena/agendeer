# Agendeer 🦌

Agendeer is a modern, prioritization-focused task management application built with React, Tailwind CSS, and Firebase.

## Features

- **Smart Prioritization**: Organize tasks by High, Medium, or Low priority with visual "traffic light" indicators.
- **Views**: Switch between List view and Calendar view.
- **Tags**: Add multiple tags to organize your tasks.
- **Filters & Sorting**: Advanced filtering by tag/priority and custom sorting.
- **Mobile Optimized**: Fully responsive design with mobile-friendly controls.
- **Cloud Sync**: Real-time synchronization using Firebase Firestore.
- **Google Calendar Integration**: Quickly add tasks to your Google Calendar.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend/Auth**: Firebase (Firestore, Authentication)
- **Icons**: Lucide React
- **Dates**: date-fns

## Deployment

### Vercel
1. Push this repository to GitHub.
2. Import the project in Vercel.
3. Add your Firebase environment variables in Vercel Project Settings.
4. Deploy! (A `vercel.json` is included for SPA routing configuration).

### Environment Variables
Create a `.env` file (or add to Vercel/Netlify vars):
```
VITE_API_KEY=...
VITE_AUTH_DOMAIN=...
VITE_PROJECT_ID=...
VITE_STORAGE_BUCKET=...
VITE_MESSAGING_SENDER_ID=...
VITE_APP_ID=...
```

