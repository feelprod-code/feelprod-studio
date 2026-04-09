import { NextResponse } from 'next/server';
export async function POST(req: Request) {
  try {
    const { messages, manifest, files } = await req.json();

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

    const contentParts: any[] = [{ type: "text", text: prompt }];

    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (file.data && file.mimeType) {
          contentParts.push({
            type: "image_url",
            image_url: {
              url: `data:${file.mimeType};base64,${file.data}`
            }
          });
        }
      }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === "VOTRE_CLEF_ICI") {
      console.error("❌ [OPENROUTER] Erreur : Clé API manquante ou non configurée dans .env.local");
      throw new Error("Clé API OpenRouter non configurée. Vérifiez votre fichier .env.local et redémarrez le serveur.");
    }

    const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        max_tokens: 4000,
        messages: [
          { role: "user", content: contentParts }
        ],
        response_format: { type: "json_object" }
      })
    });

    const openRouterData = await openRouterRes.json();
    let aiText = openRouterData.choices?.[0]?.message?.content || "{}";
    
    // Nettoyage markdown du JSON
    if (aiText.startsWith("```json")) {
      aiText = aiText.replace(/```json\n?/, "").replace(/```$/, "").trim();
    } else if (aiText.startsWith("```")) {
      aiText = aiText.replace(/```\n?/, "").replace(/```$/, "").trim();
    }

    const data = JSON.parse(aiText);

    return NextResponse.json({ success: true, ...data });

  } catch (error: any) {
    console.error("❌ ERREUR API CHAT :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
