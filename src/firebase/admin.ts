
import { initializeApp, getApp, getApps, App, cert } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

// This is a simplified check. In a real app, you'd use environment variables
// to securely store and access your service account key.
const isFirebaseAdminInitialized = () => getApps().some(app => app.name === '[DEFAULT]');

export const initializeAdminApp = (): { app: App } => {
  if (isFirebaseAdminInitialized()) {
    return { app: getApp() };
  }

  // IMPORTANT: For local development, you must have the
  // GOOGLE_APPLICATION_CREDENTIALS environment variable set to the path
  // of your service account key file.
  // In a deployed environment (like Cloud Run or Cloud Functions), this
  // is typically handled automatically.
  
  // This will use the GOOGLE_APPLICATION_CREDENTIALS environment variable
  // for authentication.
  const app = initializeApp();
  
  return { app };
};

