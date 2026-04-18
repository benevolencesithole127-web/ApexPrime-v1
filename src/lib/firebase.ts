import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Connectivity check
async function testConnection() {
  try {
    // Attempt to fetch a non-existent doc to test connectivity
    await getDocFromServer(doc(db, '_internal_', 'connectivity-test'));
    console.log('Firebase connection established.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error('Firebase client is offline. Check configuration.');
    } else {
      console.log('Firebase connection test completed (expected error for missing doc).');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}
