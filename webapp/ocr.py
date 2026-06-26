import os
import pytesseract
from PIL import Image
import fitz  # PyMuPDF

def extract_text_from_image(image_path):
    try:
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img)
        return text
    except Exception as e:
        return f"Error extracting text from image: {str(e)}"

def extract_text_from_pdf(pdf_path):
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            
            # Try to extract text directly first
            page_text = page.get_text()
            if page_text.strip():
                text += f"--- Page {page_num + 1} ---\n{page_text}\n"
            else:
                # If no text, perform OCR on the page image
                pix = page.get_pixmap()
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                page_text = pytesseract.image_to_string(img)
                text += f"--- Page {page_num + 1} (OCR) ---\n{page_text}\n"
        return text
    except Exception as e:
        return f"Error extracting text from PDF: {str(e)}"

def extract_text(file_path):
    if not file_path or not os.path.exists(file_path):
        return "File not found."
    
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        return extract_text_from_pdf(file_path)
    elif ext in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp']:
        return extract_text_from_image(file_path)
    else:
        return f"Unsupported file type: {ext}"

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        print(extract_text(sys.argv[1]))
    else:
        print("Usage: python ocr.py <file_path>")
