from django.http import JsonResponse
from functools import wraps
from config.token import decode_jwt
from django.utils import timezone

def jwt_login_required(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Authorization header missing or invalid'}, status=401)
        
        token = auth_header.split(' ')[1]
        payload = decode_jwt(token)
        
        if not payload:
            return JsonResponse({'error': 'Invalid or expired token'}, status=401)
        
        # Check token expiration
        if 'exp' in payload and payload['exp'] < timezone.now().timestamp():
            return JsonResponse({'error': 'Token expired'}, status=401)
        
        # Add user info to request for later use
        request.user_id = payload.get('user_id')
        request.username = payload.get('username')
        
        return view_func(request, *args, **kwargs)
    
    return _wrapped_view