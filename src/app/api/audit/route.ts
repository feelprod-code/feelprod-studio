import { NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import { jsonrepair } from 'jsonrepair';

export async function POST(req: Request) {
  try {
    const { url, inspirationUrl, briefText, contextFiles, uploadedFiles } = await req.json();

    let scrapeResult = { markdown: "" };
    
    if (url && url.trim().length > 0) {
      console.log(`🚀 [AUDIT] Scraping de : ${url}`);
      
      const firecrawlKey = process.env.FIRECRAWL_API_KEY;
      if (!firecrawlKey || firecrawlKey === "VOTRE_CLEF_ICI" || firecrawlKey === "missing_key") {
        console.warn("⚠️ [AUDIT] Firecrawl Key manquante ou invalide. Le scraping sera ignoré.");
      } else {
        try {
          const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });
          let targetUrl = url.trim();
          if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = `https://${targetUrl}`;
          }
          
          let res: any = null;
          try {
            // Dans le nouveau SDK, crawl() peut nécessiter asyncCrawlUrl ou bloquer avec crawlUrl
            res = await (firecrawl as any).crawl(targetUrl, { 
              limit: 12, 
              scrapeOptions: { formats: ['markdown', 'html'] } 
            });
            
            // Si le SDK est une version récente, il pourrait exposer crawlUrl
            if (!res || (res.success === false && typeof (firecrawl as any).crawlUrl === 'function')) {
              res = await (firecrawl as any).crawlUrl(targetUrl, { limit: 12, scrapeOptions: { formats: ['markdown', 'html'] } });
            }
          } catch (e) {
            console.warn("⚠️ [AUDIT] Erreur lors du crawl intégral, tentative de fallback sur scrape simple...", e);
          }
          
          if (res && (res.success === true || res.status === 'completed') && res.data && Array.isArray(res.data) && res.data.length > 0) {
             let allMd = "";
             let allHtml = "";
             
             for (const page of res.data) {
                const md = page.markdown || "";
                const html = page.html || "";
                const source = page.metadata?.sourceURL || targetUrl;
                
                allMd += `\n\n--- SUITE DU CONTENU WEB (Source de la sous-page : ${source}) ---\n\n${md}`;
                allHtml += `\n\n--- HTML PARTIEL (Source: ${source}) ---\n\n${html.substring(0, 3000)}`;
             }
             
             scrapeResult = { markdown: allMd + "\n\n--- COMPILATION DU HTML PARTIEL ---\n\n" + allHtml.substring(0, 30000) };
             console.log(`✅ [AUDIT] Crawl intégral réussi : ${res.data.length} pages aspirées.`);
          } else {
             console.warn(`⚠️ [AUDIT] Le Crawl a retourné 0 page ou un statut inattendu. Lancement du fallback Scrape direct sur ${targetUrl}...`);
             // Fallback ultra-robuste: On scrape au moins la page principale
             const fallbackRes = await (firecrawl as any).scrape(targetUrl, { formats: ['markdown'] });
             if (fallbackRes && fallbackRes.success !== false) {
                const fallbackMd = (fallbackRes as any).data?.markdown || (fallbackRes as any).markdown || "";
                if (fallbackMd) {
                  scrapeResult = { markdown: `\n\n--- CONTENU PRINCIPAL (Scrape de Secours) ---\n\n${fallbackMd}` };
                  console.log(`✅ [AUDIT] Scrape de secours réussi sur la page principale.`);
                } else {
                  throw new Error("L'Aspiration de la page principale a retourné un contenu vide.");
                }
             } else {
                throw new Error("Aspiration Firecrawl échouée (Clé invalide, crédit épuisé, ou Site anti-bot).");
             }
          }
        } catch(e: any) {
          console.warn("⚠️ Erreur silencieuse d'aspiration Firecrawl interceptée :", e);
          throw new Error(e.message?.includes("token") ? "Clé API Firecrawl Invalide ou Expirée." : "Aspiration Firecrawl échouée : " + e.message);
        }
      }
    } else {
      console.log(`🚀 [AUDIT] Mode "From Scratch" activé. Pas d'URL cible à analyser.`);
    }

    // Scraping optionnel de l'inspiration
    let inspirationMarkdown = "";
    if (inspirationUrl && inspirationUrl.trim().length > 0) {
      const firecrawlKey = process.env.FIRECRAWL_API_KEY;
      if (firecrawlKey && firecrawlKey !== "VOTRE_CLEF_ICI" && firecrawlKey !== "missing_key") {
        console.log(`🔍 [AUDIT] Scraping de l'inspiration : ${inspirationUrl}`);
        try {
          const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });
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
    }

    console.log(`✅ [AUDIT] Scraping terminé.`);
    console.log(`🧠 [OPENROUTER] Stratégie Visuelle... (Photos: ${contextFiles?.length || 0}, Assets: ${uploadedFiles?.length || 0})`);

    const prompt = `
Tu es le directeur artistique et stratège web "Replicator".
${url ? `Voici le code markdown du SITE CIBLE ACTUEL que le client souhaite refondre :
${scrapeResult.markdown.substring(0, 15000)}` : `L'utilisateur souhaite CREER UN TOUT NOUVEAU SITE de zéro.`}

${inspirationMarkdown ? `\n\nSITE CONCURRENT OU INSPIRATION (à analyser pour calquer la "vibe") :\n${inspirationMarkdown.substring(0, 10000)}` : ''}

${briefText ? `\n\nDIRECTIVES DE LA MARQUE (À RESPECTER ABSOLUMENT) :\n"${briefText}"` : ''}

${contextFiles?.length > 0 ? `\n\nDES DOCUMENTS (IMAGES/PDF) ONT ÉTÉ FOURNIS EN PIÈCES JOINTES. Analyse ces identités visuelles pour t'en inspirer !` : ''}

${uploadedFiles?.length > 0 ? `\n\n📢 IMPORTANT : L'utilisateur a uploadé ces médias locaux. Tu DOIS les inclure dans "media_links" :\n${uploadedFiles.map((f:string) => "- " + f).join('\n')}` : ''}

Ton but n'est PAS de tout détruire, mais de concevoir une stratégie de création web premium.
1. ${url ? `Dresse d'abord le bilan EXHAUSTIF de TOUTES LES PAGES ASPIRÉES (tu as le markdown de multiples URLs). Tu DOIS extraire avec une rigueur absolue : le code couleur (hexa), la typographie, TOUS les paragraphes et textes exhasutifs de TOUTES LES SOUS-PAGES, TOUTES les images (src), TOUTES les vidéos, et la structure exacte de l'arborescence.` : `Commence par analyser les inspirations et le brief fourni pour comprendre la direction du projet.`}
2. IMPORTANT: Si des assets uploadés locaux ont été listés ci-dessus, tu dois imperativement les inclure DANS LA LISTE "media_links" de la section "existing_assets".
3. Ensuite, conçois une stratégie ${url ? `de refonte qui CONSERVE TOUT le contenu textuel et médiatique` : `de conception`} avec une amélioration massive de la forme.
4. INDISPENSABLE: Puisque nous construisons une application web complexe, tu DOIS analyser les besoins en interface utilisateur. Si le contenu comporte des galeries, des listes d'avantages, des tarifs multiples, un agenda de réservation, ou de longues FAQ, tu DOIS IMPÉRATIVEMENT recommander la création de composants spécifiques dans \`structure_proposals\` (ex: Diaporamas / Carrousels, Système d'Onglets, Formulaires Avancés, Accordéons, Cartes Interactives).

⚠️ TRÉS IMPORTANT : Ne résume pas le contenu de l'URL cible, tu DOIS extraire l'intégrité de toutes les sous-pages.
⚠️ SÉCURITÉ JSON : Tu DOIS OBLIGATOIREMENT échapper tous les guillemets (") avec un antislash (\") à l'intérieur de tes textes sous peine de casser le parseur JSON. Évite les retours à la ligne litéraux dans les valeurs textuelles, utilise \n !

Format JSON EXACT (aucun texte en dehors) :
{
  "proposed_strategy": {
    "content_strategy": "...",
    "visual_audit": "...",
    "structure_proposals": "...",
    "animation_style": "...",
    "image_prompts": ["Prompt"],
    "vibe_description": "..."
  },
  "existing_assets": {
    "color_palette": ["#HexCode"],
    "typography": ["Nom"],
    "strong_texts": ["Texte"],
    "media_links": ["/uploads/..."],
    "current_vibe": "...",
    "pages_content": [{"page_url_or_name": "Accueil", "full_text": "..."}]
  }
}
`;

    const contentParts: any[] = [{ type: "text", text: prompt }];

    if (contextFiles && Array.isArray(contextFiles)) {
      for (const f of contextFiles) {
        if (f.data && f.mimeType) {
          contentParts.push({
            type: "image_url",
            image_url: { url: `data:${f.mimeType};base64,${f.data}` }
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
    
    let manifest;
    try {
      // jsonrepair corrige magiquement les JSON tronqués, les guillemets non échappés et les virgules manquantes !
      const repairedJson = jsonrepair(aiText);
      manifest = JSON.parse(repairedJson);
    } catch (e: any) {
      console.warn("⚠️ jsonrepair a échoué. Le texte IA n'était définitivement pas réparable.", e);
      throw new Error("L'IA a généré un JSON illisible ou a été coupée trop tôt. Erreur: " + e.message);
    }

    console.log(`✅ [GEMINI] Manifeste généré avec succès.`);

    return NextResponse.json({ success: true, manifest });

  } catch (error: any) {
    console.error("❌ ERREUR API AUDIT :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
