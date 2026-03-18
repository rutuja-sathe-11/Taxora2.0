from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from decouple import config
from .models import AuditLog, ClientRelationship
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer,
    AuditLogSerializer, ClientRelationshipSerializer,
    PasswordResetSerializer, PasswordResetConfirmSerializer
)

User = get_user_model()

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        
        # Log registration
        AuditLog.objects.create(
            user=user,
            action='CREATE',
            resource='user',
            resource_id=str(user.id),
            details={'registration': True}
        )
        
        return Response({
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        
        # Log login
        AuditLog.objects.create(
            user=user,
            action='LOGIN',
            resource='user',
            resource_id=str(user.id),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user

class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return AuditLog.objects.filter(user=self.request.user)

class ClientListView(generics.ListAPIView):
    serializer_class = ClientRelationshipSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'CA':
            return ClientRelationship.objects.filter(ca=user, is_active=True)
        else:
            return ClientRelationship.objects.filter(sme=user, is_active=True)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def list_cas(request):
    """List all available CAs for SME users to connect with"""
    cas = User.objects.filter(role='CA', is_active=True)
    
    # Get already connected CA IDs
    connected_ca_ids = []
    if request.user.role == 'SME':
        connected_ca_ids = ClientRelationship.objects.filter(
            sme=request.user, is_active=True
        ).values_list('ca', flat=True)
    
    cas_list = []
    for ca in cas:
        cas_list.append({
            'id': str(ca.id),
            'name': ca.get_full_name(),
            'email': ca.email,
            'business_name': ca.business_name or 'Independent CA',
            'phone': ca.phone or '',
            'is_connected': str(ca.id) in [str(cid) for cid in connected_ca_ids]
        })
    
    return Response({'results': cas_list, 'count': len(cas_list)})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def password_reset(request):
    """Send password reset email to user"""
    serializer = PasswordResetSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            # don't reveal whether the email exists
            return Response({'detail': 'If that email is registered, a reset link has been sent.'})

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f"{config('FRONTEND_URL','http://localhost:5173')}/reset-password?uid={uid}&token={token}"
        user.email_user(
            subject="Taxora Password Reset",
            message=f"Click the link to reset your password:\n{reset_url}"
        )
        response_data = {'detail': 'If that email is registered, a reset link has been sent.'}
        if settings.DEBUG:
            response_data.update({'reset_url': reset_url, 'uid': uid, 'token': token})
        return Response(response_data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def password_reset_confirm(request):
    """Confirm password reset with uid, token and new password"""
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        try:
            uid_decoded = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=uid_decoded, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'detail': 'Invalid token or user.'}, status=status.HTTP_400_BAD_REQUEST)
        if default_token_generator.check_token(user, token):
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'detail': 'Password has been reset.'})
        else:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_client(request):
    """CA users can create/invite a new client"""
    if request.user.role != 'CA':
        return Response({'error': 'Only CAs can create clients'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    # Required fields
    email = request.data.get('email')
    name = request.data.get('name') or request.data.get('businessName')
    business_name = request.data.get('businessName') or name
    
    if not email or not name:
        return Response({'error': 'Email and name are required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Check if user with this email already exists
        sme_user, user_created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0] + '_' + str(User.objects.count()),
                'role': 'SME',
                'first_name': name.split()[0] if name else '',
                'last_name': ' '.join(name.split()[1:]) if len(name.split()) > 1 else '',
                'business_name': business_name,
                'gst_number': request.data.get('gstNumber', ''),
                'phone': request.data.get('phone', ''),
                'address': request.data.get('address', ''),
                'is_active': True,
                'profile_metadata': {
                    'pan_number': request.data.get('panNumber', ''),
                    'city': request.data.get('city', ''),
                    'state': request.data.get('state', ''),
                    'pincode': request.data.get('pincode', ''),
                    'business_type': request.data.get('businessType', ''),
                    'industry': request.data.get('industry', ''),
                    'annual_turnover': request.data.get('annualTurnover', 0),
                    'employee_count': request.data.get('employeeCount', 0),
                    'registration_date': request.data.get('registrationDate', ''),
                    'gst_registration_date': request.data.get('gstRegistrationDate', ''),
                    'last_gst_filing': request.data.get('lastGstFiling', ''),
                    'last_itr_filing': request.data.get('lastItrFiling', ''),
                    'compliance_status': request.data.get('complianceStatus', 'pending'),
                    'risk_level': request.data.get('riskLevel', 'low'),
                }
            }
        )
        
        # If user already exists but with different role, update it
        if not user_created and sme_user.role != 'SME':
            sme_user.role = 'SME'
            sme_user.business_name = business_name or sme_user.business_name
            sme_user.gst_number = request.data.get('gstNumber') or sme_user.gst_number
            sme_user.phone = request.data.get('phone') or sme_user.phone
            sme_user.address = request.data.get('address') or sme_user.address
            # Update metadata
            metadata = sme_user.profile_metadata or {}
            metadata.update({
                'pan_number': request.data.get('panNumber', metadata.get('pan_number', '')),
                'city': request.data.get('city', metadata.get('city', '')),
                'state': request.data.get('state', metadata.get('state', '')),
                'pincode': request.data.get('pincode', metadata.get('pincode', '')),
                'business_type': request.data.get('businessType', metadata.get('business_type', '')),
                'industry': request.data.get('industry', metadata.get('industry', '')),
                'annual_turnover': request.data.get('annualTurnover', metadata.get('annual_turnover', 0)),
                'employee_count': request.data.get('employeeCount', metadata.get('employee_count', 0)),
                'registration_date': request.data.get('registrationDate', metadata.get('registration_date', '')),
                'gst_registration_date': request.data.get('gstRegistrationDate', metadata.get('gst_registration_date', '')),
                'last_gst_filing': request.data.get('lastGstFiling', metadata.get('last_gst_filing', '')),
                'last_itr_filing': request.data.get('lastItrFiling', metadata.get('last_itr_filing', '')),
                'compliance_status': request.data.get('complianceStatus', metadata.get('compliance_status', 'pending')),
                'risk_level': request.data.get('riskLevel', metadata.get('risk_level', 'low')),
            })
            sme_user.profile_metadata = metadata
            sme_user.save()
        
        # Create or get the client relationship
        relationship, rel_created = ClientRelationship.objects.get_or_create(
            ca=request.user,
            sme=sme_user,
            defaults={'is_active': True, 'access_level': 'FULL'}
        )
        
        if not rel_created and not relationship.is_active:
            relationship.is_active = True
            relationship.save()
        
        # Log the creation
        AuditLog.objects.create(
            user=request.user,
            action='CREATE',
            resource='client',
            resource_id=str(sme_user.id),
            details={
                'client_email': email,
                'client_name': name,
                'user_created': user_created,
                'relationship_created': rel_created
            }
        )
        
        # Return the client relationship data
        serializer = ClientRelationshipSerializer(relationship)
        return Response({
            'message': 'Client created successfully' if user_created else 'Client added to your list',
            'client': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        return Response({'error': f'Error creating client: {str(e)}'}, 
                       status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def remove_client(request, client_id):
    """CA users can remove/disconnect a client"""
    if request.user.role != 'CA':
        return Response({'error': 'Only CAs can remove clients'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get the client relationship
        relationship = ClientRelationship.objects.get(
            ca=request.user,
            sme_id=client_id,
            is_active=True
        )
        
        # Deactivate the relationship instead of deleting it
        relationship.is_active = False
        relationship.save()
        
        # Log the removal
        AuditLog.objects.create(
            user=request.user,
            action='DELETE',
            resource='client_relationship',
            resource_id=str(relationship.id),
            details={
                'client_id': str(client_id),
                'client_name': relationship.sme.get_full_name()
            }
        )
        
        return Response({'message': 'Client removed successfully'})
    
    except ClientRelationship.DoesNotExist:
        return Response({'error': 'Client relationship not found'}, 
                       status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_client(request, client_id):
    """CA users can update client details"""
    if request.user.role != 'CA':
        return Response({'error': 'Only CAs can update clients'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get the client relationship
        relationship = ClientRelationship.objects.get(
            ca=request.user,
            sme_id=client_id,
            is_active=True
        )
        
        sme_user = relationship.sme
        
        # Update user fields
        if 'name' in request.data:
            name = request.data.get('name')
            name_parts = name.split(' ', 1)
            sme_user.first_name = name_parts[0] if name_parts else ''
            sme_user.last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        if 'businessName' in request.data:
            sme_user.business_name = request.data.get('businessName')
        
        if 'gstNumber' in request.data:
            sme_user.gst_number = request.data.get('gstNumber', '')
        
        if 'phone' in request.data:
            sme_user.phone = request.data.get('phone', '')
        
        if 'address' in request.data:
            sme_user.address = request.data.get('address', '')
        
        # Update profile metadata for additional fields
        metadata = sme_user.profile_metadata or {}
        if 'panNumber' in request.data:
            metadata['pan_number'] = request.data.get('panNumber', '')
        if 'city' in request.data:
            metadata['city'] = request.data.get('city', '')
        if 'state' in request.data:
            metadata['state'] = request.data.get('state', '')
        if 'pincode' in request.data:
            metadata['pincode'] = request.data.get('pincode', '')
        if 'businessType' in request.data:
            metadata['business_type'] = request.data.get('businessType', '')
        if 'industry' in request.data:
            metadata['industry'] = request.data.get('industry', '')
        if 'annualTurnover' in request.data:
            metadata['annual_turnover'] = request.data.get('annualTurnover', 0)
        if 'employeeCount' in request.data:
            metadata['employee_count'] = request.data.get('employeeCount', 0)
        if 'registrationDate' in request.data:
            metadata['registration_date'] = request.data.get('registrationDate', '')
        if 'gstRegistrationDate' in request.data:
            metadata['gst_registration_date'] = request.data.get('gstRegistrationDate', '')
        if 'lastGstFiling' in request.data:
            metadata['last_gst_filing'] = request.data.get('lastGstFiling', '')
        if 'lastItrFiling' in request.data:
            metadata['last_itr_filing'] = request.data.get('lastItrFiling', '')
        if 'complianceStatus' in request.data:
            metadata['compliance_status'] = request.data.get('complianceStatus', 'pending')
        if 'riskLevel' in request.data:
            metadata['risk_level'] = request.data.get('riskLevel', 'low')
        
        sme_user.profile_metadata = metadata
        
        # Update relationship fields
        if 'status' in request.data:
            relationship.is_active = request.data.get('status') == 'active'
        
        if 'accessLevel' in request.data:
            relationship.access_level = request.data.get('accessLevel', 'FULL')
        
        sme_user.save()
        relationship.save()
        
        # Log the update
        AuditLog.objects.create(
            user=request.user,
            action='UPDATE',
            resource='client',
            resource_id=str(sme_user.id),
            details={
                'client_id': str(client_id),
                'client_name': sme_user.get_full_name(),
                'updated_fields': list(request.data.keys())
            }
        )
        
        # Return updated client relationship data
        serializer = ClientRelationshipSerializer(relationship)
        return Response({
            'message': 'Client updated successfully',
            'client': serializer.data
        })
    
    except ClientRelationship.DoesNotExist:
        return Response({'error': 'Client relationship not found'}, 
                       status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Error updating client: {str(e)}'}, 
                       status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def connect_with_ca(request):
    """SME users can connect with CAs"""
    if request.user.role != 'SME':
        return Response({'error': 'Only SME users can connect with CAs'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    ca_id = request.data.get('ca_id')
    if not ca_id:
        return Response({'error': 'ca_id is required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    try:
        ca = User.objects.get(id=ca_id, role='CA')
        relationship, created = ClientRelationship.objects.get_or_create(
            ca=ca, sme=request.user,
            defaults={'is_active': True}
        )
        
        if created:
            # Log the connection
            AuditLog.objects.create(
                user=request.user,
                action='CREATE',
                resource='client_relationship',
                resource_id=str(relationship.id),
                details={'ca_id': str(ca_id), 'ca_name': ca.get_full_name()}
            )
            
            return Response({
                'message': 'Successfully connected with CA',
                'relationship_id': str(relationship.id)
            })
        else:
            if not relationship.is_active:
                relationship.is_active = True
                relationship.save()
                return Response({'message': 'Connection reactivated'})
            return Response({'error': 'Already connected with this CA'})
    
    except User.DoesNotExist:
        return Response({'error': 'CA not found'}, status=status.HTTP_404_NOT_FOUND)