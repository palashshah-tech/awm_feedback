# Typeform-style survey — Attention & Working Memory

Simple static site that reproduces questions 4–8 in a Typeform-like UI and saves responses to Firestore.

Quick start

1. Serve locally (recommended):

```bash
# from the project folder
python3 -m http.server 8000
# then open http://localhost:8000
```

2. To push to GitHub: create a repo and push the folder contents.

3. To deploy to Vercel/Netlify/Firebase Hosting: point the hosting service to this repo and set `public` folder to the repo root (no build step required).

Notes
- Firebase config is embedded in `app.js` (the config you provided). Make sure Firestore rules allow writes from your users or configure auth as needed.
