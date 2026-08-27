#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import sys
import base64
import json
import subprocess
import requests

def get_api_key():
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        env_path = "/Users/guillaumephilippe/ANTIGRAVITY/therapeute-app/.env.local"
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("GEMINI_API_KEY="):
                        key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
    if not key:
        key = os.environ.get("GOOGLE_API_KEY")
    return key

def copy_and_paste(text):
    if not text:
        return
    # Copy to clipboard
    p = subprocess.Popen(["pbcopy"], stdin=subprocess.PIPE)
    p.communicate(text.encode("utf-8"))
    
    # Simulate Cmd+V to paste in active application
    applescript = 'tell application "System Events" to keystroke "v" using command down'
    subprocess.run(["osascript", "-e", applescript], check=False)

def transcribe(audio_path):
    if not os.path.exists(audio_path) or os.path.getsize(audio_path) < 500:
        print("AUDIO_EMPTY", file=sys.stderr)
        return ""

    api_key = get_api_key()
    if not api_key:
        print("MISSING_API_KEY", file=sys.stderr)
        return ""

    with open(audio_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode("utf-8")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

    system_instruction = (
        "Tu es un assistant de transcription vocale d'élite pour Guillaume Philippe (FeelProd / TDT / Antigravity / Google Flow).\n"
        "RÈGLES STRICTES :\n"
        "1. Retranscris fidèlement la parole enregistrée sans rien inventer.\n"
        "2. Nettoie les hésitations orales ('euh', bégaiements, répétitions involontaires).\n"
        "3. Respecte et orthographie parfaitement les noms propres et acronymes de son écosystème :\n"
        "   - 'FeelProd' (toujours avec deux 'e'), 'Antigravity', 'Google Flow', 'TDT', 'TDT Player'.\n"
        "   - Termes ostéopathiques et médicaux : SSB (Synchondrose Sphéno-Basilaire), MRP (Mouvement Respiratoire Primaire), Sutherland, Blechschmidt, dure-mère, motilité, fulcrum, tensegrité, L5-S1, C2-C3, ATM.\n"
        "   - Termes informatiques et code : Next.js, React, Tailwind, Git, GitHub, API, Vercel, Supabase, TypeScript, JSON, VTT, MP4, useEffect, useState, etc.\n"
        "4. Conserve une ponctuation et une mise en page impeccables (majuscules, virgules, points).\n"
        "5. Ne renvoie AUCUN préambule, AUCUNE balise de code, AUCUN commentaire méta. Renvoie UNIQUEMENT le texte transcrit direct."
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": "audio/mp4",
                            "data": audio_b64
                        }
                    },
                    {
                        "text": system_instruction
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.0
        }
    }

    try:
        resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=20)
        if resp.status_code == 200:
            res = resp.json()
            candidates = res.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "").strip()
        else:
            print(f"API_ERROR: {resp.status_code} - {resp.text}", file=sys.stderr)
    except Exception as e:
        print(f"REQUEST_FAILED: {e}", file=sys.stderr)
    return ""

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: transcribe_engine.py <audio_path> [--no-paste]")
        sys.exit(1)

    audio_file = sys.argv[1]
    auto_paste = "--no-paste" not in sys.argv

    text = transcribe(audio_file)
    if text:
        print(text)
        if auto_paste:
            copy_and_paste(text)
    else:
        print("NO_TEXT_GENERATED", file=sys.stderr)
