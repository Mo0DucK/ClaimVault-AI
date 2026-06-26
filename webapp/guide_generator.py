import json
import os

class GuideGenerator:
    def __init__(self, state_kb_path, international_kb_path):
        self.state_kb_path = state_kb_path
        self.international_kb_path = international_kb_path
        self.state_kb = []
        self.international_kb = []
        self.load_kbs()

    def load_kbs(self):
        if os.path.exists(self.state_kb_path):
            with open(self.state_kb_path, 'r') as f:
                self.state_kb = json.load(f)
        if os.path.exists(self.international_kb_path):
            with open(self.international_kb_path, 'r') as f:
                self.international_kb = json.load(f).get('jurisdictions', [])

    def find_jurisdiction(self, name):
        # Search states
        for state in self.state_kb:
            if name.lower() in state['state'].lower():
                return 'state', state
        
        # Search international
        for jur in self.international_kb:
            if name.lower() in jur['name'].lower():
                return 'international', jur
        
        return None, None

    def generate_guide(self, jurisdiction_name, asset_type):
        jur_type, data = self.find_jurisdiction(jurisdiction_name)
        
        if not data:
            return {
                "error": f"Jurisdiction '{jurisdiction_name}' not found in knowledge base.",
                "cover_letter": "",
                "steps": ["Contact the relevant authorities for more information."],
                "documents_required": [],
                "forms": [],
                "submission_info": "Unknown"
            }

        if jur_type == 'state':
            kit = {
                "cover_letter": self._generate_cover_letter(data['state'], asset_type),
                "steps": [
                    f"Visit the {data['state']} official portal: {data['portal_url']}",
                    "Search for the property using the owner's name.",
                    "Initiate the claim process online.",
                    "Upload or mail the required documentation."
                ],
                "documents_required": data.get('required_documents', []) + data.get('deceased_owner_documents', []),
                "forms": [{"name": "Official Claim Portal", "url": data['portal_url']}],
                "submission_info": f"Online via {data['portal_url']} or mail as instructed on the portal."
            }
        else:
            kit = {
                "cover_letter": self._generate_cover_letter(data['name'], asset_type),
                "steps": data.get('process_steps', []),
                "documents_required": data.get('required_documents', []),
                "forms": [{"name": "Official Website", "url": data.get('official_url', 'N/A')}],
                "submission_info": f"Refer to {data.get('official_url', 'official website')} for submission instructions."
            }
        
        return kit

    def _generate_cover_letter(self, jurisdiction, asset_type):
        return f"""
[Your Name]
[Your Address]
[Your Phone Number]
[Your Email]

[Date]

To Whom It May Concern,

I am writing to formally submit a claim for {asset_type or 'unclaimed property'} held by {jurisdiction}.

I have enclosed the required documentation as specified in your official guidelines. Please let me know if any further information is required to process this claim.

Thank you for your assistance.

Sincerely,

[Your Signature]
[Your Printed Name]
"""

if __name__ == "__main__":
    generator = GuideGenerator(
        '/home/team/shared/knowledge_base/state_unclaimed_property.json',
        '/home/team/shared/knowledge_base/international_claims.json'
    )
    guide = generator.generate_guide("California", "Dormant Bank Account")
    print(json.dumps(guide, indent=2))
