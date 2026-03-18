from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Create demo CA users for testing'

    def handle(self, *args, **options):
        demo_cas = [
            {
                'username': 'ca_demo1',
                'email': 'ca1@taxora.com',
                'first_name': 'Rajesh',
                'last_name': 'Kumar',
                'business_name': 'Kumar & Associates',
                'phone': '+91 98765 43210',
                'password': 'ca123456',
            },
            {
                'username': 'ca_demo2',
                'email': 'ca2@taxora.com',
                'first_name': 'Priya',
                'last_name': 'Sharma',
                'business_name': 'Sharma Tax Consultants',
                'phone': '+91 87654 32109',
                'password': 'ca123456',
            },
            {
                'username': 'ca_demo3',
                'email': 'ca3@taxora.com',
                'first_name': 'Amit',
                'last_name': 'Patel',
                'business_name': 'Patel Financial Services',
                'phone': '+91 76543 21098',
                'password': 'ca123456',
            },
        ]

        created_count = 0
        updated_count = 0

        for ca_data in demo_cas:
            username = ca_data['username']
            password = ca_data.pop('password')
            
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    **ca_data,
                    'role': 'CA',
                    'is_active': True,
                    'is_verified': True,
                }
            )
            
            if created:
                user.set_password(password)
                user.save()
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created CA: {username} (Password: {password})')
                )
            else:
                # Update existing user
                for key, value in ca_data.items():
                    setattr(user, key, value)
                user.role = 'CA'
                user.is_active = True
                user.is_verified = True
                user.set_password(password)
                user.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated CA: {username} (Password: {password})')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDemo CAs created: {created_count}, Updated: {updated_count}'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                '\nDemo CA Credentials:\n'
                '1. Username: ca_demo1, Password: ca123456\n'
                '2. Username: ca_demo2, Password: ca123456\n'
                '3. Username: ca_demo3, Password: ca123456\n'
            )
        )

