# Blossom Vale Firebase setup

The home page reads one live document from Cloud Firestore:

- Collection: `siteConfig`
- Document: `serverStats`
- `status` — string: `online`, `offline`, or `maintenance`
- `restartedAt` — timestamp

Edit those values in Firebase Console under **Firestore Database → Data**. The page listens for changes to this document. Firestore rules allow public reads of this one document and deny client writes. The player count is queried from MCStatus using the Java server address in `mcstatus-config.js`.

## Staff applications and reviewer access

The Apps page links to the role-specific Helper and Content Creator application form. Submissions are stored in the `staffApplications` Firestore collection. Creator proof screenshots are resized and compressed into the application record; the screenshot and answers are visible only to the authorized reviewer. The form asks applicants for consent before submitting.

Before enabling the panel:

1. In Firebase Console, open **Authentication → Sign-in method** and enable **Email/Password**. Google sign-in is not used.
2. Create an email/password user for `blossomvale0@gmail.com` in **Authentication → Users** and set its password there. Send/complete email verification; the panel only grants access to this verified account.
3. Under **Authentication → Settings → Authorized domains**, add `blossomvale.world` and any preview domain you will use. For local preview, add `localhost` if it is not already listed.
4. Make sure Cloud Firestore is enabled. Public form submissions now go through the `submitStaffApplication` Cloud Function; Firestore rules deny direct public creates. The function validates all fields, limits each IP address to five submissions per hour, blocks a second pending application for the same Discord ID and role, and applies a seven-day reapplication cooldown. Only the verified `blossomvale0@gmail.com` account can read, review, update or delete application records.
5. Cloud Functions require the Firebase project to use the Blaze plan and have a linked billing account. Review Firebase's [Cloud Functions billing requirements](https://firebase.google.com/docs/functions) and set budget alerts before deploying.
6. From this folder, install the Firebase CLI if needed (`npm install -g firebase-tools`), sign in (`firebase login`), then deploy the function first:

   ```powershell
   firebase deploy --only functions:submitStaffApplication
   ```

   Then publish the rules, indexes (including rate-limit-record cleanup), and updated form:

   ```powershell
   firebase deploy --only firestore:rules,firestore:indexes,hosting
   ```

   Open `https://blossomvale.world/apps` for the public role page and `https://blossomvale.world/apps-admin` to review applications. The function and form must both be deployed before the new form can submit.

The admin form accepts username `Blossomvale` and the password for the Firebase Auth user above. The username maps to the allowlisted email; Firebase Authentication checks the password. Do not put the password in website code, a client-side environment variable, a URL, or source control. Variables embedded in a browser app are delivered to visitors and are not secrets. If the password was placed in a URL, change it in Firebase Console before using the panel.

Application status and private reviewer notes are stored on each document. Delete applications after they are no longer needed; deletion is available on the review panel.

## Local preview

Run `npm start` in this folder and open `http://localhost:3000`. Then visit `http://localhost:3000/apps-admin`. Do not open the HTML file directly with `file://`; browser module scripts and Firebase authentication will not work correctly from a file URL. Firebase web app settings are in `firebase-config.js` and are public client configuration, not credentials.

## Deploy to Firebase Hosting

The Firebase project alias is set to `blossomvale-9721c`. From this folder, deploy the site and Firestore rules with:

```powershell
firebase deploy --only functions:submitStaffApplication
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

The Firebase web app config in `firebase-config.js` is public client configuration. Do not put service account keys in the website.
