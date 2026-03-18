from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import ClientRelationship

User = get_user_model()

class UserAPITest(TestCase):
    def setUp(self):
        # create one SME and two CAs
        # username is required by the custom user model
        self.sme = User.objects.create_user(
            username='sme', email='sme@test.com', password='password', role='SME', is_active=True
        )
        self.ca1 = User.objects.create_user(
            username='ca1', email='ca1@test.com', password='password', role='CA', is_active=True
        )
        self.ca2 = User.objects.create_user(
            username='ca2', email='ca2@test.com', password='password', role='CA', is_active=True
        )
        # connect SME to ca1
        ClientRelationship.objects.create(ca=self.ca1, sme=self.sme, is_active=True)
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.sme)

    def test_list_cas_returns_all_and_connected_flag(self):
        response = self.client.get('/api/auth/cas/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('results', data)
        self.assertEqual(data['count'], 2)
        # find ca1 and ca2
        ids = {item['email']: item for item in data['results']}
        self.assertTrue(ids['ca1@test.com']['is_connected'])
        self.assertFalse(ids['ca2@test.com']['is_connected'])
