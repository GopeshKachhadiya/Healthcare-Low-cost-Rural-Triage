import os
import httpx
import json

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "sk_xubkvi1i_AEc0Rv8tUtVkJXBCBEbaNkCE")
SARVAM_BASE = "https://api.sarvam.ai"

LANG_MAP = {
    "hi": "hi-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "kn": "kn-IN",
    "bn": "bn-IN",
    "mr": "mr-IN",
    "gu": "gu-IN",
    "en": "en-IN"
}

def get_sarvam_lang(lang: str) -> str:
    return LANG_MAP.get(lang.lower().strip(), "en-IN")

async def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Translate text between Indian languages and English using Sarvam AI."""
    src = get_sarvam_lang(source_lang)
    tgt = get_sarvam_lang(target_lang)
    if src == tgt or not text.strip():
        return text

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{SARVAM_BASE}/translate",
                headers={
                    "api-subscription-key": SARVAM_API_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "input": text,
                    "source_language_code": src,
                    "target_language_code": tgt
                }
            )
            if resp.status_code == 200:
                return resp.json().get("translated_text", text)
            else:
                print(f"[Sarvam Translate Error] {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"[Sarvam Translate Exception] {e}")
    return text

async def speech_to_text(audio_bytes: bytes, language: str) -> str:
    """Transcribe regional voice input using Sarvam AI Saaras model."""
    lang = get_sarvam_lang(language)
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{SARVAM_BASE}/speech-to-text",
                headers={
                    "api-subscription-key": SARVAM_API_KEY
                },
                files={"file": ("audio.webm", audio_bytes, "audio/webm")},
                data={
                    "model": "saaras:v1",
                    "language_code": lang
                }
            )
            if resp.status_code == 200:
                return resp.json().get("transcript", "")
            else:
                print(f"[Sarvam ASR Error] {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"[Sarvam ASR Exception] {e}")
    return ""

async def text_to_speech(text: str, language: str) -> str:
    """Synthesize text response to speech audio using Sarvam AI Bulbul model (returns base64 wav)."""
    lang = get_sarvam_lang(language)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{SARVAM_BASE}/text-to-speech",
                headers={
                    "api-subscription-key": SARVAM_API_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "text": text,
                    "target_language_code": lang,
                    "speaker": "anushka",
                    "model": "bulbul:v2"
                }
            )
            if resp.status_code == 200:
                audios = resp.json().get("audios", [])
                if audios:
                    return audios[0]
            else:
                print(f"[Sarvam TTS Error] {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"[Sarvam TTS Exception] {e}")
    return ""
