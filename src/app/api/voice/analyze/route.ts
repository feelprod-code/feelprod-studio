import { NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const DEFAULT_GEMINI_KEY = "AIzaSyAcJza4iBZmoakvpElqCex2jWU1R_Nvfmk";

export async function POST(req: Request) {
  try {
    const clientKey = req.headers.get('x-gemini-key') || '';
    const body = await req.json();
    const { transcript, format = 'synthese', title = 'Dictée Vocale FeelProd', apiKey: bodyKey } = body;

    const apiKey = bodyKey || clientKey || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;

    if (!transcript || transcript.trim().length < 5) {
      return NextResponse.json({ error: "Transcription vide ou trop courte pour être analysée." }, { status: 400 });
    }

    let prompt = "";

    switch (format) {
      case 'fiche_clinique':
        prompt = `À partir de la transcription suivante, génère une **Fiche Clinique Ostéopathique & TDT** structurée, sobre et prête pour le dossier patient de Guillaume Philippe :
Structure demandée en Markdown :
# 🩺 Fiche Clinique Ostéopathique — ${title}
- **Date & Heure :** ${new Date().toLocaleDateString('fr-FR')}
- **Praticien :** Guillaume Philippe (Ostéopathe D.O. • TDT)

### 1. 📌 Motif de Consultation & Anamnèse
(Historique, plaintes fonctionnelles, antécédents pertinents, ressentis exprimés)

### 2. 🔍 Bilan Tissulaire & Palpatoire
(Tensions fasciales, densité, asymétries, motilité crânio-sacrée, restrictions de mobilité)

### 3. 🎯 Dysfonctions & Fulcrums Identifiés
(Structurel, viscéral, crânio-dural, composante somato-émotionnelle si mentionnée)

### 4. 👐 Traitement Effectué & Techniques Appliquées
(Libération des tensions, rééquilibration des axes, normalisation du fluide/MRP)

### 5. 💡 Recommandations & Suivi Patient
(Conseils posturaux, hygiène de vie, délai avant prochaine séance éventuelle)

---
Transcription source :
${transcript}`;
        break;

      case 'actions':
        prompt = `À partir de la transcription suivante, extrais une **Liste d'Actions Concrètes & Décisions** pour FeelProd / le cabinet :
Structure demandée :
# 🎯 Plan d'Action & Prochaines Étapes
### 🚀 Actions Immédiates (Priorité Haute)
- [ ] Action 1
### 📅 Tâches à Moyen Terme
- [ ] Action 2
### 📌 Décisions Clés & Notes à Retenir
- Note 1

---
Transcription source :
${transcript}`;
        break;

      case 'email':
        prompt = `À partir de la transcription suivante, rédige un **Email / Compte-Rendu Professionnel** clair, poli et chaleureux (style FeelProd / Guillaume Philippe) prêt à être envoyé par mail ou WhatsApp :
---
Transcription source :
${transcript}`;
        break;

      case 'synthese':
      default:
        prompt = `À partir de la transcription suivante, rédige une **Synthèse Stratégique & Résumé Exécutif** clair, élégant et percutant :
Structure demandée :
# 📑 Synthèse & Points Clés — ${title}

### 💡 L'Essentiel en 3 Lignes
(Synthèse ultra-rapide des points cardinaux)

### 🔑 Thématiques Développées
(Explication structurée avec puces explicatives)

### 🌟 Conclusion & Perspectives
(Ouverture ou résultat attendu)

---
Transcription source :
${transcript}`;
        break;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Erreur analyse Gemini (${response.status}) : ${err}` }, { status: response.status });
    }

    const data = await response.json();
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    return NextResponse.json({
      success: true,
      analysis: result,
      format,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Analyze route error:", error);
    return NextResponse.json({ error: error.message || "Erreur interne" }, { status: 500 });
  }
}
