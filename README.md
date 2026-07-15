# Room Management system

React + Vite app with Firebase Auth/Firestore and **Vercel** for FCM push send.

## Push notifications (send now only)

1. Users enable notifications (My Meals / Room Seva) → FCM tokens saved in Firestore.
2. Admins open **Push notifications** → **Send now** (quick digest or custom).
3. Browser calls Vercel `/api/send-push`, which uses Firebase Admin + FCM.

No Cloud Functions / Blaze required for push. No auto-scheduler.

### Setup

1. **VAPID key** — Firebase Console → Cloud Messaging → Web Push certificates → set `VITE_FIREBASE_VAPID_KEY` in `.env`.

2. **Service account** — Firebase Console → Project settings → Service accounts → Generate new private key.  
   On Vercel: Project → Settings → Environment Variables →  
   `FIREBASE_SERVICE_ACCOUNT` = entire JSON as one string (production + preview).

3. Deploy to Vercel (`vercel` / Git integration). Local API testing:
   ```bash
   npx vercel dev
   ```
   (Vite alone does not run `/api`.)

### Permissions

Send push: `admin` | `kitchen_leader` | `room_leader`

## Scripts

```bash
npm run dev          # Vite UI only
npx vercel dev       # UI + /api/send-push
npm run build
```
