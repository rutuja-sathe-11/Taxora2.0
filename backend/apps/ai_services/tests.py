from django.contrib.auth import get_user_model
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from unittest.mock import patch


User = get_user_model()


class AIRagChatTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='ai_rag_user',
            email='ai_rag_user@test.com',
            password='password',
            role='SME',
            is_active=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @patch('apps.ai_services.views.ai_advisor.get_tax_advice')
    def test_rag_chat_with_uploaded_document(self, mock_advice):
        mock_advice.return_value = '{"title":"RAG Test","summary":"ok","advice":"Based on uploaded document.","disclaimer":"test"}'

        uploaded = SimpleUploadedFile(
            'sample.txt',
            b'GST payable for March is 24000 and ITC available is 11000.',
            content_type='text/plain'
        )

        response = self.client.post(
            '/api/ai/chat/rag/',
            {
                'message': 'What is GST payable in this document?',
                'rag_file': uploaded,
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('session_id', response.data)
        self.assertIn('ai_response', response.data)
        self.assertIn('rag', response.data)
        self.assertTrue(response.data['rag']['used'])

    @patch('apps.ai_services.views.ai_advisor.get_tax_advice')
    def test_rag_chat_reuses_session_document_context(self, mock_advice):
        mock_advice.return_value = '{"title":"RAG Context","summary":"ok","advice":"Session context used.","disclaimer":"test"}'

        uploaded = SimpleUploadedFile(
            'turnover.txt',
            b'Total turnover in February is 1250000 and GST output tax is 45000.',
            content_type='text/plain'
        )

        first = self.client.post(
            '/api/ai/chat/rag/',
            {
                'message': 'Read this uploaded document',
                'rag_file': uploaded,
            },
            format='multipart',
        )
        self.assertEqual(first.status_code, 200)
        session_id = first.data['session_id']

        follow_up = self.client.post(
            '/api/ai/chat/rag/',
            {
                'message': 'What was the GST output tax value?',
                'session_id': session_id,
            },
            format='multipart',
        )

        self.assertEqual(follow_up.status_code, 200)
        self.assertIn('rag', follow_up.data)
        self.assertTrue(follow_up.data['rag']['used'])

    @patch('apps.ai_services.views.ai_advisor.get_tax_advice')
    def test_rag_chat_fallback_retrieval_when_query_terms_do_not_overlap(self, mock_advice):
        mock_advice.return_value = '{"title":"RAG Fallback","summary":"ok","advice":"Used latest document chunks.","disclaimer":"test"}'

        uploaded = SimpleUploadedFile(
            'doc.txt',
            b'This document contains GST payable amount 32000 and ITC 12000 for March filing.',
            content_type='text/plain'
        )

        first = self.client.post(
            '/api/ai/chat/rag/',
            {
                'message': 'Store this document for Q&A',
                'rag_file': uploaded,
            },
            format='multipart',
        )
        self.assertEqual(first.status_code, 200)

        # Intentionally low-overlap query terms; retrieval should still use latest chunks.
        follow_up = self.client.post(
            '/api/ai/chat/rag/',
            {
                'message': 'Explain obligations now',
                'session_id': first.data['session_id'],
            },
            format='multipart',
        )

        self.assertEqual(follow_up.status_code, 200)
        self.assertIn('rag', follow_up.data)
        self.assertTrue(follow_up.data['rag']['used'])
