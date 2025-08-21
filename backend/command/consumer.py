import json
from channels.generic.websocket import AsyncWebsocketConsumer
from voice.speech import SpeechSession

class SpeechConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept() # accept http req from frontend

        # Create instance of the SpeechSesion class
        self.session = SpeechSession(sample_rate=16000, frame_ms=20)
        self.lang = "en-US"
        await self.send(json.dumps({
            "type": "ready",
            "message": "Websocket connected"
        }))

    async def disconnect(self, close_code):
        print("Websocket disconnected: ", close_code)
        self.send(json.dumps({"message": "Websocket disconnected"}))
        pass

    async def receive(self, text_data=None, bytes_data=None):
        if bytes_data: # if frontend sent bytes data
            ended = self.session.add_chunk(bytes_data) # add bytes_data to instance
            
            if ended:
                await self.send(json.dumps({"type": "status", "message": "Transcribing..."}))
                text = self.session.recognize_last(lang=self.lang) or ""
                await self.send(json.dumps({"type": "final", "text": text}))
                
                # Here is where you'll map text -> command -> Arduino via pyserial
                # Example with pseudocode:
                # if "light on" in text.lower():
                #     ser.write(b'1')
                #     await self.send(json.dumps({"type": "device", "light": "on"}))
                # elif "light off" in text.lower():
                #     ser.write(b'0')
                #     await self.send(json.dumps({"type": "device", "light": "off"}))

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