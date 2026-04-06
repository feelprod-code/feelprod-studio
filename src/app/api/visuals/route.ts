import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { prompts } = await req.json();

    if (!prompts || prompts.length === 0) {
      return NextResponse.json({ error: "Aucun prompt fourni" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const results = [];

    // On génère image par image pour éviter le rate limit simultané
    for (const promptText of prompts.slice(0, 2)) { // On limite à 2 images max
      console.log(`🖼️ [IMAGEN] Génération de l'image pour : ${promptText}`);
      const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-001',
        prompt: promptText,
        config: {
          numberOfImages: 1,
          aspectRatio: "16:9"
        }
      });

      const imageBase64 = response.generatedImages?.[0]?.image?.imageBytes;
      if (imageBase64) {
        results.push(`data:image/jpeg;base64,${imageBase64}`);
      }
    }

    console.log(`✅ [IMAGEN] Images générées : ${results.length}`);
    return NextResponse.json({ success: true, images: results });

  } catch (error: any) {
    console.error("❌ ERREUR API VISUALS :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
