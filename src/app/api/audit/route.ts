import { NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';

export async function POST(req: Request) {
  try {
    const { url, inspirationUrl, briefText, file, uploadedFiles } = await req.json();

    let scrapeResult = { markdown: "" };
    
    if (url && url.trim().length > 0) {
      console.log(`🚀 [AUDIT] Scraping de : ${url}`);
      // 1. Scraping avec Firecrawl
      try {
        const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY || "missing_key" });
        const res = await firecrawl.scrape(url.trim(), { formats: ['markdown', 'html'] });
        
        const contentMarkdown = (res as any)?.data?.markdown || (res as any)?.markdown || "";
        const contentHtml = (res as any)?.data?.html || (res as any)?.html || "";
        scrapeResult = { markdown: contentMarkdown + "\n\n--- HTML PARTIEL POUR COULEURS/MEDIAS ---\n\n" + contentHtml.substring(0, 40000) };
        
        if (!scrapeResult.markdown || scrapeResult.markdown.length === 0) {
          console.warn(`Erreur Firecrawl : le contenu est vide. Réponse brute :`, JSON.stringify(res).substring(0, 500));
        }
      } catch(e) {
        console.warn("⚠️ Pas de clé Firecrawl ou erreur :", e);
      }
    } else {
      console.log(`🚀 [AUDIT] Mode "From Scratch" activé. Pas d'URL cible à analyser.`);
    }

    // Scraping optionnel de l'inspiration
    let inspirationMarkdown = "";
    if (inspirationUrl && inspirationUrl.trim().length > 0) {
      console.log(`🔍 [AUDIT] Scraping de l'inspiration : ${inspirationUrl}`);
      try {
        const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY || "missing_key" });
        const inspiResult = await firecrawl.scrape(inspirationUrl.trim(), { formats: ['markdown'] });
        const inspiMD = (inspiResult as any)?.data?.markdown || (inspiResult as any)?.markdown || "";
        if (inspiMD) {
          inspirationMarkdown = inspiMD;
          console.log(`✅ [AUDIT] Inspiration récupérée. Longueur: ${inspiMD.length}`);
        }
      } catch (e) {
        console.warn("⚠️ Impossible de scraper le site d'inspiration :", e);
      }
    }

    console.log(`✅ [AUDIT] Scraping cible terminé. Longueur Markdown : ${scrapeResult.markdown.length} caractères.`);
    console.log(`🧠 [OPENROUTER] Stratégie Visuelle en cours... (Inspirations fournies: ${inspirationUrl ? 'Oui' : 'Non'}, Fichiers Locaux: ${uploadedFiles?.length || 0})`);

    const prompt = `
Tu es le directeur artistique et stratège web "Replicator".
${url ? `Voici le code markdown du SITE CIBLE ACTUEL que le client souhaite refondre :
${scrapeResult.markdown.substring(0, 15000)}` : `L'utilisateur souhaite CREER UN TOUT NOUVEAU SITE de zéro.`}

${inspirationMarkdown ? `\n\nSITE CONCURRENT OU INSPIRATION (à analyser pour calquer la "vibe") :\n${inspirationMarkdown.substring(0, 10000)}` : ''}

${briefText ? `\n\nDIRECTIVES DE LA MARQUE (À RESPECTER ABSOLUMENT) :\n"${briefText}"` : ''}

${file ? `\n\nUN DOCUMENT (IMAGE) AINSI QUE CETTE REQUETE SONT FOURNIS EN PIECE JOINTE. Analyse son identité visuelle, ses couleurs et sa typographie pour t'en inspirer fortement !` : ''}

${uploadedFiles?.length > 0 ? `\n\n📢 IMPORTANT : L'utilisateur a explicitement uploadé les médias physiques ci-dessous pour son projet. Tu DOIS ABSOLUMENT inclure exactement ces chemins locaux dans la partie "media_links" de ta réponse JSON.\nListe des assets uploadés locaux :\n${uploadedFiles.map((f:string) => "- " + f).join('\n')}` : ''}

Ton but n'est PAS de tout détruire, mais de concevoir une stratégie de création web premium.
1. ${url ? `Dresse d'abord le bilan EXHAUSTIF de l'ancien site cible (tu as le markdown et le HTML partiel). Tu DOIS extraire avec une rigueur absolue : le code couleur (hexa), la typographie, TOUS les paragraphes et textes exhaustifs, TOUTES les images (src), TOUTES les vidéos, et la structure exacte des pages.` : `Commence par analyser les inspirations et le brief fourni pour comprendre la direction du projet.`}
2. IMPORTANT: Si des assets uploadés locaux ont été listés ci-dessus, tu dois imperativement les inclure DANS LA LISTE "media_links" de la section "existing_assets".
3. Ensuite, conçois une stratégie ${url ? `de refonte qui CONSERVE TOUT le contenu textuel et médiatique` : `de conception`} avec une amélioration massive de la forme. 
⚠️ TRÉS IMPORTANT : Ne résume pas le contenu de l'URL cible, tu DOIS extraire l'intégrité de l'existant.

Format JSON EXACT requis (et uniquement celà, pas de blabla):
{
  "existing_assets": {
    "color_palette": ["#HexCode1", "#HexCode2", "RGB(...)"],
    "typography": ["Nom de font 1", "Nom de font 2"],
    "pages_content": [
      {
        "page_url_or_name": "Nom de la Page (ex: Accueil, Prestations, etc.)",
        "full_text": "Copie TOUS LES MOTS de cette page, dans l'ordre du flux. Il faut absolument CONSERVER la totalité de l'information (offres, tarifs, adresses, descriptions, éléments clés qui distinguent ce site). Ne fais AUCUN RÉSUMÉ, je veux vraiment tout le contenu brut organisé pour pouvoir le replacer."
      }
    ],
    "strong_texts": ["Texte fort 1", "Slogan 2"],
    "media_links": ["https://site.com/image1.jpg", "https://site.com/video.mp4"],
    "current_vibe": "Description de l'identité visuelle d'origine du site."
  },
  "proposed_strategy": {
    "content_strategy": "Comment on conserve le texte tout en le mettant mieux en valeur",
    "visual_audit": "Analyse des couleurs/design et proposition de Direction Artistique",
    "structure_proposals": "Quel type de mise en page adopter pour moderniser la structure",
    "animation_style": "Propositions d'animations (ex: Scroll reveal, parallax)",
    "image_prompts": [
      "Prompt midjourney 1",
      "Prompt midjourney 2"
    ],
    "vibe_description": "L'angle éditorial et la vibe visuelle du NOUVEAU site (2 phrases max)"
  }
}
`;

    const contentParts: any[] = [{ type: "text", text: prompt }];

    if (file && file.data && file.mimeType) {
      contentParts.push({
        type: "image_url",
        image_url: {
          url: `data:${file.mimeType};base64,${file.data}`
        }
      });
    }

    const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        max_tokens: 8000,
        messages: [
          { role: "user", content: contentParts }
        ],
        response_format: { type: "json_object" }
      })
    });

    const openRouterData = await openRouterRes.json();
    
    if (openRouterData.error) {
      throw new Error(`OpenRouter Error: ${openRouterData.error.message}`);
    }

    let aiText = openRouterData.choices?.[0]?.message?.content || "{}";
    
    // Nettoyage markdown du JSON si l'API l'encapsule dans \`\`\`json ... \`\`\`
    if (aiText.startsWith("\`\`\`json")) {
      aiText = aiText.replace(/\`\`\`json\n?/, "").replace(/\`\`\`$/, "").trim();
    } else if (aiText.startsWith("\`\`\`")) {
      aiText = aiText.replace(/\`\`\`\n?/, "").replace(/\`\`\`$/, "").trim();
    }
    
    const manifest = JSON.parse(aiText);

    console.log(`✅ [GEMINI] Manifeste généré avec succès.`);

    return NextResponse.json({ success: true, manifest });

  } catch (error: any) {
    console.error("❌ ERREUR API AUDIT :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
