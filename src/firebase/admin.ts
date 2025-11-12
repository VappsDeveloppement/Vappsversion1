
import * as admin from 'firebase-admin';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccount) {
    throw new Error('La clé du compte de service Firebase est manquante dans les variables d\'environnement. Impossible d\'initialiser le SDK Admin.');
}

let app: admin.app.App;

if (admin.apps.length === 0) {
    app = admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
} else {
    app = admin.app();
}

export const getAdminApp = () => app;
