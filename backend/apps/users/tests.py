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


class ClientUpdateAPITest(TestCase):
    def setUp(self):
        self.ca = User.objects.create_user(
            username='ca_update', email='ca_update@test.com', password='password', role='CA', is_active=True
        )
        self.sme = User.objects.create_user(
            username='sme_update', email='sme_update@test.com', password='password', role='SME', is_active=True
        )
        self.relationship = ClientRelationship.objects.create(ca=self.ca, sme=self.sme, is_active=True)

        self.client = APIClient()
        self.client.force_authenticate(user=self.ca)

    def test_update_client_accepts_relationship_id(self):
        payload = {
            'name': 'Updated Client',
            'businessName': 'Updated Business',
            'phone': '9999999999'
        }

        response = self.client.patch(f'/api/auth/clients/{self.relationship.id}/', payload, format='json')

        self.assertEqual(response.status_code, 200)
        self.relationship.refresh_from_db()
        self.sme.refresh_from_db()
        self.assertEqual(self.sme.first_name, 'Updated')
        self.assertEqual(self.sme.last_name, 'Client')
        self.assertEqual(self.sme.business_name, 'Updated Business')
        self.assertEqual(self.sme.phone, '9999999999')

    def test_update_client_can_reactivate_inactive_relationship(self):
        self.relationship.is_active = False
        self.relationship.save()

        response = self.client.patch(
            f'/api/auth/clients/{self.sme.id}/',
            {'status': 'active'},
            format='json'
        )

        self.assertEqual(response.status_code, 200)
        self.relationship.refresh_from_db()
        self.assertTrue(self.relationship.is_active)
