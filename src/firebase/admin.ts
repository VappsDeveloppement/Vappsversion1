
import { getApps, initializeApp, App } from 'firebase-admin/app';

/**
 * Initializes the Firebase Admin SDK.
 * It ensures that the app is initialized only once.
 * In many environments (like Google Cloud Functions, Cloud Run),
 * calling initializeApp() without arguments is sufficient as the SDK
 * will automatically detect the project's service account credentials.
 */
export function initializeAdminApp(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0]!;
  }
  
  try {
    // Calling initializeApp without arguments allows it to use
    // Application Default Credentials provided by the environment.
    return initializeApp();
  } catch (e) {
    console.error("Firebase Admin SDK initialization failed.", e);
    throw new Error("Could not initialize Firebase Admin SDK. Ensure the server environment is configured with the correct credentials.");
  }
}

    