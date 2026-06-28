import os
import json
from ocr import extract_text
from classifier import DocumentClassifier
from scam_detector import ScamDetector
from guide_generator import GuideGenerator

# Paths to Knowledge Base
KB_DIR = '/home/team/shared/knowledge_base/'
STATE_KB = os.path.join(KB_DIR, 'state_unclaimed_property.json')
INTERNATIONAL_KB = os.path.join(KB_DIR, 'international_claims.json')
SCAM_KB = os.path.join(KB_DIR, 'scam_database.json')

class ClaimVaultAI:
    def __init__(self, api_key=None):
        """
        Initializes the AI orchestrator.
        api_key: Optional API key for the classifier (if not set in env)
        """
        self.classifier = DocumentClassifier(api_key)
        self.scam_detector = ScamDetector(SCAM_KB)
        self.guide_generator = GuideGenerator(STATE_KB, INTERNATIONAL_KB)

    def analyze_letter(self, file_path=None, text=None):
        """
        Main entry point for initial document analysis.
        Returns the 'analysis' part of the requested schema.
        """
        if file_path:
            extracted_text = extract_text(file_path)
        else:
            extracted_text = text

        if not extracted_text:
            return {"error": "No text provided or extracted."}

        # 1. Preliminary Scam Detection (Pattern Matching)
        scam_score, scam_findings = self.scam_detector.detect(extracted_text)

        # 2. Classification using AI (OpenRouter/OpenAI/Gemini)
        kb_context = self._get_kb_summary()
        classification = self.classifier.classify(extracted_text, kb_context)

        # 3. Combine and Structure Results
        # Be conservative: if scam detector finds anything or AI flags it
        is_scam = classification.get("is_scam", False) or (scam_score > 0.1)
        
        analysis = {
            "jurisdiction": classification.get("jurisdiction", {"name": "Unknown", "type": "unknown"}),
            "asset_type": classification.get("asset_type", "Unknown"),
            "is_scam": is_scam,
            "scam_warnings": list(set(scam_findings + classification.get("scam_warnings", []))),
            "confidence": classification.get("confidence", 0.0),
            "overview": classification.get("overview", "No overview available.")
        }

        return analysis

    def generate_kit(self, analysis, user_info=None):
        """
        Second entry point: Generate the full claim kit.
        Returns the 'kit' part of the requested schema.
        """
        jurisdiction_data = analysis.get('jurisdiction', {})
        jurisdiction_name = jurisdiction_data.get('name', 'Unknown')
        asset_type = analysis.get('asset_type', 'Unknown')
        
        kit = self.guide_generator.generate_guide(jurisdiction_name, asset_type)
        
        # Inject user info into the cover letter if provided
        if user_info and 'cover_letter' in kit:
            for key, value in user_info.items():
                placeholder = f"[{key.replace('_', ' ').title()}]"
                kit['cover_letter'] = kit['cover_letter'].replace(placeholder, str(value))

        return kit

    def _get_kb_summary(self):
        # Provide names of states and international jurisdictions for context
        summary = "Known US States: Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, Rhode Island, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming. "
        summary += "Known International: Swiss Bank Ombudsman, German Nachlassgericht, UK Dormant Assets, Israeli Land Registry, Italian Postal Bonds, Polish Restitution."
        return summary

# Integration Helpers for the Web App
def analyze_letter(file_path=None, text=None):
    orchestrator = ClaimVaultAI()
    return orchestrator.analyze_letter(file_path, text)

def generate_kit_data(analysis, user_info=None):
    orchestrator = ClaimVaultAI()
    return orchestrator.generate_kit(analysis, user_info)

if __name__ == "__main__":
    # Simple test
    test_text = "Notice from the State of Texas regarding unclaimed property for Jane Doe."
    analysis_result = analyze_letter(text=test_text)
    print("--- Analysis ---")
    print(json.dumps(analysis_result, indent=2))
    
    kit_result = generate_kit_data(analysis_result, {"your_name": "Jane Doe"})
    print("\n--- Kit ---")
    print(json.dumps(kit_result, indent=2))
