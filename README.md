# Cộng đồng Tình nguyện Xã hội Việt Nam — Website

Static website for Cloudflare Pages. The root `index.html` is the Pages entry point.

## Cloudflare Pages build settings

- Framework preset: **None**
- Production branch: `main` (after the deployment PR is reviewed and merged)
- Build command: leave empty (no build step)
- Build output directory: `.`
- Root directory: `/`

Do not configure a production custom domain until the organization confirms the exact domain for this website. The previously discussed QR attendance domain may belong to a separate project.

## Firebase services used

The site uses Firebase project `vsvc-vietnam` and Firestore real-time listeners for `articles`, `documents`, and two public settings documents. Firebase's web API key is a client identifier, not an administrator credential. Firestore Security Rules are the actual write-access boundary.

### Required Firebase Console setup

1. In **Authentication → Sign-in method**, enable **Anonymous** and **Email/Password** providers.
2. Create the organization's administrator account in **Authentication → Users** using an organization-controlled mailbox. Do not put the account password in source code or Git.
3. Copy that user's Firebase Auth UID.
4. In **Firestore Database → Data**, create a document at `admins/{UID}` with fields:
   - `role` (string): `admin`
   - `active` (boolean): `true`
   - `email` (string): the administrator mailbox (optional metadata)
5. Publish the rules in `firestore.rules` through **Firestore Database → Rules**.
6. Test that a signed-out visitor can read public content but cannot create, update, or delete articles/documents/settings. Test that the designated admin can perform those writes.

To revoke an administrator, set `active` to `false` or delete that user's `admins/{UID}` document. Never grant admin by changing a browser-side flag.

## Real-time behavior

Firestore `onSnapshot()` listeners keep articles, documents, and brand settings updated across browser sessions. Cloudflare Pages serves the static site; Firestore remains the real-time data service.

## Important operational notes

- Do not deploy the old single-file HTML from the repository's previous filename as the Pages root. Use the updated root `index.html` in this branch.
- Do not make the deployment public until the Firebase providers and Firestore rules above have been configured and verified.
- The logo is currently stored as a data URL in Firestore. Large logos can approach Firestore's document-size limit; moving media to Firebase Storage is a follow-up improvement.
- Uploaded organization documents are currently represented by their existing file URLs; this change does not migrate those files.