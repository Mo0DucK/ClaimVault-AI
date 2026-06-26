import os
import json
from google import genai

class DocumentClassifier:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    def classify(self, text, kb_context=""):
        if not self.client:
            return {
                "error": "Gemini API Key not configured.",
                "jurisdiction": {"name": "Unknown", "type": "unknown"},
                "asset_type": "Unknown",
                "is_scam": False,
                "confidence": 0.0,
                "overview": "No overview available."
            }

        prompt = f"""
Analyze the following letter/text related to inheritance or unclaimed assets.
Identify the jurisdiction (state or country), the asset type, and whether it appears to be a scam or a legitimate notification.

Use the provided Knowledge Base context to help identify known jurisdictions and patterns.

Knowledge Base Context:
{kb_context}

Document Text:
{text}

Output the result in structured JSON format with the following fields:
- jurisdiction: {{ "name": "string", "type": "us_state|international|unknown" }}
- asset_type: string
- is_scam: boolean
- overview: string (a brief summary in plain English)
- confidence: float (0.0 to 1.0)
- reasoning: string (explanation for the classification)
"""

        try:
            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt
            )
            content = response.text
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            return json.loads(content)
        except Exception as e:
            return {
                "error": f"Error during classification: {str(e)}",
                "jurisdiction": {"name": "Unknown", "type": "unknown"},
                "asset_type": "Unknown",
                "is_scam": False,
                "confidence": 0.0,
                "overview": "No overview available."
            }

if __name__ == "__main__":
    classifier = DocumentClassifier()
    test_text = "State of California Unclaimed Property Division. Notice of unclaimed funds for John Doe."
    result = classifier.classify(test_text)
    print(json.dumps(result, indent=2))
