import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { messages, manifest } = await req.json();

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Format history
    const historyText = messages.map((m: any) => `${m.role === 'user' ? 'Directeur' : 'Assistant'}: ${m.content}`).join("\n");

    const prompt = `
Tu es l'Assistant "DeepSync", spécialisé dans la direction artistique web.
Voici le Manifeste Visual actuel du site :
${JSON.stringify(manifest, null, 2)}

Voici l'historique de la conversation :
${historyText}

Ton but est de :
1. Répondre au dernier message de l'utilisateur (le Directeur) de manière concise, pro et très technique (esthétique "Cinematic Tech"). Parle à la première personne comme un copilote.
2. Mettre à jour le Manifeste SI l'utilisateur a demandé un tel changement (ex: changer le style d'animation, la structure, ou la stratégie de contenu). Sinon, garde les valeurs actuelles.

Format JSON EXACT requis (strictement un objet JSON valide, sans bloc markdown) :
{
  "reply": "Ta réponse d'assistant face au retour du directeur",
  "updated_manifest": {
    "content_strategy": "...",
    "visual_audit": "...",
    "structure_proposals": "...",
    "animation_style": "...",
    "image_prompts": ["...", "..."],
    "vibe_description": "..."
  }
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    let aiText = response.text || "{}";
    const data = JSON.parse(aiText);

    return NextResponse.json({ success: true, ...data });

  } catch (error: any) {
    console.error("❌ ERREUR API CHAT :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
