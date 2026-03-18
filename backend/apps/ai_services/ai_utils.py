import os
try:
    import cv2
    import numpy as np
except Exception:  # pragma: no cover - optional dependency
    cv2 = None
    np = None

try:
    import pytesseract
except Exception:  # pragma: no cover
    pytesseract = None  # type: ignore

try:
    import pdfplumber
except Exception:  # pragma: no cover
    pdfplumber = None  # type: ignore

try:
    from PIL import Image
except Exception:  # pragma: no cover
    Image = None  # type: ignore
import re
import json
from datetime import datetime, timedelta
from decimal import Decimal
from django.conf import settings
import logging
from .groq_client import GroqClient

logger = logging.getLogger(__name__)

class OCRProcessor:
    def __init__(self):
        self.tesseract_config = '--oem 3 --psm 6'
        # Allow overriding Tesseract binary on Windows via env
        try:
            cmd = os.environ.get('TESSERACT_CMD') or getattr(settings, 'TESSERACT_CMD', None)
            if cmd:
                pytesseract.pytesseract.tesseract_cmd = cmd
        except Exception:
            pass
    
    def preprocess_image(self, image_path):
        """Preprocess image for better OCR results"""
        try:
            if not cv2:
                return None
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError("Could not load image")
            
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply noise reduction
            denoised = cv2.medianBlur(gray, 3)
            
            # Apply thresholding
            _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Dilation and erosion to remove noise
            kernel = np.ones((1, 1), np.uint8)
            processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            return processed
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            return None
    
    def extract_text(self, file_path):
        """Extract text from image or PDF"""
        try:
            file_extension = os.path.splitext(file_path)[1].lower()
            
            if file_extension in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
                # Process image
                if pytesseract and Image:
                    processed_image = self.preprocess_image(file_path)
                    if processed_image is not None and pytesseract:
                        text = pytesseract.image_to_string(
                            processed_image, config=self.tesseract_config
                        )
                    elif Image:
                        # Fallback to original image
                        text = pytesseract.image_to_string(
                            Image.open(file_path), config=self.tesseract_config
                        )
                    else:
                        text = ""
                else:
                    text = ""
            elif file_extension == '.pdf':
                # Extract text from PDF using pdfplumber with relaxed tolerances
                text_parts = []
                if pdfplumber:
                    try:
                        with pdfplumber.open(file_path) as pdf:
                            for page in pdf.pages:
                                page_text = page.extract_text(x_tolerance=2, y_tolerance=2) or ''
                                if page_text.strip():
                                    text_parts.append(page_text)
                    except Exception:
                        text_parts = []
                text = "\n".join(text_parts).strip()
                # Fallback: first page via Tesseract if pdf text empty
                if not text and pytesseract and Image:
                    try:
                        text = pytesseract.image_to_string(
                            Image.open(file_path), config=self.tesseract_config
                        )
                    except Exception:
                        text = ''
            else:
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as handle:
                        text = handle.read()
                except Exception:
                    raise ValueError(f"Unsupported file format: {file_extension}")
            
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text: {e}")
            return ""

class NERProcessor:
    def __init__(self):
        self.model_name = "dbmdz/bert-large-cased-finetuned-conll03-english"
        self.tokenizer = None
        self.model = None
        self.pipeline = None
        self._load_model()
    
    def _load_model(self):
        """Load NER model; optional to keep install lightweight."""
        try:
            from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline  # type: ignore
        except Exception:
            logger.info("Transformers not available; falling back to regex-only extraction.")
            self.pipeline = None
            return

        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForTokenClassification.from_pretrained(self.model_name)
            self.pipeline = pipeline(
                "ner",
                model=self.model,
                tokenizer=self.tokenizer,
                aggregation_strategy="simple",
            )
        except Exception as e:
            logger.error(f"Error loading NER model: {e}")
            self.pipeline = None
    
    def extract_entities(self, text):
        """Extract named entities from text"""
        if not self.pipeline or not text:
            return []
        
        try:
            entities = self.pipeline(text)
            return [
                {
                    'text': entity['word'],
                    'label': entity['entity_group'],
                    'confidence': float(entity['score'])
                }
                for entity in entities
                if entity['score'] > 0.5  # Confidence threshold
            ]
        except Exception as e:
            logger.error(f"Error extracting entities: {e}")
            return []

class InvoiceDataExtractor:
    def __init__(self):
        self.ocr = OCRProcessor()
        self.ner = NERProcessor()
    
    def extract_invoice_data(self, file_path):
        """Extract structured data from invoice"""
        try:
            # Extract text using OCR
            text = self.ocr.extract_text(file_path)
            if not text:
                return None
            
            # Extract entities using NER
            entities = self.ner.extract_entities(text)
            
            # Extract structured data using regex patterns
            structured_data = self._extract_with_regex(text)
            
            # Combine NER entities with regex results
            structured_data['entities'] = entities
            structured_data['raw_text'] = text
            
            return structured_data
        
        except Exception as e:
            logger.error(f"Error extracting invoice data: {e}")
            return None
    
    def _extract_with_regex(self, text):
        """Extract structured data using regex patterns"""
        data = {
            'invoice_number': '',
            'date': '',
            'vendor_name': '',
            'gst_number': '',
            'amount': 0.0,
            'cgst': 0.0,
            'sgst': 0.0,
            'igst': 0.0,
            'items': []
        }
        
        try:
            # Invoice number patterns
            inv_patterns = [
                r'invoice\s*(?:no|number)?\s*:?\s*([A-Z0-9\-/]+)',
                r'bill\s*no\s*:?\s*([A-Z0-9\-/]+)',
                r'inv\s*:?\s*([A-Z0-9\-/]+)'
            ]
            
            for pattern in inv_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    data['invoice_number'] = match.group(1).strip()
                    break
            
            # Date patterns
            date_patterns = [
                r'date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
            ]
            
            for pattern in date_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    date_str = match.group(1)
                    data['date'] = self._parse_date(date_str)
                    break
            
            # GST number pattern
            gst_pattern = r'([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1})'
            gst_match = re.search(gst_pattern, text)
            if gst_match:
                data['gst_number'] = gst_match.group(1)
            
            # Amount patterns
            amount_patterns = [
                r'invoice\s*value\s*\(including\s*gst\)\s*[:#-]?\s*[₹Rs\.]?\s*([\d,]+\.?\d*)',
                r'grand\s*total\s*[:#-]?\s*[₹Rs\.]?\s*([\d,]+\.?\d*)',
                r'total\s*amount\s*[:#-]?\s*[₹Rs\.]?\s*([\d,]+\.?\d*)',
                r'net\s*amount\s*[:#-]?\s*[₹Rs\.]?\s*([\d,]+\.?\d*)',
                r'amount\s*payable\s*[:#-]?\s*[₹Rs\.]?\s*([\d,]+\.?\d*)',
                r'total\s*[:#-]?\s*[₹Rs\.]?\s*([\d,]+\.?\d*)'
            ]
            
            def safe_float(val: str) -> float:
                try:
                    return float((val or '').replace(',', '').strip()) if val else 0.0
                except Exception:
                    return 0.0

            for pattern in amount_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    data['amount'] = safe_float(match.group(1))
                    break
            
            # GST amount patterns
            # Prefer value after colon e.g. "CGST (9%) on 60,000: 5,400"
            cgst_match = re.search(r'(?:cgst|central\s*tax)[^\n]*?:\s*([\d,]+\.?\d*)', text, re.IGNORECASE)
            if cgst_match:
                data['cgst'] = safe_float(cgst_match.group(1))
            
            sgst_match = re.search(r'(?:sgst|state\s*tax)[^\n]*?:\s*([\d,]+\.?\d*)', text, re.IGNORECASE)
            if sgst_match:
                data['sgst'] = safe_float(sgst_match.group(1))
            
            igst_match = re.search(r'igst[^\n]*?:\s*([\d,]+\.?\d*)', text, re.IGNORECASE)
            if igst_match:
                data['igst'] = safe_float(igst_match.group(1))
            
            return data
        
        except Exception as e:
            logger.error(f"Error in regex extraction: {e}")
            return data
    
    def _parse_date(self, date_str):
        """Parse date string to ISO format"""
        try:
            # Try different date formats
            formats = ['%d/%m/%Y', '%d-%m-%Y', '%d/%m/%y', '%d-%m-%y']
            
            for fmt in formats:
                try:
                    parsed_date = datetime.strptime(date_str, fmt)
                    return parsed_date.strftime('%Y-%m-%d')
                except ValueError:
                    continue
            
            return date_str
        except Exception:
            return date_str

class AITaxAdvisor:
    def __init__(self):
        self.client = GroqClient()
            
    
    def get_tax_advice(self, query, context=None):
        """Get AI-powered tax advice"""
        system_prompt = """You are an expert Indian tax consultant and Chartered Accountant with deep knowledge of:
                        - Indian Income Tax laws and regulations
                        - GST (Goods and Services Tax) compliance
                        - TDS (Tax Deducted at Source) rules
                        - Business expense optimization
                        - Tax saving strategies for SMEs and individuals
                        Your task is to provide accurate, concise, and well-structured tax guidance.
                        Always respond in **JSON** with the following keys:
                        {
                        "title": "<short title for the topic>",
                        "summary": "<2–3 sentence summary>",
                        "advice": "<markdown formatted explanation with headings, bullet points, and examples>",
                        "disclaimer": "AI responses are for informational purposes only. Please consult a qualified Chartered Accountant for specific cases."
                         }
                        Provide accurate, practical advice while mentioning that users should consult with qualified professionals for specific cases."""

        prompt = self._build_prompt(query, context)
        try:
            result = self.client.ask_groq(system_prompt, prompt)
            if result.get("success") and result.get("answer"):
                return result["answer"]
        except Exception as e:  # pragma: no cover - safety net
            logger.error(f"Error getting AI advice: {e}")

        return self._get_fallback_response(query)
    
    def _build_prompt(self, query, context):
        """Build context-aware prompt"""
        prompt = f"Question: {query}\n\n"
        
        if context:
            if context.get('user_info'):
                user_info = context['user_info']
                prompt += "User Info:\n"
                prompt += f"- Business: {user_info.get('business_name', 'N/A')}\n"
                prompt += f"- Role: {user_info.get('role', 'N/A')}\n\n"

            if context.get('transactions'):
                prompt += "Recent Transactions:\n"
                for txn in context['transactions'][:5]:  # Last 5 transactions
                    prompt += f"- {txn.get('description', '')}: ₹{txn.get('amount', 0)} ({txn.get('type', '')})\n"
                prompt += "\n"
            
            if context.get('business_info'):
                business = context['business_info']
                prompt += f"Business Info:\n"
                prompt += f"- Business: {business.get('name', 'N/A')}\n"
                prompt += f"- GST Number: {business.get('gst_number', 'N/A')}\n\n"
        
        prompt += "Please provide specific, actionable advice considering Indian tax laws."
        return prompt
    
    def _get_fallback_response(self, query):
        """Provide fallback response when AI service is unavailable"""
        fallback_responses = {
            'gst': "For GST-related queries, ensure you file returns on time and maintain proper invoicing. Consider consulting a CA for complex scenarios.",
            'tax saving': "Common tax-saving options include Section 80C investments (₹1.5L), health insurance premiums (80D), and home loan interest deductions.",
            'tds': "TDS rates vary by payment type. Ensure proper TDS certificates and reconcile with Form 26AS regularly.",
            'deduction': "Business expenses like office rent, utilities, travel, and professional fees are generally deductible if they're for business purposes.",
        }
        
        query_lower = query.lower()
        for key, response in fallback_responses.items():
            if key in query_lower:
                return response
        
        return "I'd be happy to help with your tax query. For specific advice, please consult with a qualified Chartered Accountant who can review your particular situation."

class ComplianceAnalyzer:
    def __init__(self):
        self.gst_rules = self._load_gst_rules()
    
    def analyze_transaction(self, transaction_data):
        """Analyze transaction for compliance issues"""
        insights = []
        
        try:
            # Check GST compliance
            gst_insights = self._check_gst_compliance(transaction_data)
            insights.extend(gst_insights)
            
            # Check amount thresholds
            threshold_insights = self._check_amount_thresholds(transaction_data)
            insights.extend(threshold_insights)
            
            # Check document requirements
            doc_insights = self._check_document_requirements(transaction_data)
            insights.extend(doc_insights)
            
            return insights
        
        except Exception as e:
            logger.error(f"Error analyzing transaction: {e}")
            return []
    
    def _check_gst_compliance(self, transaction_data):
        """Check GST compliance issues"""
        insights = []
        amount = float(transaction_data.get('amount', 0))
        gst_number = transaction_data.get('gst_number', '')
        
        # Check if GST number is required but missing
        if amount > 200 and transaction_data.get('type') == 'expense' and not gst_number:
            insights.append({
                'type': 'compliance_reminder',
                'title': 'GST Number Required',
                'description': f'Expenses above ₹200 require valid GST number from vendor for input credit.',
                'priority': 'medium',
                'action_required': True
            })
        
        # Check GST rate reasonableness
        total_gst = (
            float(transaction_data.get('cgst_amount', 0)) + 
            float(transaction_data.get('sgst_amount', 0)) + 
            float(transaction_data.get('igst_amount', 0))
        )
        
        if total_gst > 0:
            gst_rate = (total_gst / amount) * 100
            if gst_rate > 30:  # Unusually high GST rate
                insights.append({
                    'type': 'anomaly',
                    'title': 'High GST Rate Detected',
                    'description': f'GST rate of {gst_rate:.1f}% seems unusually high. Please verify.',
                    'priority': 'high',
                    'action_required': True
                })
        
        return insights
    
    def _check_amount_thresholds(self, transaction_data):
        """Check amount-based compliance thresholds"""
        insights = []
        amount = float(transaction_data.get('amount', 0))
        
        # TDS thresholds
        if transaction_data.get('type') == 'expense':
            category = transaction_data.get('category', '').lower()
            
            # Professional services TDS threshold
            if 'professional' in category and amount > 30000:
                tds_amount = float(transaction_data.get('tds_amount', 0))
                expected_tds = amount * 0.1  # 10% TDS rate
                
                if tds_amount < expected_tds * 0.9:  # Allow 10% tolerance
                    insights.append({
                        'type': 'compliance_reminder',
                        'title': 'TDS Deduction Required',
                        'description': f'Professional payments above ₹30,000 require 10% TDS deduction.',
                        'priority': 'high',
                        'action_required': True
                    })
        
        return insights
    
    def _check_document_requirements(self, transaction_data):
        """Check document requirements"""
        insights = []
        amount = float(transaction_data.get('amount', 0))
        
        # High-value transactions need proper documentation
        if amount > 50000:
            insights.append({
                'type': 'compliance_reminder',
                'title': 'Documentation Required',
                'description': f'High-value transactions (₹{amount:,.0f}) require proper invoices and supporting documents.',
                'priority': 'medium',
                'action_required': True
            })
        
        return insights
    
    def _load_gst_rules(self):
        """Load GST rules and rates"""
        return {
            'standard_rate': 18,
            'reduced_rates': [5, 12, 28],
            'exempt_categories': ['healthcare', 'education'],
            'input_credit_threshold': 200
        }

# Initialize global instances
ocr_processor = OCRProcessor()
ner_processor = NERProcessor()
invoice_extractor = InvoiceDataExtractor()
ai_advisor = AITaxAdvisor()
compliance_analyzer = ComplianceAnalyzer()