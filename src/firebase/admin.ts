
import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { firebaseConfig } from './config';

export function initializeAdminApp(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0]!;
  }
  
  // This approach is simplified for this environment and not for production with real secrets.
  // It uses the public client-side config, which works for some Admin SDK features
  // in a trusted server environment but lacks full admin privileges without a service account.
  try {
    return initializeApp({
      projectId: firebaseConfig.projectId,
    });
  } catch (e) {
    console.error("Firebase Admin SDK initialization failed.", e);
    // This will likely fail if called multiple times without the getApps check,
    // but the check above should prevent that.
    throw e;
  }
}
