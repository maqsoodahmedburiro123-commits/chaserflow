import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signOut, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Invoice, ChaserSettings } from '../types/chaserflow';

// Ensure single Firebase instance
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Scopes for Google Workspace & Sheets integration
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly'
];

export const googleProvider = new GoogleAuthProvider();
SCOPES.forEach(scope => googleProvider.addScope(scope));
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// In-memory token cache (Per Workspace security guidelines: Never store tokens in localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // User logged in from previous session, token may need refresh on next interactive action
        if (onAuthSuccess) onAuthSuccess(user, null);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) {
    console.warn('Google sign-in already in progress.');
    return null;
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    // Gracefully handle standard popup closure or cancellation by the user
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      console.info('Google sign-in popup was closed by user or cancelled.');
      return null;
    }
    if (error?.code === 'auth/popup-blocked') {
      console.warn('Google sign-in popup was blocked by browser.');
      throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
    }
    console.error('Google Sign-in failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  
  // If user is logged in but token expired/lost from memory, prompt interactive sign-in
  if (auth.currentUser) {
    try {
      const res = await googleSignIn();
      return res ? res.accessToken : null;
    } catch {
      return null;
    }
  }
  return null;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/* =========================================================================
   Firestore Persistent Storage Operations
   ========================================================================= */

export const loadInvoicesFromFirestore = async (userId: string): Promise<Invoice[]> => {
  try {
    const invoicesRef = collection(db, 'users', userId, 'invoices');
    const snapshot = await getDocs(invoicesRef);
    const invoices: Invoice[] = [];
    snapshot.forEach((d) => {
      invoices.push(d.data() as Invoice);
    });
    return invoices;
  } catch (err) {
    console.warn('Could not load invoices from Firestore:', err);
    return [];
  }
};

export const saveInvoiceToFirestore = async (userId: string, invoice: Invoice): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'users', userId, 'invoices', invoice.id);
    await setDoc(invoiceRef, {
      ...invoice,
      userId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn(`Could not save invoice ${invoice.id} to Firestore:`, err);
  }
};

export const deleteInvoiceFromFirestore = async (userId: string, invoiceId: string): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'users', userId, 'invoices', invoiceId);
    await deleteDoc(invoiceRef);
  } catch (err) {
    console.warn(`Could not delete invoice ${invoiceId} from Firestore:`, err);
  }
};

export const batchSaveInvoicesToFirestore = async (userId: string, invoices: Invoice[]): Promise<void> => {
  try {
    const batch = writeBatch(db);
    invoices.forEach((inv) => {
      const ref = doc(db, 'users', userId, 'invoices', inv.id);
      batch.set(ref, {
        ...inv,
        userId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.warn('Could not batch save invoices to Firestore:', err);
  }
};

export const saveSettingsToFirestore = async (userId: string, settings: ChaserSettings): Promise<void> => {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'user_settings');
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Could not save settings to Firestore:', err);
  }
};

export const loadSettingsFromFirestore = async (userId: string): Promise<ChaserSettings | null> => {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'user_settings');
    const snapshot = await getDoc(settingsRef);
    if (snapshot.exists()) {
      return snapshot.data() as ChaserSettings;
    }
    return null;
  } catch (err) {
    console.warn('Could not load settings from Firestore:', err);
    return null;
  }
};
