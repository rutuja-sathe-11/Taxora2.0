from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Delete demo CA users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm deletion without prompt',
        )

    def handle(self, *args, **options):
        demo_usernames = ['ca_demo1', 'ca_demo2', 'ca_demo3']
        
        deleted_count = 0
        not_found = []
        
        for username in demo_usernames:
            try:
                user = User.objects.get(username=username, role='CA')
                user.delete()
                deleted_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Deleted CA: {username}')
                )
            except User.DoesNotExist:
                not_found.append(username)
                self.stdout.write(
                    self.style.WARNING(f'CA not found: {username}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nTotal demo CAs deleted: {deleted_count}'
            )
        )
        
        if not_found:
            self.stdout.write(
                self.style.WARNING(
                    f'CAs not found: {", ".join(not_found)}'
                )
            )

