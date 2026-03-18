import logging
import os
import re
from decimal import Decimal
from typing import Dict, Any, List, Optional, Union

import pdfplumber
from django.utils import timezone
from apps.ai_services.ai_utils import InvoiceDataExtractor

try:
    import pytesseract
    from PIL import Image
except Exception:  # pragma: no cover - optional at runtime
    pytesseract = None
    Image = None  # type: ignore

from .models import Document

logger = logging.getLogger(__name__)

# Lazily constructed so optional deps don't break imports
_invoice_extractor: Union[InvoiceDataExtractor, None, bool] = None


def _get_invoice_extractor() -> Optional[InvoiceDataExtractor]:
    global _invoice_extractor
    if _invoice_extractor is False:
        return None
    if _invoice_extractor is None:
        try:
            _invoice_extractor = InvoiceDataExtractor()
        except Exception:
            logger.warning("Invoice extractor unavailable; falling back to basic regex.", exc_info=True)
            _invoice_extractor = False
    return _invoice_extractor or None


def _read_text(file_path: str) -> str:
    """Read text from txt/pdf/image with resilient fallbacks."""
    ext = os.path.splitext(file_path)[1].lower()

    try:
        if ext in {".txt", ".md", ".csv"}:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as fp:
                return fp.read()

        if ext == ".pdf":
            parts: List[str] = []
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    parts.append(page.extract_text(x_tolerance=2, y_tolerance=2) or "")
            return "\n".join(parts)

        if ext in {".jpg", ".jpeg", ".png", ".bmp", ".gif"} and pytesseract and Image:
            try:
                return pytesseract.image_to_string(Image.open(file_path))
            except Exception:
                logger.debug("Image OCR failed, continuing with empty text.", exc_info=True)

    except Exception as exc:
        logger.warning("Failed to read %s: %s", file_path, exc)

    return ""


def _extract_numbers(text: str, pattern: str) -> List[str]:
    return [match.group(1).strip() for match in re.finditer(pattern, text, re.IGNORECASE)]


def _parse_invoice_data(text: str) -> Dict[str, Any]:
    """Lightweight regex-based parsing to avoid heavyweight ML deps."""
    invoice_numbers = _extract_numbers(text, r"invoice\s*(?:no|number)?\s*[:#]?\s*([A-Z0-9\-/]+)")
    gstins = _extract_numbers(text, r"([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z])")
    pans = _extract_numbers(text, r"\b([A-Z]{5}[0-9]{4}[A-Z])\b")
    dates = _extract_numbers(text, r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})")
    vendor_match = re.search(r"(?:from|vendor|supplier)[:\-\s]+([^\n\r]+)", text, re.IGNORECASE)
    vendor_name = vendor_match.group(1).strip() if vendor_match else ""

    def _first_float(regex: str) -> float:
        match = re.search(regex, text, re.IGNORECASE)
        if not match:
            return 0.0
        try:
            return float(match.group(1).replace(",", ""))
        except Exception:
            return 0.0

    amount = _first_float(
        r"(?:grand\s*total|total\s*amount|net\s*amount|amount\s*payable|total)[^\n:]*[: ]\s*([\d,]+\.?\d*)"
    )
    cgst = _first_float(r"(?:cgst|central\s*tax)[^\n:]*[: ]\s*([\d,]+\.?\d*)")
    sgst = _first_float(r"(?:sgst|state\s*tax)[^\n:]*[: ]\s*([\d,]+\.?\d*)")
    igst = _first_float(r"igst[^\n:]*[: ]\s*([\d,]+\.?\d*)")
    total_gst = cgst + sgst + igst

    extracted_fields = {
        "invoice_numbers": invoice_numbers,
        "gstin": gstins,
        "pan": pans,
        "dates": dates,
    }

    # Basic confidence: more matched fields => higher confidence
    matches_found = sum(
        1 for lst in [invoice_numbers, gstins, dates] if lst
    )
    if amount:
        matches_found += 1
    confidence = min(1.0, 0.4 + matches_found * 0.15)

    return {
        "extracted_fields": extracted_fields,
        "gst_breakdown": {
            "cgst": cgst or None,
            "sgst": sgst or None,
            "igst": igst or None,
            "total_gst": total_gst or None,
        },
        "invoice_number": invoice_numbers[0] if invoice_numbers else "",
        "gst_number": gstins[0] if gstins else "",
        "pan": pans[0] if pans else "",
        "date": dates[0] if dates else "",
        "vendor_name": vendor_name,
        "amount": amount or 0.0,
        "cgst": cgst or 0.0,
        "sgst": sgst or 0.0,
        "igst": igst or 0.0,
        "items": [],
        "confidence": confidence,
    }


def _merge_parsed_data(raw_text: str, basic: Dict[str, Any], advanced: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Combine lightweight regex parsing with advanced OCR/NER output."""
    parsed = dict(basic)
    parsed.setdefault("items", [])
    parsed["raw_text"] = raw_text or parsed.get("raw_text") or ""

    if advanced:
        for key in [
            "invoice_number",
            "date",
            "vendor_name",
            "gst_number",
            "amount",
            "cgst",
            "sgst",
            "igst",
            "items",
            "entities",
            "raw_text",
        ]:
            if advanced.get(key) not in (None, "", []):
                parsed[key] = advanced.get(key)

        # Boost confidence if OCR/NER found strong signals
        bonus = 0.0
        if advanced.get("invoice_number") or advanced.get("gst_number"):
            bonus += 0.1
        parsed["confidence"] = min(1.0, float(parsed.get("confidence", 0.4)) + bonus)

    # Fill missing structured fields from basic extracted_fields
    extracted_fields = parsed.get("extracted_fields", {})
    if not parsed.get("invoice_number") and extracted_fields.get("invoice_numbers"):
        parsed["invoice_number"] = extracted_fields["invoice_numbers"][0]
    if not parsed.get("gst_number") and extracted_fields.get("gstin"):
        parsed["gst_number"] = extracted_fields["gstin"][0]
    if not parsed.get("date") and extracted_fields.get("dates"):
        parsed["date"] = extracted_fields["dates"][0]

    # Convenience totals for UI
    parsed["tax_total"] = sum(
        val for val in [parsed.get("cgst"), parsed.get("sgst"), parsed.get("igst")] if isinstance(val, (int, float))
    )
    parsed["total_amount"] = parsed.get("amount") or parsed.get("tax_total")

    if raw_text and not parsed.get("raw_text"):
        parsed["raw_text"] = raw_text

    return parsed


def process_document(document_id: str) -> Dict[str, Any]:
    """Process a document synchronously and update DB fields."""
    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        return {"success": False, "error": "Document not found"}

    try:
        document.status = "processing"
        document.save(update_fields=["status"])

        raw_text = _read_text(document.file.path)
        basic_parsed = _parse_invoice_data(raw_text or "")

        advanced_parsed: Optional[Dict[str, Any]] = None
        extractor = _get_invoice_extractor()
        if extractor:
            try:
                advanced_parsed = extractor.extract_invoice_data(document.file.path)
            except Exception:
                logger.debug("Advanced invoice extraction failed; continuing with basic parse.", exc_info=True)

        parsed = _merge_parsed_data(raw_text or "", basic_parsed, advanced_parsed)

        document.extracted_text = parsed.get("raw_text", raw_text or "")
        document.extracted_data = parsed
        document.confidence_score = float(parsed.get("confidence", 0.6))
        document.status = "completed"
        document.processed_at = timezone.now()
        document.save()

        return {
            "success": True,
            "document_id": str(document.id),
            "parsed": parsed,
        }
    except Exception as exc:
        logger.error("Failed to process document %s: %s", document_id, exc)
        document.status = "failed"
        document.save(update_fields=["status"])
        return {"success": False, "error": str(exc)}


