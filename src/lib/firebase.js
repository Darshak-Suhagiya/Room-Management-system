import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, isSupported } from 'firebase/messaging'

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
)

let app = null
let auth = null
let db = null
let messaging = null
let messagingReady = null

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
}

/** Lazily init messaging when the browser supports it. */
export async function getFirebaseMessaging() {
  if (!isFirebaseConfigured || !app) return null
  if (messaging) return messaging
  if (!messagingReady) {
    messagingReady = (async () => {
      try {
        if (!(await isSupported())) return null
        messaging = getMessaging(app)
        return messaging
      } catch (err) {
        console.error('Messaging init failed', err)
        return null
      }
    })()
  }
  return messagingReady
}

export { app, auth, db }
