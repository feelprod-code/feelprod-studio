import { NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const DEFAULT_GEMINI_KEY = "AIzaSyAcJza4iBZmoakvpElqCex2jWU1R_Nvfmk";

export async function POST(req: Request) {
  try {
    let clientKey = req.headers.get('x-gemini-key') || '';
    let audioBuffer: Buffer | null = null;
    let mimeType = 'audio/mp4';
    let mode = 'dictee';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      mode = (formData.get('mode') as string) || 'dictee';
      const formKey = formData.get('apiKey') as string | null;
      if (formKey) clientKey = formKey;
      
      if (!file) {
        return NextResponse.json({ error: "Aucun fichier audio reçu." }, { status: 400 });
      }
      const arrayBuffer = await file.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
      mimeType = file.type || 'audio/mp4';
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      if (body.apiKey) clientKey = body.apiKey;
      if (!body.audioBase64) {
        return NextResponse.json({ error: "Données audioBase64 manquantes." }, { status: 400 });
      }
      audioBuffer = Buffer.from(body.audioBase64, 'base64');
      mimeType = body.mimeType || 'audio/mp4';
      mode = body.mode || 'dictee';
    } else {
      const arrayBuffer = await req.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
      mimeType = contentType || 'audio/mp4';
    }

    const apiKey = clientKey || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé GEMINI_API_KEY non configurée." }, { status: 500 });
    }

    if (!audioBuffer || audioBuffer.length < 500) {
      return NextResponse.json({ error: "Enregistrement audio trop court ou vide." }, { status: 400 });
    }

    // Normalisation MIME type pour Gemini
    let geminiMime = mimeType.split(';')[0].trim().toLowerCase();
    if (geminiMime === 'audio/x-m4a' || geminiMime === 'audio/m4a') geminiMime = 'audio/mp4';
    if (geminiMime === 'audio/webm' || geminiMime === 'video/webm') geminiMime = 'audio/webm';
    if (!['audio/mp4', 'audio/webm', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/aac'].includes(geminiMime)) {
      geminiMime = 'audio/mp4';
    }

    const base64Audio = audioBuffer.toString('base64');

    let modeInstruction = "";
    if (mode === "consultation") {
      modeInstruction = "Mode Consultation / Dialogue : Sépare clairement les répliques sous le format 'Guillaume (Praticien) : ...' et 'Patient : ...'. Structure les éléments cliniques (anamnèse, motifs de douleur, réactions aux tests tissulaires).";
    } else if (mode === "synthese") {
      modeInstruction = "Mode Synthèse Structurée : Transcris fidèlement tout en ordonnant les idées par grands thèmes avec des sous-titres clairs et des puces bien définies.";
    } else if (mode === "podcast") {
      modeInstruction = "Mode Podcast & Réflexion : Transcris dans un style naturel, fluide, chaleureux et percutant, fidèle au ton de voix FeelProd de Guillaume Philippe.";
    } else {
      modeInstruction = "Mode Dictée Rapide : Transcris mot à mot avec ponctuation rigoureuse, suppression des hésitations orales (euh, hum, etc.) et fluidité maximale.";
    }

    const prompt = `Tu es l'assistant vocal officiel de FeelProd et du cabinet d'ostéopathie / TDT de Guillaume Philippe.
Transcris fidèlement et impeccablement l'audio ci-joint.

Instructions contextuelles :
${modeInstruction}

Règles d'or orthographiques & cliniques :
1. Orthographe stricte : FeelProd (avec deux E majuscules), Antigravity, TDT (Thérapie Dynamique Tissulaire).
2. Vocabulaire ostéopathique & anatomique de référence :
   - Sutherland, Blechschmidt, Rollin Becker, Viola Frymann, Still, Magoun, Jealous, Fulford.
   - SSB, synchondrose sphéno-basilaire, sphéno-basilaire, MRP, dural, fascia, lemniscate, motilité, motricité, biodynamique.
   - Liquide cérébro-spinal (LCS / LCR), méninge, faux du cerveau, tente du cervelet, occiput, sacrum, sphénoïde, ethmoïde, temporal, pariétal, frontal, vomer, maxillaire, mandibule, ATM, ptérygoïde, fulcrum, somato-émotionnel, neutre tissulaire.
3. Ponctuation et mise en page :
   - Insère les points, virgules, points d'interrogation et sauts de ligne appropriés.
   - Supprime les hésitations (euh, hum, bah).
4. Renvoie UNIQUEMENT le texte retranscrit et nettoyé, sans commentaires superflus avant ou après.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiPayload = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: geminiMime,
              data: base64Audio
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API Error:", response.status, errText);
      return NextResponse.json(
        { error: `Erreur Gemini API (${response.status}) : ${errText.slice(0, 200)}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const transcript = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    const wordCount = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0;

    return NextResponse.json({
      success: true,
      transcript,
      wordCount,
      mimeType: geminiMime,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Transcribe route error:", error);
    return NextResponse.json({ error: error.message || "Erreur interne serveur" }, { status: 500 });
  }
}
