import { NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';

export async function POST(req: Request) {
  try {
    const { url, inspirationUrl, briefText, file, uploadedFiles } = await req.json();

    let scrapeResult = { markdown: "" };
    
    if (url && url.trim().length > 0) {
      console.log(`🚀 [AUDIT] Scraping de : ${url}`);
      // 1. Scraping avec Firecrawl (Mode Crawl Intégral : A to Z)
      try {
        const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY || "missing_key" });
        // Lancement de l'aspiration intégrale (jusqu'à 12 pages pour éviter les timeouts excessifs, mais suffisant pour capter l'ADN global)
        const res = await (firecrawl as any).crawl(url.trim(), { 
          limit: 12, 
          scrapeOptions: { formats: ['markdown', 'html'] } 
        });
        
        if (res && res.success && res.data && Array.isArray(res.data)) {
           let allMd = "";
           let allHtml = "";
           
           for (const page of res.data) {
              const md = page.markdown || "";
              const html = page.html || "";
              const source = page.metadata?.sourceURL || url;
              
              allMd += `\n\n--- SUITE DU CONTENU WEB (Source de la sous-page : ${source}) ---\n\n${md}`;
              allHtml += `\n\n--- HTML PARTIEL (Source: ${source}) ---\n\n${html.substring(0, 3000)}`;
           }
           
           scrapeResult = { markdown: allMd + "\n\n--- COMPILATION DU HTML PARTIEL ---\n\n" + allHtml.substring(0, 30000) };
           console.log(`✅ [AUDIT] Crawl intégral réussi : ${res.data.length} pages aspirées.`);
        } else {
           console.warn(`Erreur Firecrawl Crawl : le format de retour est inattendu. Réponse brute :`, JSON.stringify(res).substring(0, 500));
           throw new Error(res.error || "Aspiration Firecrawl échouée (Clé invalide, crédit épuisé, ou Site bloqué).");
        }
      } catch(e: any) {
        console.warn("⚠️ Erreur silencieuse d'aspiration Firecrawl interceptée :", e);
        throw new Error(e.message?.includes("token") ? "Clé API Firecrawl Invalide ou Expirée." : "Aspiration Firecrawl échouée : " + e.message);
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
1. ${url ? `Dresse d'abord le bilan EXHAUSTIF de TOUTES LES PAGES ASPIRÉES (tu as le markdown de multiples URLs). Tu DOIS extraire avec une rigueur absolue : le code couleur (hexa), la typographie, TOUS les paragraphes et textes exhasutifs de TOUTES LES SOUS-PAGES, TOUTES les images (src), TOUTES les vidéos, et la structure exacte de l'arborescence.` : `Commence par analyser les inspirations et le brief fourni pour comprendre la direction du projet.`}
2. IMPORTANT: Si des assets uploadés locaux ont été listés ci-dessus, tu dois imperativement les inclure DANS LA LISTE "media_links" de la section "existing_assets".
3. Ensuite, conçois une stratégie ${url ? `de refonte qui CONSERVE TOUT le contenu textuel et médiatique` : `de conception`} avec une amélioration massive de la forme.
4. INDISPENSABLE: Puisque nous construisons une application web complexe, tu DOIS analyser les besoins en interface utilisateur. Si le contenu comporte des galeries, des listes d'avantages, des tarifs multiples, un agenda de réservation, ou de longues FAQ, tu DOIS IMPÉRATIVEMENT recommander la création de composants spécifiques dans \`structure_proposals\` (ex: Diaporamas / Carrousels, Système d'Onglets, Formulaires Avancés, Accordéons, Cartes Interactives).

⚠️ TRÉS IMPORTANT : Ne résume pas le contenu de l'URL cible, tu DOIS extraire l'intégrité de toutes les sous-pages aspirées.

Format JSON EXACT requis (et uniquement celà, pas de blabla):
{
  "existing_assets": {
    "color_palette": ["#HexCode1", "#HexCode2", "RGB(...)"],
    "typography": ["Nom de font 1", "Nom de font 2"],
    "pages_content": [
      {
        "page_url_or_name": "Nom de la Page (ex: Accueil, Prestations, Tarifs, Média, Agenda, etc.)",
        "full_text": "Copie TOUS LES MOTS de cette sous-page spécifique. CONSERVER la totalité de l'information (offres, tarifs, adresses, agenda). Ne fais AUCUN RÉSUMÉ, je veux vraiment tout le contenu brut organisé."
      }
    ],
    "strong_texts": ["Texte fort 1", "Slogan 2"],
    "media_links": ["https://site.com/image1.jpg", "https://site.com/video.mp4"],
    "current_vibe": "Description de l'identité visuelle d'origine du site."
  },
  "proposed_strategy": {
    "content_strategy": "Comment on conserve les textes/agendas/dates tout en le mettant mieux en valeur",
    "visual_audit": "Analyse des couleurs/design et proposition de Direction Artistique",
    "structure_proposals": "Arborescence multi-pages et DÉTECTION DE COMPOSANTS SPÉCIAUX OBLIGATOIRES (ex: 'Un Carrousel pour les photos du cabinet, un composant Onglets pour les Tarifs, et un Formulaire Avancé pour l'Agenda'). C'est vital ! Spécifie ce qu'il faut construire.",
    "animation_style": "Propositions d'animations (ex: Scroll reveal, parallax)",
    "image_prompts": [
      "Prompt midjourney 1"
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
