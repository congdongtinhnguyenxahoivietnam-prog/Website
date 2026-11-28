# Cloudinary setup for article images (PR #5)

## Architecture

- Browser sends the selected image and Firebase ID token to `/api/article-images/upload`.
- Cloudflare Pages Function validates the signed-in user's active Admin record in Firestore.
- The Function validates the file type, image header and 5 MB size limit.
- The Function creates a Cloudinary signed upload using server-side credentials and sends the image to Cloudinary.
- The Function returns Cloudinary's HTTPS `secure_url`; the existing article form stores that URL in the existing Firestore `image` field.

No Cloudinary secret is sent to the browser. No Firestore schema change is required.

## Configure Preview only

1. Open Cloudflare Dashboard → Workers & Pages → Pages → `congdongtinhnguyenvietnam`.
2. Open Settings → Variables and Secrets.
3. Select the Preview environment (not Production).
4. Add:
   - `CLOUDINARY_CLOUD_NAME`: `orgsdfcu` (ordinary variable).
   - `CLOUDINARY_API_KEY`: your Cloudinary API Key (Secret).
   - `CLOUDINARY_API_SECRET`: your Cloudinary API Secret (Secret).
5. Save the settings and trigger a new Preview deployment for this branch if the deployment was already created before adding the variables.

Create or retrieve credentials from Cloudinary Console → Settings → API Keys. Do not paste the API Secret into GitHub, source files, issue/PR comments, or ChatGPT.

Cloudflare Pages variables and secrets are configured per environment and become available to Pages Functions at runtime on a subsequent deployment.

## Preview validation

- Missing Cloudinary configuration returns HTTP 503.
- Unauthenticated or non-admin users are rejected.
- Valid JPG, PNG, WEBP and GIF files up to 5 MB are accepted.
- Invalid MIME/header, empty files and files larger than 5 MB are rejected.
- Successful uploads return an HTTPS URL under `res.cloudinary.com/orgsdfcu/image/upload/`.
- The article is saved with the URL in the existing `image` field.
- Editing an article without selecting a new image preserves its current image URL.
- Existing article records and existing non-Cloudinary image URLs remain unchanged.
- Do not configure Production variables or change Production deployment settings as part of PR #5.

## Notes about older R2 images

The former R2 upload operation is removed. The legacy GET route remains read-only for old Firestore URLs that point to `/api/article-images/:key`. Keep the old R2 bucket binding only if existing articles still depend on those URLs. Do not delete old R2 objects or bindings until those references have been inventoried and a separate migration/cleanup has been approved.

## Rollback

If Preview tests fail, do not merge PR #5. Production remains on the current `main` deployment. Fix the feature branch or close the PR; do not change Production credentials or R2 bindings during Preview testing.
