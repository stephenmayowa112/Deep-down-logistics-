import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  createUserWithEmailAndPassword,
  signOut,
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import config from '../../firebase-applet-config.json';

export const app = initializeApp(config);
export const db = initializeFirestore(
  app,
  { experimentalForceLongPolling: true },
  config.firestoreDatabaseId || '(default)'
);
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: [
        browserLocalPersistence,
        browserSessionPersistence,
        indexedDBLocalPersistence,
      ],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
})();

export async function createSecondaryAuthUser(email: string, password: string): Promise<string> {
  const secondaryAppName = 'SecondaryAccountCreator';
  const existingApp = getApps().find((a) => a.name === secondaryAppName);
  const secondaryApp = existingApp || initializeApp(config, secondaryAppName);
  const secondaryAuth = (() => {
    try {
      return initializeAuth(secondaryApp, { persistence: inMemoryPersistence });
    } catch {
      return getAuth(secondaryApp);
    }
  })();

  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const uid = cred.user.uid;
  await signOut(secondaryAuth);
  return uid;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();
