from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model, authenticate

User = get_user_model()

class Command(BaseCommand):
    help = 'Reset passwords for demo users to ensure they work correctly'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Reset password for specific username'
        )
        parser.add_argument(
            '--password',
            type=str,
            default='client123',
            help='Password to set (default: client123)'
        )

    def handle(self, *args, **options):
        username_filter = options.get('username')
        new_password = options.get('password')

        # Demo client usernames
        demo_usernames = [
            'client_tech_solutions',
            'client_retail_store',
            'client_consulting_firm',
            'client_manufacturing',
            'client_food_services',
            'client_digital_agency',
            'client_healthcare',
        ]

        # Demo CA usernames
        demo_ca_usernames = [
            'ca_demo1',
            'ca_demo2',
            'ca_demo3',
        ]

        all_demo_usernames = demo_usernames + demo_ca_usernames

        if username_filter:
            usernames_to_reset = [username_filter]
        else:
            usernames_to_reset = all_demo_usernames

        reset_count = 0
        failed_count = 0

        for username in usernames_to_reset:
            try:
                user = User.objects.get(username=username)
                
                # Reset password
                user.set_password(new_password)
                user.is_active = True
                user.save()
                
                # Verify password works
                test_auth = authenticate(username=username, password=new_password)
                if test_auth:
                    self.stdout.write(
                        self.style.SUCCESS(f'✅ Reset password for {username} - Authentication verified')
                    )
                    reset_count += 1
                else:
                    self.stdout.write(
                        self.style.ERROR(f'❌ Password reset for {username} but authentication failed!')
                    )
                    failed_count += 1
                    
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f'⚠️  User {username} does not exist')
                )
                failed_count += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ Error resetting password for {username}: {str(e)}')
                )
                failed_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Successfully reset {reset_count} passwords'
            )
        )
        if failed_count > 0:
            self.stdout.write(
                self.style.WARNING(f'⚠️  {failed_count} users had issues')
            )
