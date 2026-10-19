# NutriOne Deployment Guide (GCP & Firebase)

Follow these steps to deploy your full-stack AI application professionally.

## 1. Prerequisites
- Google Cloud CLI installed: `gcloud --version`
- Firebase CLI installed: `firebase --version`
- Docker installed (optional, Cloud Build can handle it)

## 2. Prepare the Python AI Backend (Cloud Run)
Run these commands in your Mac terminal:

```bash
# 1. Set your project
gcloud config set project crjrproductions

# 2. Build and Deploy to Cloud Run
# This uses your Dockerfile to create a secure, auto-scaling backend.
gcloud builds submit --tag gcr.io/crjrproductions/nutrione
gcloud run deploy nutrione --image gcr.io/crjrproductions/nutrione --platform managed --region us-central1 --allow-unauthenticated
```

**After deployment, copy the Service URL (e.g., https://nutrione-xyz.a.run.app).**

## 3. Update Frontend Proxy
1. Open `firebase.json` in your project.
2. Replace `https://nutrione-backend-placeholder.a.run.app` with your real Cloud Run URL.

## 4. Deploy the Frontend (Firebase Hosting)
```bash
# 1. Build the production UI
npm run build

# 2. Deploy to Firebase
firebase deploy --only hosting,firestore
```

## 5. Post-Deployment Security
Go to the **Google Cloud Console** > **Cloud Run** > **nutrione**:
1. Select **Variables**.
2. Add your `GEMINI_API_KEY` (if not using Vertex AI directly).
3. Ensure the Service Account has **Vertex AI User** and **Cloud TTS User** permissions.

---
**Your app will be live at: https://crjrproductions.web.app**
