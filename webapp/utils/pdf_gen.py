from weasyprint import HTML
from flask import render_template
import os

def generate_claim_kit_pdf(data, output_path):
    """
    Generates a claim kit PDF from data using an HTML template.
    """
    # This would use a specific template for the PDF content
    # For now, we'll just use a placeholder
    html_content = f"""
    <html>
        <body>
            <h1>Claim Kit for {data.get('name', 'Valued Customer')}</h1>
            <h2>Jurisdiction: {data.get('jurisdiction')}</h2>
            <p>Asset Type: {data.get('asset_type')}</p>
            <h3>Instructions</h3>
            <p>{data.get('instructions')}</p>
        </body>
    </html>
    """
    HTML(string=html_content).write_pdf(output_path)
    return output_path
