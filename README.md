# NutriOne: Clinic-to-Kitchen AI 🥗🔬

NutriOne is an advanced family-level nutrition platform that orchestrates clinical lab targets into everyday domestic kitchen execution. It leverages **Gemini 3.8 Flash** and **Vertex AI** to analyze medical laboratory reports for every household member and synthesize a unified, culturally authentic meal plan that respects diverse medical guardrails (e.g., PCOS, Hypertension, CKD).

## 🚀 Key Project Features

### 1. Multimodal Lab Ingestion
Family members or administrators can upload laboratory scans (PDFs or Photos). The AI extracts quantitative biomarkers (e.g., Fasting Insulin, HOMA-IR, Sodium levels, eGFR) to build a longitudinal clinical profile.

### 2. 70% Family Clinical Overlap Synthesis
The core engine analyzes all household profiles simultaneously to find a "Family Base Plan." It identifies a 70% common baseline for recipes, ensuring the family eats together while maintaining clinical safety.

### 3. "Fork-in-the-Road" Kitchen Instructions
For the remaining 30% of medical differences, the AI generates specific "separation instructions" for the domestic cook (e.g., *"Remove grandfather's portion before adding salt or soy sauce"*).

### 4. Spoken Dialect Briefings
Domestic helpers and caregivers can hear natural-language audio briefings in their native dialect (Hindi, Tamil, Kannada, Japanese, Singapore English) using high-quality **Google Cloud Text-to-Speech**.

### 5. Multi-Role Dashboard
- **Household Admin**: Manages member authorizations (max 5) and triggers full-family lab analysis sync.
- **Clinical Dietitian**: Reviews clinical trends, sets medical thresholds, and signs off on weekly meal plans.
- **Member Care Companion**: Individual members view their personalized daily menu, hydration trackers, and clinical history.
- **Cook Station**: A dedicated kitchen view for meal execution, clinical deltas, and spoken instructions.

## 🛠 Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons.
- **Backend**: Python 3.10 (Native HTTP Gateway), Vertex AI SDK.
- **AI**: Gemini 1.5 Flash (Multimodal), Google Cloud Text-to-Speech (Wavenet).
- **Database**: Cloud Firestore (Real-time sync) + Local Persistence Layer.

## 🏃 Run Locally

**Prerequisites:** Node.js, Python 3.10+

1. **Install Dependencies**:
   ```bash
   npm install
   python3 -m pip install -r backend/requirements.txt
   ```

2. **Environment Setup**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   GCP_PROJECT_ID=crjrproductions
   ```

3. **Run the Full-Stack**:
   ```bash
   npm run dev
   ```
   - UI Server: [http://localhost:3003](http://localhost:3003)
   - AI Backend: Port 5000

## 📦 Deployment
The project includes a **Dockerfile** for containerized deployment to Google Cloud Run, seamlessly integrating with Firebase and Vertex AI services.
