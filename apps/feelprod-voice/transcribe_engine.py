#!/usr/bin/env python3
import os
import sys
import json
import base64
import ssl
import urllib.request
import urllib.error

ctx = ssl._create_unverified_context()
OFFICIAL_VALID_KEY = "AIzaSyAcJza4iBZmoakvpElqCex2jWU1R_Nvfmk"

def get_api_key():
    key = os.environ.get("GEMINI_API_KEY")
    if key and key.startswith("AIzaSyAc"):
        return key
    return OFFICIAL_VALID_KEY

def main():
    if len(sys.argv) < 2:
        return
    audio_path = sys.argv[1]
    
    if not os.path.exists(audio_path) or os.path.getsize(audio_path) < 300:
        return

    api_key = get_api_key()

    with open(audio_path, "rb") as f:
        b64_audio = base64.b64encode(f.read()).decode("utf-8")

    prompt = (
        "Tu es l'assistant vocal officiel de FeelProd et du cabinet d'ostéopathie / TDT de Guillaume Philippe. "
        "Transcris fidèlement l'audio ci-joint (simple voix ou dialogue avec patient / confrère via double micro). "
        "Règles d'or : "
        "1. Si plusieurs personnes parlent, sépare distinctement les répliques (ex: Guillaume (Praticien) : ... / Patient : ...). "
        "2. Corrige la grammaire, la ponctuation, supprime les hésitations orales (euh, bah, hum). "
        "3. Vocabulaire spécifique : FeelProd (deux E), Antigravity, TDT, Sutherland, Blechschmidt, SSB, MRP, dural, fascia, sphéno-basilaire, lemniscate, synchondrose, motilité, motricité, biodynamique, liquide cérébro-spinal, LCS, LCR, méninge, faux du cerveau, tente du cervelet, occiput, sacrum, sphénoïde, ethmoïde, temporal, pariétal, frontal, vomer, maxillaire, mandibule, ATM, ptérygoïde, crânien, viscéral, somato-émotionnel, fulcrum, Still, Becker, Viola Frymann, Rollin Becker, Fulford, Magoun, Jealous. "
        "4. Renvoie UNIQUEMENT le texte propre nettoyé."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": "audio/mp4", "data": b64_audio}}
            ]
        }],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 8192}
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=180, context=ctx) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            clean_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            print(clean_text)
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8", errors="ignore")
        # Log to tmp for debugging
        with open("/tmp/feelprod_voice_engine_error.log", "w") as ef:
            ef.write(f"HTTP {e.code}: {err_msg}")
    except Exception as e:
        with open("/tmp/feelprod_voice_engine_error.log", "w") as ef:
            ef.write(f"Error: {e}")

if __name__ == "__main__":
    main()
