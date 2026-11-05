# Blossom Vale Firebase setup

The home page reads one live document from Cloud Firestore:

- Collection: `siteConfig`
- Document: `serverStats`
- `status` — string: `online`, `offline`, or `maintenance`
- `restartedAt` — timestamp

Edit those values in Firebase Console under **Firestore Database → Data**. The page listens for changes to this document. Firestore rules allow public reads of this one document and deny client writes. The player count is queried from MCStatus using the Java server address in `mcstatus-config.js`.

## Local preview

Run `npm start` in this folder and open `http://localhost:3000`. Firebase web app settings are in `firebase-config.js`.

## Deploy to Firebase Hosting

The Firebase project alias is set to `blossomvale-9721c`. From this folder, deploy the site and Firestore rules with:

```powershell
firebase deploy --only hosting,firestore:rules
```

The Firebase web app config in `firebase-config.js` is public client configuration. Do not put service account keys in the website.
