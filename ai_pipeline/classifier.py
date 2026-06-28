import os
import json
from openai import OpenAI

class DocumentClassifier:
    def __init__(self, api_key=None):
        """
        Initializes the classifier with support for OpenRouter and OpenAI.
        Priority: OPENROUTER_API_KEY > OPENAI_API_KEY > Fallback
        """
        self.provider = None
        self.api_key = api_key
        self.client = None
        self.model_name = None
        
        # 1. OpenRouter (Primary)
        openrouter_key = os.environ.get('OPENROUTER_API_KEY')
        if openrouter_key:
            self.provider = "openrouter"
            self.api_key = openrouter_key
            self.base_url = os.environ.get('OPENROUTER_BASE_URL', "https://openrouter.ai/api/v1")
            self.model_name = os.environ.get('OPENROUTER_MODEL', "openai/gpt-4o-mini")
            self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)
            return

        # 2. OpenAI (Secondary)
        openai_key = os.environ.get('OPENAI_API_KEY')
        if openai_key:
            self.provider = "openai"
            self.api_key = openai_key
            self.model_name = os.environ.get('OPENAI_MODEL', "gpt-4o-mini")
            self.client = OpenAI(api_key=self.api_key)
            return

        # 3. Gemini Fallback (if key is provided via constructor or env)
        gemini_key = self.api_key or os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
        if gemini_key:
            try:
                from google import genai
                self.provider = "gemini"
                self.api_key = gemini_key
                self.client = genai.Client(api_key=self.api_key)
            except ImportError:
                self.client = None

    def classify(self, text, kb_context=""):
        if not self.client:
            return {
                "error": "No AI API Key configured (OPENROUTER_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY).",
                "jurisdiction": {"name": "Unknown", "type": "unknown"},
                "asset_type": "Unknown",
                "is_scam": False,
                "confidence": 0.0,
                "overview": "No overview available."
            }

        prompt = f"""Analyze the following letter/text related to inheritance or unclaimed assets.
Identify the jurisdiction (state or country), the asset type, and whether it appears to be a scam or a legitimate notification.

Use the provided Knowledge Base context to help identify known jurisdictions and patterns.

Knowledge Base Context:
{kb_context}

Document Text:
{text}

Output ONLY valid JSON (no markdown, no code fences) with these fields:
- jurisdiction: {{ "name": "string", "type": "us_state|international|unknown" }}
- asset_type: string
- is_scam: boolean
- overview: string (brief summary in plain English)
- confidence: float (0.0 to 1.0)
- reasoning: string (explanation for the classification)"""

        try:
            if self.provider in ["openrouter", "openai"]:
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": "You are an international asset recovery specialist. Analyze documents and output structured JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                    response_format={ "type": "json_object" }
                )
                content = response.choices[0].message.content.strip()
            elif self.provider == "gemini":
                response = self.client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=prompt
                )
                content = response.text
            else:
                raise ValueError(f"Unsupported provider: {self.provider}")
            
            # Extract JSON if LLM wraps it in code blocks
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            return json.loads(content)
        except Exception as e:
            return {
                "error": f"Error during classification ({self.provider}): {str(e)}",
                "jurisdiction": {"name": "Unknown", "type": "unknown"},
                "asset_type": "Unknown",
                "is_scam": False,
                "confidence": 0.0,
                "overview": "No overview available."
            }

if __name__ == "__main__":
    # Test script
    classifier = DocumentClassifier()
    test_text = "State of California Unclaimed Property Division. Notice of unclaimed funds for John Doe."
    print(f"Active Provider: {classifier.provider or 'None'}")
    if classifier.client:
        result = classifier.classify(test_text)
        print(json.dumps(result, indent=2))
    else:
        print("Set OPENROUTER_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY to test.")
