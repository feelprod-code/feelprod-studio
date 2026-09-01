#!/usr/bin/env python3
import os
import sys
import json
import base64
import ssl
import urllib.request
import urllib.error

ctx = ssl._create_unverified_context()

def get_api_key():
    key = os.environ.get("GEMINI_API_KEY")
    if key and len(key) > 20:
        return key.strip().strip('"').strip("'")
    
    candidate_paths = [
        os.path.expanduser("~/ANTIGRAVITY/therapeute-app/.env.local"),
        os.path.expanduser("~/ANTIGRAVITY/feelprod-studio/.env.local"),
        os.path.expanduser("~/ANTIGRAVITY/SITE_TDT_2026/.env.local"),
        os.path.expanduser("~/.gemini/antigravity/scratch/.env")
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            with open(p) as f:
                for line in f:
                    if line.startswith("GEMINI_API_KEY="):
                        k = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if len(k) > 20:
                            return k
    
    return "AIzaSyAcJza4iBZmoakvpElqCex2jWU1R_Nvfmk"

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

    models_to_try = [
        "gemini-3.5-transcribe",
        "gemini-3.5-flash",
        "gemini-3.7-flash",
        "gemini-2.5-flash"
    ]

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
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
                clean_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                if clean_text:
                    print(clean_text)
                    return
        except urllib.error.HTTPError as e:
            with open("/tmp/feelprod_voice_engine_error.log", "a") as ef:
                ef.write(f"Model {model} HTTP {e.code}\n")
        except Exception as e:
            with open("/tmp/feelprod_voice_engine_error.log", "a") as ef:
                ef.write(f"Model {model} Error: {e}\n")

if __name__ == "__main__":
    main()
