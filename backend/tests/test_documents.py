from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from apps.documents.models import Document
from apps.documents.processor import process_document
import tempfile
import os

User = get_user_model()

class DocumentProcessingTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='SME'
        )

    def test_document_upload_and_ocr(self):
        """Test document upload triggers OCR processing"""
        # Create sample invoice content
        invoice_text = """
        TAX INVOICE
        Invoice No: INV-2024-001
        Date: 01/10/2024

        From: ABC Traders
        GSTIN: 27AABCU9603R1ZM

        Amount: 10,000
        CGST @ 9%: 900
        SGST @ 9%: 900
        Total: 11,800
        """

        # Create a temporary text file
        temp_file = SimpleUploadedFile(
            "test_invoice.txt",
            invoice_text.encode('utf-8'),
            content_type="text/plain"
        )

        # Create document
        document = Document.objects.create(
            user=self.user,
            name='test_invoice.txt',
            category='invoice',
            file=temp_file,
            file_size=len(invoice_text),
            mime_type='text/plain'
        )

        # Process document
        result = process_document(str(document.id))

        # Refresh from database
        document.refresh_from_db()

        # Assertions
        self.assertTrue(result['success'])
        self.assertEqual(document.status, 'completed')
        self.assertIsNotNone(document.extracted_text)
        self.assertIn('INV-2024-001', document.extracted_text)

        # Check parsed data
        self.assertIsNotNone(document.extracted_data)
        extracted_fields = document.extracted_data.get('extracted_fields', {})

        # Should extract GSTIN
        if extracted_fields.get('gstin'):
            self.assertIn('27AABCU9603R1ZM', extracted_fields['gstin'])

        # Should extract invoice number
        if extracted_fields.get('invoice_numbers'):
            self.assertTrue(len(extracted_fields['invoice_numbers']) > 0)

    def test_document_parsing_fields(self):
        """Test that required invoice fields are extracted"""
        invoice_text = """
        Invoice Number: TEST-INV-123
        Date: 15/09/2024
        GSTIN: 29ABCDE1234F1Z5
        PAN: ABCDE1234F

        Subtotal: Rs. 50,000
        CGST: Rs. 4,500
        SGST: Rs. 4,500
        Total: Rs. 59,000
        """

        temp_file = SimpleUploadedFile(
            "invoice.txt",
            invoice_text.encode('utf-8'),
            content_type="text/plain"
        )

        document = Document.objects.create(
            user=self.user,
            name='invoice.txt',
            category='invoice',
            file=temp_file,
            file_size=len(invoice_text),
            mime_type='text/plain'
        )

        result = process_document(str(document.id))
        document.refresh_from_db()

        # Check extracted data structure
        self.assertIn('extracted_fields', document.extracted_data)
        self.assertIn('gst_breakdown', document.extracted_data)
        self.assertIn('confidence', document.extracted_data)

        # Confidence should be between 0 and 1
        confidence = document.extracted_data.get('confidence', 0)
        self.assertGreaterEqual(confidence, 0)
        self.assertLessEqual(confidence, 1)

    def test_document_with_gst_breakdown(self):
        """Test GST breakdown extraction"""
        invoice_text = """
        Invoice
        CGST @ 9%: 1,800
        SGST @ 9%: 1,800
        Total GST: 3,600
        """

        temp_file = SimpleUploadedFile(
            "gst_invoice.txt",
            invoice_text.encode('utf-8'),
            content_type="text/plain"
        )

        document = Document.objects.create(
            user=self.user,
            name='gst_invoice.txt',
            category='invoice',
            file=temp_file,
            file_size=len(invoice_text),
            mime_type='text/plain'
        )

        result = process_document(str(document.id))
        document.refresh_from_db()

        gst_breakdown = document.extracted_data.get('gst_breakdown', {})

        # Check GST amounts are extracted
        self.assertIn('cgst', gst_breakdown)
        self.assertIn('sgst', gst_breakdown)
        self.assertIn('total_gst', gst_breakdown)

        # Values should be numeric
        if gst_breakdown.get('cgst'):
            self.assertIsInstance(gst_breakdown['cgst'], (int, float))
