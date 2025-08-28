import json
from channels.generic.websocket import AsyncWebsocketConsumer
from voice.speech import SpeechSession
from django.core.cache import cache
from asgiref.sync import sync_to_async
from config.token import decode_jwt
import urllib.parse

class SpeechConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Extract token from query parameters
        query_string = self.scope.get('query_string', b'').decode()
        query_params = urllib.parse.parse_qs(query_string)
        token = query_params.get('token', [None])[0]
        
        if not token:
            await self.close(code=4001)  # Custom close code for authentication failure
            return
        
        # Verify JWT token
        payload = decode_jwt(token)
        if not payload:
            await self.close(code=4001)
            return
        
        # Store user information
        self.user_id = payload.get('user_id')
        self.username = payload.get('username')
        
        await self.accept()
        
        # Add to device_updates group
        self.group_name = "device_updates"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        
        # instance of the SpeechSession class
        self.session = SpeechSession(sample_rate=16000, frame_ms=20)
        self.lang = "en-US"
        await self.send(json.dumps({
            "type": "ready",
            "message": "Websocket connected"
        }))

    async def disconnect(self, close_code):
        # Only try to discard if we were added to the group
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        print("Websocket disconnected: ", close_code)

    async def receive(self, text_data=None, bytes_data=None):
        if bytes_data:
            ended = self.session.add_chunk(bytes_data)
            
            if ended:
                await self.send(json.dumps({"type": "status", "message": "Transcribing..."}))
                text = self.session.recognize_last(lang=self.lang) or ""
                await self.send(json.dumps({"type": "final", "text": text}))
                
                # Handle voice commands and control devices
                await self.handle_voice_command(text)
                
        elif text_data:
            try:
                data = json.loads(text_data)
                if data.get("type") == "lang":
                    self.lang = data.get("value", "en-US")
                    await self.send(json.dumps({"type": "status", "message": f"Language set: {self.lang}"}))
                else:
                    await self.send(json.dumps({"type": "status", "message": f"Unknown control: {data}"}))
            except:
                await self.send(json.dumps({"type": "status", "message": "Invalid JSON"}))
    
    async def handle_voice_command(self, text):
        """Process voice commands and control devices"""
        text_lower = text.lower()
        
        # Map voice commands to device actions
        device_actions = {
            'main': {
                'on': any(cmd in text_lower for cmd in ['main on', 'turn on main', 'switch main on', 'activate main']),
                'off': any(cmd in text_lower for cmd in ['main off', 'turn off main', 'switch main off', 'deactivate main'])
            },
            'lamp': {
                'on': any(cmd in text_lower for cmd in ['lamp on', 'light on', 'turn on lamp', 'turn on light']),
                'off': any(cmd in text_lower for cmd in ['lamp off', 'light off', 'turn off lamp', 'turn off light'])
            },
            'fan': {
                'on': any(cmd in text_lower for cmd in ['fan on', 'turn on fan']),
                'off': any(cmd in text_lower for cmd in ['fan off', 'turn off fan'])
            },
            'ac': {
                'on': any(cmd in text_lower for cmd in ['ac on', 'air conditioner on', 'turn on ac', 'turn on air conditioner']),
                'off': any(cmd in text_lower for cmd in ['ac off', 'air conditioner off', 'turn off ac', 'turn off air conditioner'])
            }
        }
        
        # Process each device command
        for device, actions in device_actions.items():
            if actions['on']:
                await self.control_device(device, True, "voice")
            elif actions['off']:
                await self.control_device(device, False, "voice")
    
    async def control_device(self, device, state, source):
        """Control a device and broadcast the update"""
        # Store device state in cache
        # (I'll use Redis later in production, for now it's InMemoryLayer)
        await sync_to_async(cache.set)(f"device_{device}", state, timeout=None)
        
        # Broadcast to all connected clients
        await self.channel_layer.group_send(
            "device_updates",
            {
                "type": "device.update",
                "device": device,
                "state": state,
                "source": source
            }
        )
    
    async def device_update(self, event):
        """Receive device update broadcasts"""
        await self.send(json.dumps({
            "type": "device_update",
            "device": event["device"],
            "state": event["state"],
            "source": event["source"]
        }))