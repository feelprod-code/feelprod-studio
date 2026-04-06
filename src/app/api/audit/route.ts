import { NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { url, inspirationUrl, briefText, file } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "L'URL cible est requise." }, { status: 400 });
    }

    console.log(`🚀 [AUDIT] Scraping de : ${url}`);
    
    // 1. Scraping avec Firecrawl
    const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
    const scrapeResult = await firecrawl.scrape(url, { formats: ['markdown'] });
    
    if (!scrapeResult || !scrapeResult.markdown) {
      throw new Error(`Erreur Firecrawl : le scraping a échoué ou le contenu est vide.`);
    }

    // Scraping optionnel de l'inspiration
    let inspirationMarkdown = "";
    if (inspirationUrl) {
      console.log(`🔍 [AUDIT] Scraping de l'inspiration : ${inspirationUrl}`);
      try {
        const inspiResult = await firecrawl.scrape(inspirationUrl, { formats: ['markdown'] });
        if (inspiResult && inspiResult.markdown) {
          inspirationMarkdown = inspiResult.markdown;
          console.log(`✅ [AUDIT] Inspiration récupérée.`);
        }
      } catch (e) {
        console.warn("⚠️ Impossible de scraper le site d'inspiration :", e);
      }
    }

    console.log(`✅ [AUDIT] Scraping cible terminé. Longueur Markdown : ${scrapeResult.markdown.length} caractères.`);
    console.log(`🧠 [GEMINI] Stratégie Visuelle en cours... (Inspirations fournies: ${inspirationUrl ? 'Oui' : 'Non'}, Fichier: ${file ? 'Oui' : 'Non'})`);

    // 2. Analyse avec le SDK Officiel Google Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `
Tu es le directeur artistique et stratège web "Replicator".
Voici le code markdown du SITE CIBLE ACTUEL :
${scrapeResult.markdown.substring(0, 15000)}

${inspirationMarkdown ? `\n\nSITE CONCURRENT OU INSPIRATION (à analyser pour calquer la "vibe") :\n${inspirationMarkdown.substring(0, 10000)}` : ''}

${briefText ? `\n\nDIRECTIVES DE LA MARQUE (À RESPECTER ABSOLUMENT) :\n"${briefText}"` : ''}

${file ? `\n\nUN DOCUMENT (PDF ou IMAGE) AINSI QUE CETTE REQUETE SONT FOURNIS EN PIECE JOINTE. Analyse son identité visuelle, ses couleurs et sa typographie pour t'en inspirer fortement !` : ''}

Ton but n'est PAS de tout détruire, mais d'effectuer un AUDIT approfondi en vue d'une refonte premium.
1. Dresse d'abord le bilan exhaustif des assets existants du site cible (conserve littéralement ses paragraphes percutants, ses liens d'images, et ses slogans). Extraits du markdown tout ce dont tu disposes.
2. Ensuite, conçois une stratégie de refonte qui CONSERVE ce contenu informationnel tout en proposant une amélioration massive de la forme. 
⚠️ TRÉS IMPORTANT : Si un fichier, un brief ou une URL d'inspiration t'ont été fournis ci-dessus, ta proposition de Design et d'Ambiance DOIT obligatoirement s'aligner sur ces sources d'inspiration en priorité.

Format JSON EXACT requis (et uniquement celà, pas de blabla):
{
  "existing_assets": {
    "strong_texts": ["Texte fort 1 extrait", "Paragraphe clé 2 complet", "Slogan 3"],
    "media_links": ["https://site.com/image.jpg", "https://youtube.com/embed/vid"],
    "current_vibe": "Description courte (2 phrases) de l'identité visuelle d'origine du site (couleurs, typo, ambiance globale)"
  },
  "proposed_strategy": {
    "content_strategy": "Comment on conserve le texte tout en le mettant mieux en valeur",
    "visual_audit": "Analyse des couleurs/design et proposition de Direction Artistique (en intégrant les inspirations fournies)",
    "structure_proposals": "Quel type de mise en page adopter pour moderniser la structure",
    "animation_style": "Propositions d'animations (ex: Scroll reveal, parallax, transitions fluides)",
    "image_prompts": [
      "Description parfaite au format Midjourney d'une image premium à générer pour remplacer un média existant",
      "Description parfaite d'une seconde image pertinente"
    ],
    "vibe_description": "L'angle éditorial et la vibe visuelle du NOUVEAU site (2 phrases max)"
  }
}
`;

    const parts: any[] = [{ text: prompt }];

    if (file && file.data && file.mimeType) {
      parts.push({
        inlineData: {
          data: file.data,
          mimeType: file.mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: parts,
      config: {
        responseMimeType: 'application/json'
      }
    });

    let aiText = response.text || "{}";
    const manifest = JSON.parse(aiText);

    console.log(`✅ [GEMINI] Manifeste généré avec succès.`);

    return NextResponse.json({ success: true, manifest });

  } catch (error: any) {
    console.error("❌ ERREUR API AUDIT :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
