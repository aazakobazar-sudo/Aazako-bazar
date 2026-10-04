# आजको बजार · Aajako Bazar

Online marketplace PWA (HTML/JS) with Firebase (Auth + Firestore).

## Deploy (GitHub -> Netlify)
1. Push this repo to GitHub (files at repo root).
2. Netlify -> Add new site -> Import from GitHub -> pick this repo. No build command; publish directory `.`.
3. Firebase Console -> Authentication -> Settings -> Authorized domains: add your Netlify domain.
4. Firebase Console -> Firestore -> Rules: paste `firestore.rules`, Publish.
5. Log in once with the admin Gmail first (claims the admin role in the cloud).

## Android APK
Use PWABuilder.com with the deployed HTTPS URL (or Bubblewrap/Capacitor).

## Security notes
- The Firebase web config in `js/fb.js` is public by design; access is controlled by `firestore.rules`.
- Never commit service-account JSON, private keys or keystores (see `.gitignore`).
