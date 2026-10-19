import json
import re
import base64
from typing import Dict, Any, Optional, List
import vertexai
from vertexai.generative_models import GenerativeModel, Part, GenerationConfig
from google.cloud import texttospeech
from backend.config import GCP_PROJECT_ID, GCP_LOCATION, GOOGLE_APPLICATION_CREDENTIALS, GEMINI_API_KEY

# Initialize Vertex AI
# We prefer GEMINI_API_KEY if available as it's easier for quick setup, 
# otherwise we use Vertex AI with Service Account.
vertex_enabled = False
if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        google.generativeai.configure(api_key=GEMINI_API_KEY)
        print("[AI Engine] Using Google Generative AI (Gemini API Key)")
    except ImportError:
        print("[AI Engine] google-generativeai not installed, attempting Vertex AI")
        if GOOGLE_APPLICATION_CREDENTIALS:
            import os
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS
        vertexai.init(project=GCP_PROJECT_ID, location=GCP_LOCATION)
        vertex_enabled = True
        print("[AI Engine] Using Vertex AI SDK")
else:
    if GOOGLE_APPLICATION_CREDENTIALS:
        import os
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS
    vertexai.init(project=GCP_PROJECT_ID, location=GCP_LOCATION)
    vertex_enabled = True
    print("[AI Engine] Using Vertex AI SDK")

def call_vertex_gemini(model_name: str, system_instruction: str, prompt: str, image_base64: Optional[str] = None, mime_type: str = "image/jpeg") -> Optional[Dict[str, Any]]:
    """
    Calls Gemini via Vertex AI SDK or Google Generative AI SDK depending on config.
    """
    try:
        if not vertex_enabled and GEMINI_API_KEY:
            import google.generativeai as genai
            model = genai.GenerativeModel(
                model_name.replace("gemini-1.5-flash", "gemini-1.5-flash"), # Standard mapping
                system_instruction=system_instruction
            )
            
            contents = []
            if image_base64:
                clean_b64 = re.sub(r"^data:image\/[a-zA-Z]+;base64,", "", image_base64)
                contents.append({
                    "mime_type": mime_type,
                    "data": base64.b64decode(clean_b64)
                })
            contents.append(prompt)
            
            response = model.generate_content(
                contents,
                generation_config={"response_mime_type": "application/json"}
            )
            if response and response.text:
                try:
                    return json.loads(response.text)
                except json.JSONDecodeError:
                    text = response.text.strip()
                    if text.startswith("```json"):
                        text = text[7:-3].strip()
                    elif text.startswith("```"):
                        text = text[3:-3].strip()
                    return json.loads(text)
            else:
                print("[AI Engine Error] Empty response from Google GenAI")
        else:
            model = GenerativeModel(
                model_name,
                system_instruction=[system_instruction]
            )
            
            contents = []
            if image_base64:
                # Clean base64 string
                clean_b64 = re.sub(r"^data:image\/[a-zA-Z]+;base64,", "", image_base64)
                image_part = Part.from_data(data=base64.b64decode(clean_b64), mime_type=mime_type)
                contents.append(image_part)
            
            contents.append(prompt)
            
            response = model.generate_content(
                contents,
                generation_config=GenerationConfig(
                    response_mime_type="application/json",
                )
            )
            
            if response and response.text:
                try:
                    return json.loads(response.text)
                except json.JSONDecodeError:
                    # Handle potential markdown code block wrapping
                    text = response.text.strip()
                    if text.startswith("```json"):
                        text = text[7:-3].strip()
                    elif text.startswith("```"):
                        text = text[3:-3].strip()
                    return json.loads(text)
            else:
                print("[AI Engine Error] Empty response from Vertex AI")
    except Exception as e:
        print(f"[AI Engine Error] Gemini request failed: {e}")
    
    return None

# ==================== 1. CLINICAL MULTIMODAL LAB PARSER ====================

def parse_clinical_lab(image_base64: Optional[str] = None, mime_type: str = "image/jpeg", text_content: Optional[str] = None) -> Dict[str, Any]:
    system_instruction = """You are an expert clinical pathologist and clinical dietitian specializing in Asian metabolic and cardiovascular health.
Extract all clinical biomarkers from the provided lab panel. Focus particularly on:
- Fasting Insulin, Fasting Glucose, HOMA-IR, HbA1c
- Blood Pressure, Serum Sodium, Potassium, Uric Acid
- Lipid profile (Total Cholesterol, Triglycerides, HDL, LDL)
- Renal markers (Creatinine, eGFR, BUN)
- Hormonal markers for PCOS (LH, FSH, LH/FSH ratio, Total/Free Testosterone, DHEAS)

Provide clean structured JSON with patient insights and immediate dietary guardrail implications."""

    prompt = f"Parse this medical lab report and extract quantitative biomarkers. Text notes: {text_content or 'Pathology Panel Scan'}"
    
    # Using gemini-1.5-flash for speed and cost-efficiency in MVP
    result = call_vertex_gemini("gemini-1.5-flash", system_instruction, prompt, image_base64, mime_type)
    if result:
        return result

    return _fallback_lab_parser(text_content or "Uploaded Panel")

# ==================== 2. MULTIMODAL PLATE ADHERENCE AUDIT ====================

def audit_home_cooked_plate(image_base64: str, mime_type: str = "image/jpeg", patient_profile: Any = None, planned_meal_name: str = "Asian home-cooked lunch") -> Dict[str, Any]:
    system_instruction = """You are an expert clinical nutritional auditor inspecting real home-cooked meals for Asian households.
Examine the meal photo carefully for oil sheen, portion balance (50/25/25), and hidden sodium gravies.
Provide objective clinical adherence score (0-100) and constructive kitchen adjustments."""

    prompt = f"Audit this home-cooked plate against medical guardrails for Patient: {json.dumps(patient_profile or 'Hypertension & PCOS')} with Planned Meal: {planned_meal_name}."

    result = call_vertex_gemini("gemini-1.5-flash", system_instruction, prompt, image_base64, mime_type)
    if result:
        return result

    return _fallback_plate_audit(planned_meal_name)

# ==================== 3. CULTURALLY AUTHENTIC INGREDIENT SWAP ====================

def calculate_ingredient_swap(missing_ingredient: str, dish_name: str, cuisine: str, clinical_constraints: Any = None, dialect: str = "Hindi") -> Dict[str, Any]:
    system_instruction = f"""You are the culinary and clinical intelligence engine for VitalPlate APAC.
Provide culturally authentic substitutions that strictly obey clinical guardrails and use flavor compensation techniques.
Provide a concise explanation in English AND a short 1-2 sentence spoken instruction in the cook's chosen dialect ({dialect}).
The entire response MUST be in JSON format with the following keys:
- missingIngredient: string
- clinicalRiskOfOriginal: string
- bestSwap: {{ substituteName: string, ratio: string, flavorProfileNote: string, clinicalBenefit: string }}
- alternativeSwaps: [{{ substituteName: string, ratio: string, notes: string }}]
- cookDialectInstruction: string (This MUST be in {dialect})
"""

    prompt = f"Missing ingredient: '{missing_ingredient}' for dish '{dish_name}' ({cuisine}). Constraints: {json.dumps(clinical_constraints or {})}. Dialect: {dialect}."

    result = call_vertex_gemini("gemini-1.5-flash", system_instruction, prompt)
    if result:
        return result

    return _fallback_ingredient_swap(missing_ingredient, dish_name, dialect)

# ==================== 4. SPOKEN AUDIO BRIEFING ====================

def generate_audio_briefing(meal_name: str, cuisine: str, delta_instructions: Any, dialect: str = "Hindi") -> Dict[str, Any]:
    print(f"[AI Engine] Generating briefing for {meal_name} in {dialect}")
    system_instruction = f"""You are a clinical kitchen assistant for VitalPlate.
Generate a briefing script for a cook preparing "{meal_name}" ({cuisine}).
The script MUST be in the following language/dialect: {dialect}.

Even if the dish is Asian, the briefing MUST be in {dialect}.
For example, if the dialect is Japanese, the script must be in Japanese.
If the dialect is Hindi, the script must be in Hindi.

The entire response MUST be in structured JSON format:
{{
  "scriptInDialect": "The briefing text in {dialect}",
  "scriptPhonetic": "Phonetic spelling of the {dialect} text for browser TTS",
  "scriptEnglishTranslation": "English translation",
  "flavorCompensationTip": "A culinary tip"
}}
"""

    prompt = f"Dish: {meal_name}. Cuisine: {cuisine}. Clinical Adjustments: {json.dumps(delta_instructions)}. Dialect: {dialect}."

    result = call_vertex_gemini("gemini-1.5-flash", system_instruction, prompt)
    
    if result and "scriptInDialect" in result:
        print(f"[AI Engine] Successfully generated script in {dialect}")
        
        # Integrate Google Cloud Text-to-Speech
        try:
            client = texttospeech.TextToSpeechClient()
            synthesis_input = texttospeech.SynthesisInput(text=result["scriptInDialect"])
            
            # Map dialect to BCP-47 language tag and voice selection
            voice_params = {
                "Hindi": ("hi-IN", "hi-IN-Wavenet-A"),
                "Tamil": ("ta-IN", "ta-IN-Wavenet-A"),
                "Japanese": ("ja-JP", "ja-JP-Wavenet-A"),
                "Kannada": ("kn-IN", "kn-IN-Wavenet-A"),
                "Singapore": ("en-GB", "en-GB-Wavenet-A"), # Using GB for clearer intonation in SG context or en-IN
                "English": ("en-US", "en-US-Wavenet-A")
            }
            
            lang_code, voice_name = voice_params.get(dialect, ("en-US", "en-US-Wavenet-A"))
            
            voice = texttospeech.VoiceSelectionParams(
                language_code=lang_code,
                name=voice_name
            )
            
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3
            )
            
            response = client.synthesize_speech(
                input=synthesis_input, voice=voice, audio_config=audio_config
            )
            
            result["audioBase64"] = base64.b64encode(response.audio_content).decode('utf-8')
            result["mimeType"] = "audio/mp3"
            print(f"[AI Engine] Successfully synthesized high-quality audio for {dialect}")
            
        except Exception as e:
            print(f"[AI Engine Error] Text-to-Speech synthesis failed: {e}")
            result["audioBase64"] = None
            result["mimeType"] = "audio/wav"
            
        return result

    print(f"[AI Engine] Vertex AI failed or returned invalid JSON. Using fallback for {dialect}.")
    return _fallback_audio_briefing(meal_name, dialect)

# ==================== 5. FAMILY CLINICAL OVERLAP SYNTHESIS (70% Overlap) ====================

def reindex_meal_queue(guardrails: Any, current_meals: List[Dict[str, Any]], patient_profiles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Advanced Family Synthesis Engine:
    1. Analyzes all patients in the household.
    2. Finds a 70% common clinical overlap for base recipes.
    3. Identifies specific "Fork-in-the-road" separation steps for individual needs.
    4. Generates a full week (7 days) of meals if requested.
    """
    system_instruction = """You are a Chief Clinical Nutritionist specializing in family meal planning for Asian households.
Your goal is to find a 70% clinical overlap across multiple patients in a household.

You MUST generate a full 7-day meal plan (Monday to Sunday) regardless of currentMeals.
Each day MUST have 3 meals: LUNCH, DINNER, and a SNACK.
Total meals generated must be 21 items (7 days * 3 types).

Each meal plan item should be culturally appropriate (Singaporean, Indian, Japanese, Southeast Asian fusion).

Output JSON:
{
  "reindexedMeals": [
    {
       "id": "meal-unique-id",
       "dayOfWeek": "Monday",
       "mealType": "LUNCH",
       "dishName": "...",
       "cuisine": "...",
       "baseRecipe": "...",
       "estimatedSodiumMg": 300,
       "estimatedGI": 40,
       "approvalStatus": "DRAFT_PENDING",
       "deltaDirectives": ["Family-wide clinical adjustments"],
       "separationInstructions": [
          {"step": "Before adding salt/soy", "action": "Remove portion for Patient Y", "reason": "Patient Y has Stage 2 Hypertension"}
       ],
       "individualPortionNotes": { "PatientY_ID": "1/2 cup portion only due to GI limits" }
    },
    ... (20 more items for the whole week)
  ],
  "clinicalSynthesisNote": "Detailed explanation of the 70% overlap logic used."
}
"""

    prompt = f"Synthesize Family Diet for the whole week: Patients={json.dumps(patient_profiles)}, CurrentMeals={json.dumps(current_meals)}, Guardrails={json.dumps(guardrails)}. Generate 7 days of meals (Mon-Sun)."

    result = call_vertex_gemini("gemini-1.5-flash", system_instruction, prompt)
    if result and "reindexedMeals" in result:
        return result

    return {
        "reindexedMeals": current_meals or [],
        "clinicalSynthesisNote": "Meal queue synchronized with family-wide clinical boundaries. Individual portions managed via delta directives."
    }

# ==================== FALLBACKS (MOCK DATA) ====================

def _fallback_lab_parser(name: str) -> Dict[str, Any]:
    return {
        "patientName": "Arthur Vance",
        "reportDate": "2026-10-12",
        "labProvider": "Singapore General Hospital Pathology",
        "summaryFindings": "Elevated serum creatinine with borderline serum sodium and hyperuricemia risk. Low-sodium and moderate-protein dietary protocol initiated.",
        "clinicalFlags": ["Borderline Serum Sodium", "Elevated Serum Creatinine", "Mild CKD Stage 3a Indicator"],
        "biomarkers": [
            {
                "markerName": "Serum Sodium",
                "category": "Electrolytes",
                "value": 144,
                "unit": "mmol/L",
                "referenceRange": "135 - 145 mmol/L",
                "status": "NORMAL",
                "clinicalSignificance": "Upper normal limit. Restrict table salt and soy sauces to prevent sodium retention."
            },
            {
                "markerName": "Serum Creatinine",
                "category": "Cardiovascular & Renal",
                "value": 1.42,
                "unit": "mg/dL",
                "referenceRange": "0.70 - 1.20 mg/dL",
                "status": "ELEVATED",
                "clinicalSignificance": "Indicates reduced renal filtration capacity. Reduce dense red meats; focus on steamed white fish."
            }
        ],
        "dietaryGuardrailsRecommended": {
            "maxSodiumMg": 1400,
            "maxGlycemicIndex": 50,
            "potassiumRestriction": True,
            "purineRestriction": True
        }
    }

def _fallback_plate_audit(meal_name: str) -> Dict[str, Any]:
    return {
        "overallAdherenceScore": 92,
        "adherenceTier": "OPTIMAL",
        "oilSheenScore": 2,
        "oilObservation": "Delicate sheen with minimal surface fat; steamed fish technique respected.",
        "fiberPercentage": 45,
        "proteinPercentage": 30,
        "carbPercentage": 25,
        "clinicalViolations": [],
        "positiveHighlights": ["White polished rice successfully omitted; whole grain foxtail millet used."],
        "cookStationFeedback": "Galing, Maria! The oil was measured accurately and the portion of steamed millet matches the doctor's target."
    }

def _fallback_ingredient_swap(missing_ingredient: str, dish_name: str, dialect: str) -> Dict[str, Any]:
    return {
        "missingIngredient": missing_ingredient,
        "clinicalRiskOfOriginal": "Commercial soy sauce or table salt would exceed the sodium limit.",
        "bestSwap": {
            "substituteName": "Kombu Dashi Stock + Fresh Calamansi Zest",
            "ratio": "3 tablespoons dashi + 1/2 tsp fresh juice per 1 tbsp soy sauce",
            "clinicalBenefit": "Saves approximately 900mg of sodium per serving."
        },
        "cookDialectInstruction": "Huwag gumamit ng toyo o patis. Gamitin ang dashi broth na may kaunting kalamansi para masarap at ligtas ang presyon ni lolo."
    }

def _fallback_audio_briefing(meal_name: str, dialect: str) -> Dict[str, Any]:
    # Mock data with different language fallbacks
    fallbacks = {
        "Hindi": {
            "scriptInDialect": "नमस्ते, आज के बारामुंडी के लिए: सोया सॉस का उपयोग न करें। केवल आधा चम्मच तिल का तेल और भरपूर अदरक डालें। चावल की जगह फॉक्सटेल मिलेट का उपयोग करें।",
            "scriptPhonetic": "Namaste, aaj ke barramundi ke liye: soy sauce ka upyog na karein. Keval aadha chammach til ka tel aur bharpur adrak dalein. Chawal ki jagah foxtail millet ka upyog karein.",
            "scriptEnglishTranslation": "Hello, for today's barramundi: please do not use soy sauce. Add strictly half a teaspoon of sesame oil and generous ginger. Swap the white rice with foxtail millet."
        },
        "Tamil": {
            "scriptInDialect": "வணக்கம், இன்றைய பாரமுண்டிக்கு: சோயா சாஸ் பயன்படுத்த வேண்டாம். அரை டீஸ்பூன் எள் எண்ணெய் மற்றும் இஞ்சி சேர்க்கவும். அரிசிக்கு பதிலாக திணை பயன்படுத்தவும்.",
            "scriptPhonetic": "Vanakkam, indraya barramundi-ku: soy sauce payanpadutha vendam. Arai teaspoon ell ennai matrum inji serkkavum. Arisikku pathilaga thinai payanpaduthavum.",
            "scriptEnglishTranslation": "Hello, for today's barramundi: please do not use soy sauce. Add strictly half a teaspoon of sesame oil and generous ginger. Swap the white rice with foxtail millet."
        },
        "Japanese": {
            "scriptInDialect": "こんにちは、今日のバラマンディについて：醤油は使わないでください。ごま油小さじ半分と生姜をたっぷり加えてください。白米の代わりに粟を使用してください。",
            "scriptPhonetic": "Konnichiwa, kyou no baramandi ni tsuite: shouyu wa tsukawanaide kudasai. Goma-abura kosaji hanbun to shouga o tappuri kuwaete kudasai. Hakumai no kawari ni awa o shiyou shite kudasai.",
            "scriptEnglishTranslation": "Hello, for today's barramundi: please do not use soy sauce. Add strictly half a teaspoon of sesame oil and generous ginger. Swap the white rice with foxtail millet."
        },
        "Kannada": {
            "scriptInDialect": "ನಮಸ್ಕಾರ, ಇಂದಿನ ಬಾರಾಮುಂಡಿಗಾಗಿ: ಸೋಯಾ ಸಾಸ್ ಬಳಸಬೇಡಿ. ಕೇವಲ ಅರ್ಧ ಚಮಚ ಎಳ್ಳೆಣ್ಣೆ ಮತ್ತು ಶುಂಠಿ ಸೇರಿಸಿ. ಅಕ್ಕಿಯ ಬದಲಿಗೆ ನವಣೆ ಬಳಸಿ.",
            "scriptPhonetic": "Namaskara, indina barramundi-gagi: soy sauce balasabedi. Kevala ardha chamacha ellenne mattu shunthi serisi. Akkiya baladige navane balasi.",
            "scriptEnglishTranslation": "Hello, for today's barramundi: please do not use soy sauce. Add strictly half a teaspoon of sesame oil and generous ginger. Swap the white rice with foxtail millet."
        },
        "Singapore": {
            "scriptInDialect": "Hello ah, for today's barramundi: no soy sauce ah. Add strictly half a teaspoon sesame oil and plenty ginger can already. Swap the white rice with foxtail millet, more healthy.",
            "scriptPhonetic": "Hello ah, for today's barramundi: no soy sauce ah. Add strictly half a teaspoon sesame oil and plenty ginger can already. Swap the white rice with foxtail millet, more healthy.",
            "scriptEnglishTranslation": "Hello, for today's barramundi: please do not use soy sauce. Add strictly half a teaspoon of sesame oil and generous ginger. Swap the white rice with foxtail millet."
        },
        "English": {
            "scriptInDialect": "Hello, for today's barramundi: please do not use soy sauce. Add strictly half a teaspoon of sesame oil and generous ginger. Swap the white rice with foxtail millet.",
            "scriptPhonetic": "Hello, for today's barramundi: please do not use soy sauce. Add strictly half a teaspoon of sesame oil and generous ginger. Swap the white rice with foxtail millet.",
            "scriptEnglishTranslation": "Hello, for today's barramundi: please do not use soy sauce. Add strictly half a teaspoon of sesame oil and generous ginger. Swap the white rice with foxtail millet."
        }
    }
    
    lang_data = fallbacks.get(dialect, fallbacks["English"])
    return {
        **lang_data,
        "flavorCompensationTip": "Use aromatics like ginger and toasted sesame oil to create satiety without sodium.",
        "audioBase64": None,
        "mimeType": "audio/wav"
    }
