# Cộng đồng Tình nguyện Xã hội Việt Nam — Website

Official production website: https://congdongtinhnguyenvietnam.pages.dev

Static website hosted on Cloudflare Pages. The root `index.html` is the Pages entry point.

## Cloudflare Pages

- Project: `congdongtinhnguyenvietnam`
- GitHub repository: `congdongtinhnguyenvietnam-prog/Website`
- Production branch: `main`
- Framework preset: **None**
- Build command: empty (no build step)
- Build output directory: `.`
- Root directory: `/`
- Preview deployments are enabled for non-production branches.

## Firebase services

The site uses Firebase project `vsvc-vietnam`. Firestore `onSnapshot()` listeners provide real-time updates for `articles`, `documents`, `settings/brand`, and `settings/deleted_items`.

### Current production configuration

- Firebase project restored and active.
- Authentication providers enabled: **Anonymous** and **Email/Password**.
- Firestore default database: Native mode, Standard edition, region `asia-southeast1` (Singapore).
- Firestore Security Rules published from `firestore.rules`.
- Public visitors can read articles, documents and the two public settings documents.
- Only authenticated users with an active `admins/{uid}` record (`role: admin`, `active: true`) can write protected content.
- Initial organization administrator account and authorization record have been provisioned. The mailbox owner must complete the Firebase password-reset email to set a private password.

### Administrator operations

1. Use the organization's controlled mailbox to sign in through the website's admin login.
2. Firebase Auth UID must have a matching Firestore document at `admins/{UID}`.
3. Required fields: `role` (string) = `admin`; `active` (boolean) = `true`.
4. To revoke access, set `active` to `false` or delete the user's `admins/{UID}` record.
5. Never put administrator passwords or private credentials in source code or Git.

## Real-time behavior and storage notes

Firestore `onSnapshot()` listeners keep articles, documents and brand settings synchronized across browser sessions. Cloudflare Pages serves the static frontend; Firestore remains the real-time data service.

The logo is currently stored as a data URL in Firestore. Large logos can approach Firestore's document-size limit; moving media to Firebase Storage is a recommended follow-up improvement. Existing document attachments continue to use their current file URLs; this deployment does not migrate those files.

## Security

Firebase web configuration values are client-side identifiers, not administrator credentials. Firestore Security Rules are the write-access boundary. Keep the published rules aligned with `firestore.rules`, and test public-read/admin-write permissions after any future rule changes.
