from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='Conversation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('status', models.CharField(choices=[('pending', 'Pending Request'), ('accepted', 'Accepted'), ('rejected', 'Rejected'), ('active', 'Active'), ('closed', 'Closed')], default='pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_message_at', models.DateTimeField(blank=True, null=True)),
                ('unread_by_ca', models.IntegerField(default=0)),
                ('unread_by_sme', models.IntegerField(default=0)),
                ('ca', models.ForeignKey(limit_choices_to={'role': 'CA'}, on_delete=django.db.models.deletion.CASCADE, related_name='conversations_as_ca', to='users.user')),
                ('sme', models.ForeignKey(limit_choices_to={'role': 'SME'}, on_delete=django.db.models.deletion.CASCADE, related_name='conversations_as_sme', to='users.user')),
            ],
            options={
                'db_table': 'conversations',
            },
        ),
        migrations.CreateModel(
            name='Message',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('content', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('attachment', models.FileField(blank=True, null=True, upload_to='chat_attachments/%Y/%m/%d/')),
                ('attachment_type', models.CharField(blank=True, choices=[('document', 'Document'), ('invoice', 'Invoice'), ('receipt', 'Receipt'), ('image', 'Image'), ('other', 'Other')], max_length=20, null=True)),
                ('conversation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='chat.conversation')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_messages', to='users.user')),
            ],
            options={
                'db_table': 'messages',
            },
        ),
        migrations.AddIndex(
            model_name='conversation',
            index=models.Index(fields=['ca', 'status'], name='conversations_ca_statu_idx'),
        ),
        migrations.AddIndex(
            model_name='conversation',
            index=models.Index(fields=['sme', 'status'], name='conversations_sme_stat_idx'),
        ),
        migrations.AddIndex(
            model_name='conversation',
            index=models.Index(fields=['-last_message_at'], name='conversations_last_me_idx'),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['conversation', 'created_at'], name='messages_conversation_idx'),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['sender'], name='messages_sender_idx'),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['is_read'], name='messages_is_read_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='conversation',
            unique_together={('ca', 'sme')},
        ),
    ]
