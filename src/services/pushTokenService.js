import { deleteDoc, doc, setDoc } from 'firebase/firestore'
import { getToken, deleteToken } from 'firebase/messaging'
import { db, getFirebaseMessaging, isFirebaseConfigured, vapidKey } from '../lib/firebase'
import { COLLECTIONS } from '../config/constants'

function tokenDocId(token) {
  let hash = 0
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 31 + token.charCodeAt(i)) >>> 0
  }
  return `t_${hash.toString(16)}`
}

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia('(display-mode: standalone)').matches
  const ios = window.navigator.standalone === true
  return mq || ios
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function pushPermissionState() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

async function ensureMessagingSw() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser.')
  }
  const base = import.meta.env.BASE_URL || '/'
  const swUrl = `${base}firebase-messaging-sw.js`.replace(/\/{2,}/g, '/')
  const reg = await navigator.serviceWorker.register(swUrl, {
    scope: base,
  })
  await navigator.serviceWorker.ready
  return reg
}

/**
 * Request permission, get FCM token, save under users/{uid}/fcmTokens.
 */
export async function requestPermissionAndSaveToken(userId) {
  if (!isFirebaseConfigured || !db || !userId) {
    throw new Error('Not signed in or Firebase is not configured.')
  }
  if (!vapidKey) {
    throw new Error('Missing VITE_FIREBASE_VAPID_KEY in environment.')
  }
  if (typeof Notification === 'undefined') {
    throw new Error('Notifications are not supported in this browser.')
  }

  const existingPerm = Notification.permission

  if (isIosDevice() && !isStandaloneDisplay()) {
    throw new Error(
      'On iPhone, add this site to your Home Screen, open it from the icon, then enable notifications.',
    )
  }

  // iOS home-screen PWAs: calling requestPermission() without a user gesture
  // can return "denied" even when Notification.permission is already "granted".
  let permission = existingPerm
  if (permission !== 'granted') {
    permission = await Notification.requestPermission()
  }
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.')
  }

  const messaging = await getFirebaseMessaging()
  if (!messaging) {
    throw new Error('Push messaging is not supported in this browser.')
  }

  const registration = await ensureMessagingSw()
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  })
  if (!token) {
    throw new Error('Could not get a push token. Try again.')
  }

  const now = new Date().toISOString()
  const id = tokenDocId(token)
  await setDoc(
    doc(db, COLLECTIONS.USERS, userId, 'fcmTokens', id),
    {
      token,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      platform: isIosDevice() ? 'ios' : 'web',
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    },
    { merge: true },
  )
  return token
}

export async function removeCurrentPushToken(userId) {
  if (!isFirebaseConfigured || !db || !userId) return
  const messaging = await getFirebaseMessaging()
  if (!messaging) return
  try {
    const registration = await ensureMessagingSw()
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    })
    if (token) {
      await deleteDoc(
        doc(db, COLLECTIONS.USERS, userId, 'fcmTokens', tokenDocId(token)),
      )
      await deleteToken(messaging)
    }
  } catch (err) {
    console.error('removeCurrentPushToken', err)
  }
}
