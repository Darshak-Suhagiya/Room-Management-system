# Room Management system

React + Vite app with Firebase Auth/Firestore and **Vercel** for FCM push send.

## Push notifications

1. Users enable notifications (My Meals / Room Seva) → FCM tokens saved in Firestore.
2. Admins open **Push notifications** → **Send now** (quick digest or custom).
3. Browser calls Vercel `/api/send-push`, which uses Firebase Admin + FCM.
4. Finance due-date reminders run daily via Vercel Cron (`GET /api/finance-reminders` at 09:00 IST).

No Cloud Functions / Blaze required for push.

### Setup

1. **VAPID key** — Firebase Console → Cloud Messaging → Web Push certificates → set `VITE_FIREBASE_VAPID_KEY` in `.env`.

2. **Service account** — Firebase Console → Project settings → Service accounts → Generate new private key.  
   On Vercel: Project → Settings → Environment Variables →  
   `FIREBASE_SERVICE_ACCOUNT` = entire JSON as one string (production + preview).

3. **Cron secret** — set `CRON_SECRET` on Vercel (production). Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` to `/api/finance-reminders`. Hobby plans allow one cron per day; this job is scheduled for 09:00 IST (`30 3 * * *` UTC).

4. Deploy to Vercel (`vercel` / Git integration). Local API testing:
   ```bash
   npx vercel dev
   ```
   (Vite alone does not run `/api`.)

### Permissions

Vote dashboard: any approved role  
Lock / unlock votes: `admin` | `maharaj` | `kitchen_leader`  
Adjust vote totals: `admin` | `kitchen_leader`  
Menu planning: `admin` | `kitchen_leader` | `room_leader` | `resident` (not Maharaj)  
Send push: `admin` | `kitchen_leader` | `room_leader`  
Manage finance: `admin` | `room_leader`  
View finance: any approved role except Maharaj

## Scripts

```bash
npm run dev          # Vite UI only
npx vercel dev       # UI + /api/send-push
npm run build
```
