import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export const ROOT_DIR = process.cwd();
export const BACKEND_PORT = process.env.BACKEND_PORT
  ? parseInt(process.env.BACKEND_PORT, 10)
  : process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : 8000;

// Load Firebase applet configuration
export interface FirebaseConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

let firebaseConfig: FirebaseConfig = {
  projectId: 'gen-lang-client-0656692186',
  appId: '1:952330825562:web:80ad0c8eb0d63493110d63',
  apiKey: 'AIzaSyBYxuLewjhOrFBapXHgyhLUtQ8GsLcYLVI',
  authDomain: 'gen-lang-client-0656692186.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-remixvitalplatec-beb36462-0cd2-4b7f-8b1f-84d8d822b318',
};

const configPath = path.resolve(ROOT_DIR, 'firebase-applet-config.json');
if (fs.existsSync(configPath)) {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    firebaseConfig = { ...firebaseConfig, ...parsed };
  } catch (e) {
    console.warn('[Backend Config] Error loading firebase-applet-config.json, using defaults:', e);
  }
}

export { firebaseConfig };
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
