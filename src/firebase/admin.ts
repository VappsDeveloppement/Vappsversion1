
import { initializeApp, getApp, getApps, App } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

export const initializeAdminApp = (): { app: App } => {
  if (getApps().length) {
    return { app: getApp() };
  }

  // This will use the GOOGLE_APPLICATION_CREDENTIALS environment variable
  // for authentication, which is the standard and recommended way in secure
  // server environments.
  const app = initializeApp();
  
  return { app };
};
