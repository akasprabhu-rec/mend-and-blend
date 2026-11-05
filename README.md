# Mend and Blend

## Requirements
- Node.js 20.19 or higher (`node -v`)

## Setup

### Backend
```bash
cd backend
npm ci
copy .env.example .env    # Windows; macOS/Linux: cp .env.example .env
npm run dev
```
Runs at http://localhost:5000. Test: http://localhost:5000/api/health

### Frontend (in a second terminal)
```bash
cd frontend
npm ci
copy .env.example .env    # Windows; macOS/Linux: cp .env.example .env
npm run dev
```
Runs at http://localhost:5173

## Firebase setup (Phase 3)
1. Create a Firebase project and register a **Web app**. Copy its public web configuration into `frontend/.env` using the `VITE_FIREBASE_*` names from `frontend/.env.example`.
2. In Firebase Console, enable **Authentication → Sign-in method → Google**, choose a support email, and add local/deployed frontend domains under **Authentication → Settings → Authorized domains**.
3. Create a Cloud Firestore database. From the project root, select the Firebase project with the Firebase CLI and deploy the rules and indexes using `firebase deploy --only firestore:rules,firestore:indexes`.
4. Configure the backend with the same project ID as `FIREBASE_PROJECT_ID`. The backend loads `backend/.env` relative to its own source path. For local development on Windows, run `gcloud auth application-default login` as the same Windows user that runs Node, then run `npm run diagnose:firebase` from `backend`; the command performs a read-only Firestore query and never prints credentials. If Firestore reports permission denied, the ADC identity needs Firestore read access (Cloud Datastore Viewer, `roles/datastore.viewer`, includes `datastore.entities.list`). For the full backend booking/admin workflows, grant only the additional least-privilege permissions that those server operations require. On Render, use a Render Secret File for the Firebase service-account JSON and point `GOOGLE_APPLICATION_CREDENTIALS` to its mounted path. Never put Admin credentials in the frontend or commit credential files.
5. To grant an administrator, a trusted server-side process must set the Firebase Auth custom claim `{ admin: true }`. The API checks verified, non-revoked Firebase ID tokens and this claim. `adminRoles/{uid}` is reserved for trusted server-side administration and is not client-accessible.
6. Sign in as an administrator and open `/admin`. Create and manage events from the **Manage events** section. Existing workshop documents remain in place and can be edited through the same event manager.
7. An administrator can verify live backend Firestore access at `GET /api/admin/diagnostics/firebase` after signing in. The endpoint requires a valid Firebase ID token with the trusted `admin: true` claim and performs only a limited, read-only workshop query.

Firestore collections and document IDs:
- `users/{uid}`: `uid`, `displayName`, `email`, `photoURL`, `createdAt`, `updatedAt`. The document ID is the Firebase UID.
- `workshops/{eventId}`: dynamically managed event details, category, schedule, price, capacity, registration window, status, and publication state. Existing document IDs are retained so booking, payment, and ticket links remain valid.
- `bookings/{bookingId}`: `customerId` (Firebase UID), `workshopId`, `status`, and timestamps.
- `payments/{paymentId}`: `customerId`, `bookingId`, provider references, amount, currency, `status`, and timestamps.
- `razorpayWebhookEvents/{eventId}`: server-only event ID, event type, processing status, and receive time for duplicate delivery protection.
- `tickets/{ticketId}`: `customerId`, `bookingId`, `workshopId`, workshop and participant details, an opaque QR token, validity status, and issue/use timestamps. The document ID is the booking ID, so a paid booking can have only one ticket.
- `adminRoles/{uid}`: server-managed role metadata; authorization is based on the verified Firebase `admin` custom claim.
- `bookingLimits/{uid_or_uid_sessionId}`: server-managed active reservation/ticket limit lock.

Booking, payment, ticket, and role writes are server-only. Ticket and booking ownership uses the Firebase UID in `customerId`; tickets can only be read by their owner or a verified admin. Firestore rules deny client changes to booking/payment status, ticket validity, and roles. A ticket is created in the same Firestore transaction that records a verified captured payment and confirms its booking. Its QR code contains only a cryptographically random, opaque token, not participant details, payment data, or Firestore IDs.

The backend defaults to `BOOKING_TICKET_LIMIT_POLICY=one_per_session` (one reservation/ticket per customer per individual session); set it to `one_total` to limit customers to one across all sessions. `BOOKING_HOLD_MINUTES` defaults to 10 and accepts 1–30 minutes. Reservations store their expiry and no longer count against capacity after that time. Capacity is checked and reserved in a Firestore transaction; unpublished sessions are rejected by the backend even if a client submits their ID directly.

## Razorpay payments (Phase 5)
1. In Razorpay Dashboard, enable **Test Mode** and copy the test **Key ID** and **Key Secret** into `backend/.env` as `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Never use a `VITE_` variable for the secret. The backend returns only the public Key ID to Checkout.
2. Set `RAZORPAY_WEBHOOK_SECRET` in `backend/.env`. In Razorpay Test Mode, add a webhook at `https://<your-public-backend>/api/payments/webhook` with the same secret and subscribe to `payment.authorized`, `payment.captured`, `payment.failed`, and `order.paid`. For local testing, expose the backend with a trusted HTTPS tunnel and configure that URL in the Razorpay Dashboard.
3. Ensure Razorpay is configured to automatically capture successful payments. Authorized-but-not-captured payments remain pending and do not confirm a booking.
4. Restart the backend after changing environment variables.

Checkout orders are created by the backend in INR paise from the stored reservation price; the browser cannot set the amount. The checkout callback is verified using the server secret and the Razorpay API, and a booking changes to `confirmed` only after a captured payment matches its order, amount, and currency. Webhook raw-body signatures are checked and event IDs are stored for idempotent processing. Failed or explicitly abandoned checkouts release the hold. A pending/authorized payment holds its seat only until `PAYMENT_HOLD_MINUTES` (default 20, configurable from 10–60); a captured payment arriving after expiry is not confirmed and is marked `refund_required` for operator follow-up—no automatic refund is attempted. Unpaid expired holds release seats logically by their expiry time. A valid ticket is created only after this verified captured-payment flow succeeds.

To test a **successful** checkout, use the test key and a successful test payment method from Razorpay's official test credentials, finish Checkout, and verify that the UI reports a confirmed booking. To test a **failed** checkout, use Razorpay's documented failure test method; confirm that the booking is not confirmed and its reservation is released. Test dismissal/abandonment and an authorized-but-pending test flow as well. Use Razorpay Dashboard test mode to inspect orders and webhook deliveries; confirm duplicate webhook deliveries do not create duplicate confirmations.

After a successful captured payment, sign in with the purchasing Google account and visit `/my-tickets`. The ticket should show the participant, workshop, schedule, venue, validity, and QR code. Use **Download ticket PDF** to save the branded ticket. Refresh or deliver the same captured webhook again and confirm that the booking still has exactly one ticket. Failed, pending, expired, or unverified payments must not create one. Try opening `/my-tickets` with a different customer account to confirm Firestore only returns that account's tickets.

Run the backend's focused signature verification tests with `cd backend` then `npm test`.

## Admin dashboard (Phase 7)
1. Sign in once through the website with the Google account that should administer the project. Find that account's Firebase Auth UID in Firebase Console under **Authentication → Users**.
2. On a trusted administrator machine, configure `backend/.env` with the correct `FIREBASE_PROJECT_ID` and use Google Application Default Credentials for a principal authorized to manage Firebase Authentication custom claims. Do not copy Admin credentials into the browser or commit them.
3. From `backend`, run `npm run admin:grant -- <firebase-auth-uid>`. This server-side Admin SDK script preserves other custom claims and sets `admin: true` for that UID. Grant this role only to trusted staff; there is deliberately no in-app role-granting page.
4. The user should sign out and back in (or refresh the ID token), then open `/admin/login` and continue with Google. The backend verifies the Firebase ID token and custom claim on every admin API request. Normal customers cannot use these routes by changing frontend state.

### Admin roles and dashboard events
- Administrator roles are Firebase Auth custom claims managed only by the backend. `super_admin` can manage admins; `event_admin` can manage events, registrations and ticket validation but cannot call admin-management APIs. Existing `admin: true` claims without an `adminRole` are treated as Super Admin for compatibility; the existing trusted administrators should be reviewed and explicitly assigned the intended role.
- Add an administrator from **Manage admins** by entering an email for an account that has already signed into the site with Google. New administrators default to Event Admin. Role/status changes and removal require confirmation, revoke refresh tokens, and cannot remove/deactivate the current account or the last active Super Admin.
- Create events from **Manage events**. New records use the existing `workshops` collection and the same event IDs referenced by booking/payment flows. Draft, published, unpublished, archived, and legacy completed records are supported; only published non-archived events are returned publicly. Registration opening/closing times are stored separately from event date/time in India Standard Time. The backend enforces publication, registration windows, manual close/pause controls, capacity, and deadlines for reservations and payment-order creation; seats continue to be allocated in the existing Firestore transaction.
- Poster upload is not configured because the project has no Firebase Storage integration. The dashboard accepts an optional public HTTPS poster URL instead.
- No new Firestore collection or security-rule change is needed. The existing bookings composite indexes remain required. After reviewing the intended Firebase project, deploy index configuration with `firebase deploy --only firestore:indexes --project <approved-project-id>`; wait until Firestore reports the index ready. No code change automatically deploys the indexes.

The `/admin` dashboard shows confirmed registrations, captured payments/revenue, and booked/available seats (confirmed seats plus unexpired holds). It includes dynamic event management, registration search and CSV export, and a camera/manual ticket scanner. Admin APIs do not expose a way to mark payments successful. Existing event documents are not reseeded, overwritten, or deleted by application startup.

Scanning redeems a ticket transactionally only when its opaque QR token resolves to a valid ticket linked to a confirmed booking and captured payment. A redeemed ticket cannot be redeemed again; the dashboard distinguishes invalid, already-used, and newly redeemed tickets. Camera access requires a secure browser context (localhost is allowed) and permission. The existing Firestore rules continue to deny client writes to ticket, payment, booking, and role data.

To test, grant the claim to a trusted test account, sign in at `/admin/login`, create a draft event, edit and publish it, and verify it appears publicly only after publishing and only while its registration window and capacity permit registration. Search registrations and export the CSV. Use a paid ticket QR from Phase 6: the first scan should say valid/redeemed and a second should say already used. An invalid token must be rejected. Confirm a regular Google account cannot load `/admin` or call admin endpoints.

## Final verification and deployment preparation (Phase 8)

No hosting or production service is deployed or changed by this project setup. Review estimated plans and any Firebase billing/plan prompts yourself; do not approve an upgrade or paid service without client approval. Razorpay live credentials are rejected by the backend: only `rzp_test_` key IDs are accepted.

### Local verification
```bash
cd backend
npm ci
npm test
cd ../frontend
npm ci
npm run build
```

These checks do not replace end-to-end testing against configured Firebase and Razorpay test services. Google sign-in, profile synchronization, Firestore transactions/rules, webhook delivery, and test payment capture still require valid project credentials and authorized test-mode configuration. Do not copy production secrets into local files that could be committed.

### Vercel frontend
1. Put the project in a Git repository and confirm `frontend/.env` and all credential files are ignored before pushing. This workspace currently has no Git repository initialized, so its remote/commit history and GitHub secret exposure have not been audited.
2. Import the repository in Vercel and set **Root Directory** to `frontend`. Select Vite (or use build command `npm run build`, output directory `dist`, and install command `npm ci`). The included `frontend/vercel.json` sends app routes such as `/my-tickets` and `/admin` back to the SPA entry point.
3. Configure these Vercel environment variables for Preview and Production as appropriate:
   - `VITE_API_URL`: the Render backend origin, with no trailing slash (for example `https://<your-render-service>.onrender.com`).
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID`: the Firebase **Web app** config. These are client-visible values; never put Firebase Admin or Razorpay secrets in `VITE_` variables.
4. The current local Firebase Web API key was previously rejected by Firebase Identity Toolkit. Before deploying, obtain/verify a valid Web app key in the correct Firebase/Google Cloud project, ensure the Identity Toolkit API and key restrictions allow the app, and test sign-in. Do not guess or reuse an invalid key.

### Firebase production project
1. Use the existing Firebase project and plan unless the client explicitly approves a change. Do not enable billing, upgrade a plan, or activate additional paid services without approval.
2. Enable Google under **Authentication → Sign-in method**, choose a support email, and add the Vercel production domain (and any deliberately used preview/custom domains) under **Authentication → Settings → Authorized domains**.
3. Create/confirm the Firestore database in the approved region. From the project root, select the intended Firebase project explicitly, inspect it, and deploy rules/indexes:
   ```bash
   firebase projects:list
   firebase use <approved-project-id>
   firebase deploy --only firestore:rules,firestore:indexes
   ```
   Confirm the active project and review the plan/pricing prompts before any console action. The rules keep bookings, payments, tickets, admin roles, and booking limits server-write-only.
4. Never download an Admin service-account key into the frontend or commit it. The backend needs a least-privilege service identity for Firebase Auth custom claims and Firestore access.

### Render backend
1. Review the included root `render.yaml` before creating a service. Connect the approved repository and create the web service from the blueprint only after the client approves the selected Render plan.
2. Set `FIREBASE_PROJECT_ID` to the approved project. Add the Firebase Admin service-account JSON in Render’s **Secret Files** (not in Git or a normal source file), then set `GOOGLE_APPLICATION_CREDENTIALS` to its mounted file path. Limit the service identity and rotate/revoke credentials if exposed.
3. Set `FRONTEND_URL` to the exact Vercel origin. Comma-separated exact origins are supported for intentionally approved custom/preview domains; do not use `*`.
4. Review `BOOKING_TICKET_LIMIT_POLICY` and the hold settings. Render supplies `PORT`; `/api/health` is configured as the health check.
5. Add only Razorpay **Test Mode** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` as private Render environment variables. Configure a test webhook to `https://<render-service>/api/payments/webhook`. The backend rejects live key IDs. Do not add live keys or change the safeguard until the client explicitly approves a separate production launch.
6. Confirm Vercel `VITE_API_URL` matches the Render service and that the Render CORS allowlist includes the Vercel origin.

### First administrator and launch checks
After Render credentials are configured, grant the first admin only from a trusted operator environment using the server-side Firebase Admin script documented in Phase 7. Check the project ID before running it. Sign in, verify every admin API returns 403 to a normal customer, and test a test-mode payment from order creation through webhook and payment verification. Confirm one ticket is created, the correct customer can read it, another customer cannot, and a valid scan redeems it only once. Test failed/pending/expired payments and reject unpublished session reservations before inviting customers.

### Actions requiring client/operator approval
- Provide/verify the valid Firebase Web app configuration and authorized domains.
- Approve the Firebase/Render/Vercel project, regions, plans, and any billing/paid-service prompts; this setup does not make those choices or deploy services.
- Provision Firebase Admin credentials securely and Razorpay Test Mode credentials/webhook; keep all Razorpay keys in test mode.
- Approve the repository/remote and verify GitHub history and secret scanning before pushing. The current workspace is not a Git repository, so GitHub could not be inspected.
- Perform real Google/Firestore/Razorpay test transactions and confirm venue, dates, support contacts, ticket redemption process, data retention, and launch readiness.
- Give explicit client approval before requesting live Razorpay keys, removing the test-only guard, or changing any production setting.

## Security
Never commit `.env` files or Firebase/Razorpay secrets.
