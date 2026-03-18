from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.ai_services.groq_client import GroqClient
from apps.ai_services.ai_utils import AITaxAdvisor
from unittest.mock import patch, MagicMock

User = get_user_model()

class AIAdvisorTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='SME'
        )
        self.advisor = AITaxAdvisor()

    def test_groq_client_initialization(self):
        """Test Groq client can be initialized"""
        client = GroqClient()
        self.assertIsNotNone(client)

    @patch('apps.ai_services.groq_client.Groq')
    def test_ai_advisor_with_mock_groq(self, mock_groq):
        """Test AI advisor with mocked Groq response"""
        # Mock Groq response
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "GST filing deadline is 20th of next month."

        mock_completion = MagicMock()
        mock_completion.create.return_value = mock_response

        mock_client = MagicMock()
        mock_client.chat.completions = mock_completion

        mock_groq.return_value = mock_client

        # Test query
        result = self.advisor.get_tax_advice("What is GST filing deadline?")

        # Assertions
        self.assertIsNotNone(result)
        self.assertIsInstance(result, str)

    def test_ai_advisor_fallback(self):
        """Test AI advisor fallback when Groq unavailable"""
        # Create advisor without API key
        with patch('apps.ai_services.groq_client.settings.GROQ_API_KEY', ''):
            advisor = AITaxAdvisor()
            result = advisor.get_tax_advice("Tell me about GST")

            # Should return fallback response
            self.assertIsNotNone(result)
            self.assertIsInstance(result, str)
            self.assertGreater(len(result), 0)

    def test_ai_advisor_context_building(self):
        """Test context building for AI advisor"""
        context = {
            'user_info': {
                'business_name': 'Test Business',
                'role': 'SME'
            },
            'transactions': [
                {'description': 'Office Rent', 'amount': 25000, 'type': 'expense'}
            ]
        }

        prompt = self.advisor._build_prompt("How can I save tax?", context)

        # Check context is included in prompt
        self.assertIn('Test Business', prompt)
        self.assertIn('Office Rent', prompt)

    def test_groq_response_structure(self):
        """Test Groq response structure"""
        client = GroqClient()

        # Test fallback response structure
        response = client._fallback_response("tax query")

        self.assertIsInstance(response, dict)
        self.assertIn('success', response)
        self.assertIn('answer', response)
        self.assertIn('model', response)
        self.assertIn('confidence', response)

        self.assertTrue(response['success'])
        self.assertIsInstance(response['answer'], str)
        self.assertGreater(len(response['answer']), 0)

    def test_ask_groq_with_prompts(self):
        """Test ask_groq with system and user prompts"""
        client = GroqClient()

        system_prompt = "You are a tax expert."
        user_prompt = "What is income tax?"

        result = client.ask_groq(system_prompt, user_prompt)

        # Should return structured response
        self.assertIsInstance(result, dict)
        self.assertIn('answer', result)
        self.assertIn('success', result)
        self.assertTrue(result['success'])
