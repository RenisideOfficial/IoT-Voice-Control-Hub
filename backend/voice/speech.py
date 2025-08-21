import io
import math
import wave

from typing import Optional, Tuple, List
import speech_recognition as sr

def float32_to_int16(pcm_f32):
    # convert numpy-like float32 buffer [-1, 1] to int16 bytes
    # if you send int16 from the browser already, you can skip this
    clipped = [max(-1.0, min(1.0, x)) for x in pcm_f32]
    return b"".join(int((x * 32767.0)).to_bytes(2, "little", signed=True) for x in clipped)

def make_wav(int16_bytes: bytes, sample_rate: int = 16000, channels: int = 1) -> bytes:
    # Wrap raw int16 PCM bytes into a wav container
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2) # 16-bit
        wf.setframerate(sample_rate) # 16000
        wf.writeframes(int16_bytes)
    return buffer.getvalue()

class SimpleVAD:
    def __init__(self, sr: int = 16000, frame_ms: int = 20, threshold: float = 0.01, hangover_ms: int = 600):
        self.sample_rate = sr
        self.frame_size = int(sr * frame_ms / 1000) # sample per frame
        self.threshold = threshold
        self.hangover_frames = int(hangover_ms / frame_ms)
        self.silence_count = 0
        self.in_speech = False

    def _rms(self, frame_i16: bytes) -> float:
        # Compute RMS of int16 frame,
        # i.e the degree of loudness of audio to
        # determin whether this is audio or silence
        n = len(frame_i16) // 2
        if n == 0:
            return 0.0
        total = 0.0
        for i in range(0, len(frame_i16), 2):
            s = int.from_bytes(frame_i16[i:i+2], "little", signed=True)
            total += (s * s)
        rms = math.sqrt(total / n) / 32768.0
        return rms

    def is_speech_frame(self, frame_i16: bytes) -> bool:
        # return True if frame_i16 is greater than threshold
        return self._rms(frame_i16) >= self.threshold

    def update(self, frame_i16: bytes) -> Tuple[bool, bool]:
        # checks if it's a speech, this function is called repeatedly
        speechy = self.is_speech_frame(frame_i16)
        start = False
        end = False
        
        if speechy:
            if not self.in_speech:
                start = True
            self.in_speech = True
            self.silence_count = 0
        else:
            if self.in_speech:
                self.silence_count += 1
                if self.silence_count >= self.hangover_frames:
                    end = True
                    self.in_speech = False
                    self.silence_count = 0
                    
        return start, end
    
class SpeechSession:
    # Buffers incoming int16 pcm frames, segments utterances via VAD
    def __init__(self, sample_rate: int = 16000, frame_ms: int = 20):
        self.sample_rate = sample_rate
        self.frame_ms = frame_ms
        self.frame_bytes = int(sample_rate * frame_ms / 1000) * 2 # int 16
        self.vad = SimpleVAD(sr=sample_rate, frame_ms=frame_ms, threshold=0.01, hangover_ms=600)
        self.current_utt: List[bytes] = []
        self.completed_audio: Optional[bytes] = None
        
    def add_chunk(self, chunk: bytes) -> Optional[bool]:
        # Add raw int16 PCM chunk (multiple frames OK). Returns True if utterance just ended
        
        # Slice chunk into exact frames for VAD
        ended = False
        pos = 0
        while pos + self.frame_bytes <= len(chunk):
            frame = chunk[pos:pos + self.frame_bytes]
            pos += self.frame_bytes
            
            start, end = self.vad.update(frame)
            if start and not self.current_utt:
                # Starting to collect
                self.current_utt.append(frame)
            elif self.current_utt:
                self.current_utt.append(frame)
                
            if end and self.current_utt:
                # finalize current utterance
                self.completed_audio = b"".join(self.current_utt)
                self.current_utt = []
                ended = True
                
        leftover = chunk[pos:]
        if leftover:
            # if we had leftover, just buffer them until next chunk arrives
            pass
        
        return True if ended else None
    
    def has_completed(self) -> bool:
        # return audio if it's not none
        return self.completed_audio is not None
    
    def pop_completed_wav(self) -> Optional[bytes]:
        if self.completed_audio is None:
            return None
        
        wav = make_wav(self.completed_audio, sample_rate=self.sample_rate, channels=1)
        self.completed_audio = None
        return wav
    
    def recognize_last(self, lang: str = "en_US") -> Optional[str]:
        wav_bytes = self.pop_completed_wav()
        if not wav_bytes:
            return None
        
        # Now recognize the audio_wav created by pop_completed_wav
        r = sr.Recognizer()
        with sr.AudioFile(io.BytesIO(wav_bytes)) as source:
            audio = r.record(source)
            
        try:
            return r.recognize_google(audio, language=lang)
        except sr.UnknownValueError:
            return ""
        except Exception:
            return ""