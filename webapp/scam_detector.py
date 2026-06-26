import json
import os
import re

class ScamDetector:
    def __init__(self, database_path):
        self.database_path = database_path
        self.scam_patterns = []
        self.load_database()

    def load_database(self):
        if os.path.exists(self.database_path):
            try:
                with open(self.database_path, 'r') as f:
                    data = json.load(f)
                    self.scam_patterns = data.get('scam_patterns', [])
            except Exception as e:
                print(f"Error loading scam database: {e}")

    def detect(self, text):
        if not text:
            return 0.0, []

        text_lower = text.lower()
        findings = []
        score = 0.0

        for pattern in self.scam_patterns:
            pattern_score = 0.0
            type_findings = []
            
            # Check red flags
            for flag in pattern.get('red_flags', []):
                if flag.lower() in text_lower:
                    pattern_score += 0.2
                    type_findings.append(f"Red Flag: {flag}")
            
            # Check common phrases
            for phrase in pattern.get('common_phrases', []):
                if phrase.lower() in text_lower:
                    pattern_score += 0.3
                    type_findings.append(f"Scam Phrase: {phrase}")
            
            # Check firm names
            for name in pattern.get('known_firm_names', []):
                if name.lower() in text_lower:
                    pattern_score += 0.5
                    type_findings.append(f"Known Scam Firm: {name}")

            if pattern_score > 0:
                findings.extend(type_findings)
                score = max(score, min(pattern_score, 1.0))

        return score, list(set(findings))

if __name__ == "__main__":
    detector = ScamDetector('/home/team/shared/knowledge_base/scam_database.json')
    test_text = "We have located unclaimed assets in your name. Our fee is a percentage of the recovered amount. Time-sensitive!"
    score, findings = detector.detect(test_text)
    print(f"Scam Score: {score}")
    print(f"Findings: {findings}")
