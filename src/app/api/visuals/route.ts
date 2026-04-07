import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompts } = await req.json();

    if (!prompts || prompts.length === 0) {
      return NextResponse.json({ error: "Aucun prompt fourni" }, { status: 400 });
    }

    const results = [];

    // On génère 2 images de très haute volée (Studio Visuel - Nano Banana 2 / Flux Engine)
    for (const promptText of prompts.slice(0, 2)) {
      console.log(`🍌 [NANO BANANA 2] Génération de l'image pour : ${promptText}`);
      
      // On encode proprement le prompt
      const encodedPrompt = encodeURIComponent(promptText + " cinematic, highly detailed, premium design, 8k resolution");
      const seed = Math.floor(Math.random() * 1000000);
      
      // On tape dans le moteur Pollinations.ai (FLUX) parfait pour le prototypage ultra haute def
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${seed}`;
      
      results.push(imageUrl);
    }

    console.log(`✅ [NANO BANANA 2] Images générées : ${results.length}`);
    return NextResponse.json({ success: true, images: results });

  } catch (error: any) {
    console.error("❌ ERREUR API VISUALS :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
