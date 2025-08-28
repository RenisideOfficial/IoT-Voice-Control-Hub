import json
from django.core.cache import cache
from django.http import JsonResponse
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from decorators.auth_decorator import jwt_login_required

# Device states stored in cache
DEVICE_KEYS = {
    'main': 'device_main',
    'lamp': 'device_lamp', 
    'fan': 'device_fan',
    'ac': 'device_ac'
}

@csrf_exempt
@require_POST
@jwt_login_required  # JWT authentication middleware
def control_device(request, device_name):
    if device_name not in DEVICE_KEYS:
        return JsonResponse({'error': 'Device not found'}, status=404)
    
    try:
        data = json.loads(request.body)
        state = data.get('state')
        
        if state not in [True, False]:
            return JsonResponse({'error': 'Invalid state'}, status=400)
        
        # Store device state
        cache.set(DEVICE_KEYS[device_name], state, timeout=None)
        
        # Broadcast state change to all WebSocket clients
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "device_updates",
            {
                "type": "device.update",
                "device": device_name,
                "state": state,
                "source": "http"
            }
        )
        
        return JsonResponse({'success': True, 'device': device_name, 'state': state})
    
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

@csrf_exempt
@jwt_login_required  # JWT authentication middleware
def get_device_state(request, device_name):
    if device_name not in DEVICE_KEYS:
        return JsonResponse({'error': 'Device not found'}, status=404)
    
    state = cache.get(DEVICE_KEYS[device_name], False)
    return JsonResponse({'device': device_name, 'state': state})