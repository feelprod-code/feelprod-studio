"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Wand2, Settings2, Code2, CheckCircle2, Activity, X, Send, Bot, User, Flame, ChevronDown, ChevronUp, Upload, File, Compass, Layers, Smartphone, Tablet, Monitor, Mic, MicOff, Loader2 } from "lucide-react";

type Stage = "idle" | "extracting" | "audit" | "visuals" | "vibe-check" | "builder" | "done";

const ImageWithLoader = ({ src, alt }: { src: string, alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full aspect-video bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
      {!loaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
          <Loader2 className="w-8 h-8 animate-spin text-accent-cyan mb-4" />
          <p className="text-sm font-mono text-gray-500 uppercase tracking-widest leading-relaxed">Création de l'image en cours...</p>
          <p className="text-xs text-gray-400 mt-2 font-mono">(Flux Engine tourne à plein régime, 5 à 15 sec approx.)</p>
        </div>
      )}
      {error && (
         <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-gray-50 text-gray-600 border border-red-200">
           <p className="text-sm font-mono uppercase tracking-widest text-red-400 mb-2">Erreur Serveur (Images bloquées)</p>
           <p className="text-xs">Pas de panique, ce n'est qu'une option d'illustration. Tu peux ignorer cette erreur et scroller vers le bas pour cliquer sur <strong>Valider & Bâtir l'Interface</strong> afin de concevoir le site web !</p>
         </div>
      )}
      <motion.img 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: loaded ? 1 : 0, scale: loaded ? 1 : 0.95 }}
        transition={{ duration: 0.5 }}
        src={src} 
        alt={alt} 
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className="absolute inset-0 w-full h-full object-cover shadow-sm"
      />
    </div>
  );
};

export default function FeelProdStudioDashboard() {
  const [mounted, setMounted] = useState(false);
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [manifest, setManifest] = useState<any>(null);
  
  useEffect(() => setMounted(true), []);
  const [manifestTab, setManifestTab] = useState<"existant" | "proposition">("existant");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [builderOption, setBuilderOption] = useState<"fast" | "deep" | null>(null);
  const [copied, setCopied] = useState(false);
  const [deviceType, setDeviceType] = useState<"mobile" | "tablet" | "desktop">("mobile");
  
  // Advanced options
  const [inspirationUrl, setInspirationUrl] = useState("");
  const [briefText, setBriefText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [brandFiles, setBrandFiles] = useState<File[]>([]);
  const [chatFiles, setChatFiles] = useState<File[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: "bot", content: "Vibe Check initialisé. L'objectif est une identité visuelle Cinematic Tech, avec des contrastes audacieux. Doit-on ajuster l'ambiance ou le tone of voice ?" }
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setBrandFiles(prev => [...prev, ...newFiles]);
    }
    e.target.value = '';
  };

  const toggleRecording = () => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La dictée vocale n'est pas supportée par votre navigateur (utilisez Safari, Chrome ou Edge).");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript + " ";
        }
      }
      if (transcript) {
        setBriefText((prev) => (prev ? prev + " " : "") + transcript.trim());
      }
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  const startReplicator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url && !inspirationUrl && !briefText && brandFiles.length === 0) return;
    
    setStage("extracting");
    setErrorMsg(null);
    
    try {
      let uploadedFileUrls: string[] = [];
      let contextFiles: any[] = [];
      
      if (brandFiles.length > 0) {
        // Upload physical files locally
        const formData = new FormData();
        brandFiles.forEach(f => formData.append('files', f));
        
        try {
          console.log(`📤 [UPLOAD] Envoi de ${brandFiles.length} fichiers...`);
          const uploadRes = await fetch('/api/upload', {
             method: 'POST',
             body: formData
          });
          
          if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            throw new Error(`Erreur Upload (${uploadRes.status}): ${errText}`);
          }

          const uploadData = await uploadRes.json();
          if (uploadData.success && uploadData.files) {
             uploadedFileUrls = uploadData.files.map((f:any) => f.url);
             console.log("✅ [UPLOAD] Assets enregistrés :", uploadedFileUrls);
          }
        } catch (uErr: any) {
          console.error("❌ [UPLOAD] Échec :", uErr);
          if (uErr.message.includes("413")) {
            alert("⚠️ Certains fichiers sont trop lourds. Ils ne seront pas tous inclus.");
          }
        }


        // Convert all valid files for Gemini vision analysis context (Images and PDFs)
        const validContextFiles = brandFiles.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
        
        if (validContextFiles.length > 0) {
          contextFiles = await Promise.all(validContextFiles.map(async (f) => {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
              reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            });
            reader.readAsDataURL(f);
            return { data: await base64Promise, mimeType: f.type };
          }));
        }
      }

      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           url, 
           inspirationUrl, 
           briefText, 
           contextFiles,
           uploadedFiles: uploadedFileUrls
        })
      });
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || "L'audit a échoué.");
      }
      
      // Passage au breakpoint de Vibe Check avec les vraies données
      setManifest(data.manifest);
      setChatHistory([
        { role: "bot", content: `Audit terminé ! J'ai analysé la structure, les couleurs et le contenu.\nL'objectif est de préserver ton texte tout en modernisant radicalement la forme. \n\nQue penses-tu des propositions d'animations et de structure affichées ?` }
      ]);
      
      setStage("vibe-check");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Impossible d'analyser cette URL. Vérifie le lien ou réessaie.");
      setStage("idle");
    }
  };

  const approveVibe = async () => {
    setStage("builder");
    setErrorMsg(null);
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    const newHistory = [...chatHistory, { role: "user", content: chatMessage }];
    setChatHistory(newHistory);
    setChatMessage("");
    
    try {
      let preparedFiles: any[] = [];
      let uploadedFileUrls: string[] = [];
      
      if (chatFiles.length > 0) {
        // 1. Upload local des fichiers pour générer des URLs publiques
        const formData = new FormData();
        chatFiles.forEach(f => formData.append('files', f));
        try {
          const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
          const uploadData = await uploadRes.json();
          if (uploadData.success && uploadData.files) {
             uploadedFileUrls = uploadData.files.map((f:any) => f.url);
          }
        } catch (e) {
          console.warn("Upload local échoué dans le chat :", e);
        }

        // 2. Conversion en base64 EXCLUSIVEMENT pour les images (Gemini bloque les JSON énormes pour les vidéos)
        const imageFiles = chatFiles.filter(f => f.type.startsWith('image/'));
        preparedFiles = await Promise.all(imageFiles.map(async (f) => {
          const base64Url = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(f);
          });
          return { data: base64Url.split(',')[1], mimeType: f.type };
        }));
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory, manifest, files: preparedFiles })
      });
      const data = await res.json();
      
      setChatFiles([]); // Reset after send
      
      if (!data.success) {
        throw new Error(data.error || "Erreur de communication avec l'IA.");
      }
      
      // Inject uploaded files URLs directly into the existing_assets
      setManifest((prev: any) => {
        if (!prev) {
          if (data.updated_manifest) return data.updated_manifest;
          return prev;
        }
        
        const merged = { ...prev };
        
        // Append newly uploaded videos/images local URLs to manifest
        if (uploadedFileUrls.length > 0) {
          if (!merged.existing_assets) merged.existing_assets = {};
          merged.existing_assets.media_links = [
            ...(merged.existing_assets.media_links || []),
            ...uploadedFileUrls
          ];
        }

        if (data.updated_manifest && typeof data.updated_manifest === 'object') {
          if (data.updated_manifest.existing_assets) {
            merged.existing_assets = { ...merged.existing_assets, ...data.updated_manifest.existing_assets };
          }
          if (data.updated_manifest.proposed_strategy) {
            merged.proposed_strategy = { ...merged.proposed_strategy, ...data.updated_manifest.proposed_strategy };
          }
        }
        return merged;
      });
      setChatHistory(prev => [...prev, { role: "bot", content: data.reply }]);
    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: "bot", content: `❌ Erreur : ${err.message}` }]);
    }
  };

  const currentStepNum = 
    stage === "idle" ? 0 : 
    stage === "extracting" ? 1 : 
    stage === "audit" ? 1 : 
    stage === "vibe-check" ? 2 : 
    stage === "builder" ? 3 : 4;

  const removeAsset = (type: 'strong_texts' | 'media_links', index: number) => {
    setManifest((prev: any) => {
      const newAssets = { ...prev.existing_assets };
      newAssets[type] = newAssets[type].filter((_: any, i: number) => i !== index);
      return { ...prev, existing_assets: newAssets };
    });
  };

  const getFastPrompt = () => {
    if (!manifest) return "";
    return `[OUTIL VISÉ : STITCH]
Je souhaite prototyper une application avec Stitch (React + Tailwind). Voici le cahier des charges (Project Manifest) :

📌 FORMAT CIBLE PRIORITAIRE : ${deviceType.toUpperCase()} (Design conçu en ${deviceType} first).

1. TEXTES ET MESSAGES CLÉS À CONSERVER :
${manifest.existing_assets?.strong_texts?.map((t: string) => `- ${t}`).join('\n')}

2. MÉDIAS À INTÉGRER :
${manifest.existing_assets?.media_links?.join('\n')}

3. IDENTITÉ VISUELLE ET VIBE (RESPECT STRICT) :
${manifest.proposed_strategy?.visual_audit}
Ambiance : ${manifest.proposed_strategy?.vibe_description}

4. STRUCTURE DU SITE :
${manifest.proposed_strategy?.structure_proposals}

Génère la version MVP de ces écrans avec les meilleurs composants Tailwind.`;
  };

  const getDeepPrompt = () => {
    if (!manifest) return "";
    return `@Antigravity - MISSION DEEP BUILD EXÉCUTIVE

L'utilisateur a validé le manifeste ci-dessous pour la création du site. Ta mission est de lancer le vrai développement en local sur la machine.

📌 APPROCHE RESPONSIVE CIBLE : ${deviceType.toUpperCase()} FIRST. Toute l'intégration et l'UX doivent être pensées prioritairement pour ce support.

RÈGLES IMPÉRATIVES AVANT DE CODER :
1. Lis les composants et règles strictes présents dans mon dossier local \`_MY_AI_DNA/skills\` (Notamment les règles React, Framer Motion, et SEO).
2. Crée un nouveau dossier projet propre (ex: client-site-final).
3. Intègre ce contenu original EXHAUSTIF (ne perds aucune information de la Vibe Check) :
${manifest.existing_assets?.full_content || manifest.existing_assets?.strong_texts?.map((t: string) => `- ${t}`).join('\n')}

4. Médias à intégrer (Vidéos, Images DJI/Sony, etc.) :
${manifest.existing_assets?.media_links?.map((m: string) => `- ${m}`).join('\n') || '- Aucun média fourni, utiliser des placeholders cohérents.'}

5. Applique cette direction artistique orfèvre :
${manifest.proposed_strategy?.visual_audit}
${manifest.proposed_strategy?.vibe_description}

5. Animations et Structure demandées :
${manifest.proposed_strategy?.animation_style}
${manifest.proposed_strategy?.structure_proposals}

Antigravity, confirme que tu as bien pris connaissance du brief et lance ton terminal pour initialiser l'app.`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) return <div className="min-h-screen bg-[#FAF6ED] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;

  return (
    <main className="min-h-screen py-16 px-6 max-w-6xl mx-auto flex flex-col gap-12 text-gray-700">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center shrink-0">
            {/* Custom FeelProd Studio Icon (Record / Focus) */}
            <div className="relative w-8 h-8 rounded-full border-[3px] border-[#1d1d1f] flex items-center justify-center shadow-inner">
              <div className="w-3 h-3 bg-[#FF9F1C] rounded-full animate-pulse" />
              <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-[#FF9F1C] rounded-full" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl tracking-wide uppercase font-[family-name:var(--font-bebas-neue)] text-[#1d1d1f]">FeelProd <span className="text-[#FF9F1C]">Studio</span></h1>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-1">La Forge d'applications • Création & Refonte</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs font-mono bg-panel shadow-sm border border-gray-200 px-4 py-2 rounded-full">
          <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          <span className="text-gray-500">NODE ACTIVE</span>
        </div>
      </header>

      {/* Main Command Center */}
      <section className="bg-panel border border-gray-100 rounded-3xl p-8 md:p-12 relative overflow-hidden backdrop-blur-2xl">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent opacity-50" />
        
        <div className="flex flex-col gap-8 relative z-10">
          <div>
            <h2 className="text-2xl font-light tracking-wide mb-3 uppercase text-gray-500">Point <span className="font-medium text-[#1d1d1f]">De Départ</span></h2>
            <p className="text-gray-400 text-sm font-mono uppercase tracking-wider">Entrez une URL à rafraîchir ou descendez pour créer de zéro via une simple Vibe.</p>
          </div>

          <form onSubmit={startReplicator} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Copy className="w-5 h-5 text-gray-700/20 group-focus-within:text-gray-700 transition-colors" />
              </div>
              <input 
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://votre-site-actuel.com (Optionnel)"
                disabled={stage !== "idle" && stage !== "vibe-check"}
                className="w-full bg-white border-2 border-gray-300 rounded-xl py-5 pl-14 pr-4 font-mono text-sm focus:outline-none focus:border-gray-500 transition-all disabled:opacity-50 shadow-none"
              />
            </div>
            
            <button 
              type="submit"
              disabled={(!url && !inspirationUrl && !briefText && brandFiles.length === 0) || (stage !== "idle" && stage !== "vibe-check")}
              className={`text-white px-10 rounded-2xl font-[family-name:var(--font-bebas-neue)] tracking-wider text-xl transition-all flex items-center justify-center min-w-[220px] shadow-lg ${
                (!url && !inspirationUrl && !briefText && brandFiles.length === 0) ? "opacity-50" : (stage !== "idle" && stage !== "vibe-check" ? "opacity-90 cursor-not-allowed" : "")
              } ${
                (stage === 'builder' || stage === 'done') ? 'bg-[#5A9C51] hover:opacity-90' : 'bg-gradient-to-r from-[#FF9F1C] to-[#E3651F] hover:opacity-90'
              }`}
            >
              {stage === "idle" ? "LANCER LE MOTEUR" 
               : stage === "extracting" ? <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> EXTRACTION...</span> 
               : (stage === "builder" || stage === "done") ? <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> TERMINÉ</span> 
               : <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> PROCESSING...</span>}
            </button>
          </form>
          
          {/* Section Avancée (Accordéon) */}
          <div className="mt-6">
            <button 
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors text-sm font-medium mx-auto bg-gray-50 px-6 py-2 rounded-full border border-gray-100"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Paramètres Avancés (Inspirations & Directives)
            </button>
            
            <AnimatePresence>
              {showAdvanced && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    {/* Colonne 1 : Inspiration */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-mono text-gray-400 mb-2 uppercase tracking-wide">URL d'inspiration globale</label>
                        <div className="relative">
                          <Compass className="absolute left-4 top-3.5 w-4 h-4 text-gray-300" />
                          <input 
                            type="url" 
                            value={inspirationUrl}
                            onChange={e => setInspirationUrl(e.target.value)}
                            placeholder="https://site-concurrent-premium.com"
                            className="bg-white border-2 border-gray-300 rounded-xl py-3 pl-12 pr-4 text-sm text-gray-700 w-full focus:outline-none focus:border-gray-500 transition-colors shadow-none"
                          />
                        </div>
                        {/* Quick Inspiration Links */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono self-center mr-1">Sources :</span>
                          <a href="https://godly.website/" target="_blank" rel="noreferrer" className="text-[10px] uppercase font-bold bg-gray-50 hover:bg-gray-100 text-gray-600 px-2 py-1 rounded-md transition-colors border border-gray-200 shadow-sm">
                            Godly
                          </a>
                          <a href="https://dribbble.com/" target="_blank" rel="noreferrer" className="text-[10px] uppercase font-bold bg-gray-50 hover:bg-gray-100 text-gray-600 px-2 py-1 rounded-md transition-colors border border-gray-200 shadow-sm">
                            Dribbble
                          </a>
                          <a href="https://pinterest.com/search/pins/?q=web%20design" target="_blank" rel="noreferrer" className="text-[10px] uppercase font-bold bg-gray-50 hover:bg-gray-100 text-gray-600 px-2 py-1 rounded-md transition-colors border border-gray-200 shadow-sm">
                            Pinterest
                          </a>
                          <a href="https://21st.dev/" target="_blank" rel="noreferrer" className="text-[10px] uppercase font-bold bg-gray-50 hover:bg-gray-100 text-gray-600 px-2 py-1 rounded-md transition-colors border border-gray-200 shadow-sm">
                            21st.dev
                          </a>
                          <a href="https://ideogram.ai/" target="_blank" rel="noreferrer" className="text-[10px] uppercase font-bold bg-gray-50 hover:bg-gray-100 text-gray-600 px-2 py-1 rounded-md transition-colors border border-gray-200 shadow-sm">
                            Ideogram
                          </a>
                          <a href="https://codepen.io/trending" target="_blank" rel="noreferrer" className="text-[10px] uppercase font-bold bg-gray-50 hover:bg-gray-100 text-gray-600 px-2 py-1 rounded-md transition-colors border border-gray-200 shadow-sm">
                            CodePen
                          </a>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-mono text-gray-400 mb-2 uppercase tracking-wide flex justify-between items-center">
                          <span>Directives (Briefing)</span>
                          <button 
                            type="button"
                            onClick={toggleRecording}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] uppercase font-bold transition-all border shadow-sm ${isRecording ? 'bg-red-50 text-red-500 border-red-200 animate-pulse' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'}`}
                          >
                            {isRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                            {isRecording ? 'Arrêter la dictée' : 'Microphone'}
                          </button>
                        </label>
                        <div className="relative">
                          <textarea 
                            value={briefText}
                            onChange={e => setBriefText(e.target.value)}
                            placeholder="Ex: 'Utilise des tons sombres, esprit cinéma. Moins de texte...'..."
                            className={`bg-white border-2 rounded-xl py-3 px-4 text-sm text-gray-700 w-full h-[120px] focus:outline-none resize-none transition-all shadow-none ${isRecording ? 'border-[#FF9F1C] ring-4 ring-[#FF9F1C]/10' : 'border-gray-300 focus:border-gray-500'}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Colonne 2 : Fichier */}
                    <div className="space-y-4 flex flex-col">
                      <label className="block text-xs font-mono text-gray-400 mb-2 uppercase tracking-wide">Dépôt d'Assets (Médias Vidéo DJI/Sony, Photos, PDF)</label>
                      <label 
                        className="relative overflow-hidden flex-1 border-2 border-dashed border-gray-200 bg-white hover:bg-orange-50 hover:border-[#FF9F1C] cursor-pointer rounded-xl transition-all flex flex-col items-center justify-center p-6 group"
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            const newFiles = Array.from(e.dataTransfer.files);
                            setBrandFiles(prev => [...prev, ...newFiles]);
                          }
                        }}
                      >
                        <Upload className="w-8 h-8 mb-4 transition-colors text-gray-300 group-hover:text-[#FF9F1C]" />
                        <span className="text-sm text-gray-500 text-center font-medium">Clique ou glisse tes assets FeelProd ici</span>
                        <span className="text-xs text-gray-400 mt-2 font-mono">MP4, MOV, JPG, RAW, PDF (Multi-fichiers)</span>
                        <input type="file" multiple accept=".pdf,image/*,video/*,.mp4,.mov" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-[0px]" />
                      </label>
                      {brandFiles.length > 0 && (
                        <div className="flex flex-col gap-2 mt-2 max-h-[140px] overflow-y-auto">
                          {brandFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-sm shrink-0">
                               <File className="w-5 h-5 text-gray-700 shrink-0" />
                               <div className="flex-1 truncate text-xs text-gray-600 font-medium">{file.name}</div>
                               <button type="button" onClick={() => setBrandFiles(prev => prev.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 transition-colors p-1.5 bg-white shadow-sm border border-gray-100 hover:bg-red-500/10 rounded-lg">
                                 <X className="w-4 h-4" />
                               </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-500 font-mono text-sm text-center">
              ⚠️ {errorMsg}
            </div>
          )}
        </div>
      </section>

      {/* Process Pipeline */}
      {stage !== "idle" && (
        <section className="flex flex-col gap-5">
          <h3 className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em] pl-2">Status Pipeline</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StepCard 
              active={stage === "audit" || stage === "extracting"} 
              done={currentStepNum > 1}
              icon={<Wand2 className="w-5 h-5" />}
              title="Extraction & Audit"
              desc="Scraping Firecrawl + Gemini"
              colorClass="cyan"
            />
            <StepCard 
              active={stage === "vibe-check"} 
              done={currentStepNum > 2}
              icon={<Activity className="w-5 h-5" />}
              title="Vibe Check"
              desc="Breakpoint Humain"
              alert={true}
              colorClass="brand"
            />
            <StepCard 
              active={stage === "builder" || stage === "done"} 
              done={currentStepNum > 3}
              icon={<Code2 className="w-5 h-5" />}
              title="Bâtisseur Code"
              desc="Export App Router Next.js"
              colorClass="green"
            />
          </div>
        </section>
      )}



      {/* Breakpoint Chat Modal (Vibe Check) */}
      <AnimatePresence>
        {stage === "vibe-check" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-white/80 backdrop-blur-md"
          >
            <motion.div 
               initial={{ opacity: 0, scale: 0.98, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.98, y: 10 }}
               className="bg-white w-full max-w-6xl h-full md:h-[85vh] overflow-hidden md:rounded-2xl shadow-sm border border-gray-200 flex flex-col lg:flex-row"
            >
              {/* Panneau de Gauche : Aperçu */}
              <div className="hidden lg:flex flex-1 border-r border-gray-100 bg-gray-50 p-8 flex-col gap-8 overflow-y-auto relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 blur-[100px] pointer-events-none" />

                 <h3 className="text-xl font-bold flex items-center gap-3 uppercase tracking-wide">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center border border-gray-200">
                    <span className="w-2 h-2 rounded-full bg-gray-600 shadow-sm animate-pulse" />
                  </div>
                  Hublot Visuel
                </h3>

                <div className="bg-white border border-gray-100 p-5 rounded-2xl">
                    <span className="text-[10px] text-gray-700 font-mono uppercase tracking-widest block mb-2">Conservation du Contenu</span>
                    <p className="text-xs text-gray-700 font-mono leading-relaxed">
                      {manifest?.proposed_strategy?.content_strategy || "Chargement de la stratégie de contenu..."}
                    </p>
                </div>

                <div className="bg-white border border-gray-100 p-5 rounded-2xl">
                    <span className="text-[10px] text-gray-700 font-mono uppercase tracking-widest block mb-2">Audit Visuel & Concurrence</span>
                    <p className="text-xs text-gray-700 font-mono leading-relaxed">
                      {manifest?.proposed_strategy?.visual_audit || "Analyse des couleurs..."}
                    </p>
                </div>

                <div className="bg-white border border-gray-100 p-5 rounded-2xl">
                    <span className="text-[10px] text-gray-700 font-mono uppercase tracking-widest block mb-2">Structure & Animations</span>
                    <p className="text-xs text-gray-700 font-mono leading-relaxed mb-3">
                      <strong className="text-gray-700">Layout : </strong>{manifest?.proposed_strategy?.structure_proposals || "..."}
                    </p>
                    <p className="text-xs text-gray-700 font-mono leading-relaxed">
                      <strong className="text-gray-700">Motion : </strong>{manifest?.proposed_strategy?.animation_style || "..."}
                    </p>
                </div>

                <div className="bg-white border border-gray-100 p-5 rounded-2xl">
                    <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest block mb-2">Création d'Images (Prompts générés)</span>
                    <ul className="text-xs text-gray-500 font-mono leading-relaxed list-disc pl-4 space-y-2">
                       {manifest?.proposed_strategy?.image_prompts?.map((prompt: string, i: number) => (
                         <li key={i}>{prompt}</li>
                       )) || <li>Génération des prompts en cours...</li>}
                    </ul>
                </div>
              </div>

              {/* Panneau de Droite : Chat Gemini */}
              <div className="flex-1 flex flex-col bg-white min-h-[50vh] lg:min-h-0">
                <div className="border-b border-gray-100 p-6 bg-white flex justify-between items-center z-10">
                  <div className="flex items-center gap-3">
                    <Bot className="w-5 h-5 text-gray-700" />
                    <span className="font-mono text-sm uppercase tracking-widest text-gray-700">DeepSync Assistant</span>
                  </div>
                  <button onClick={() => setStage("idle")} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><X className="w-4 h-4" /></button>
                </div>

                {/* Historique du Chat */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-white">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                        msg.role === "user" 
                          ? "bg-gray-100 border-gray-200 text-gray-700" 
                          : "bg-gray-100 border-gray-300 text-gray-700 shadow-sm"
                      }`}>
                        {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`p-4 rounded-xl max-w-[80%] text-sm leading-relaxed ${
                        msg.role === "user" 
                          ? "bg-gray-50 border border-gray-200 text-gray-600" 
                          : "bg-transparent text-gray-600"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Global Error Banner */}
                {errorMsg && (
                  <div className="mx-6 bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-500 font-mono text-sm text-center">
                    ⚠️ {errorMsg}
                  </div>
                )}

                {/* Zone de saisie */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
                  {chatFiles.length > 0 && (
                    <div className="flex gap-2 mb-1 overflow-x-auto pb-2">
                       {chatFiles.map((f, i) => (
                         <div key={i} className="flex items-center gap-2 bg-gray-200 px-3 py-1.5 rounded-lg text-xs font-mono text-gray-700 shrink-0">
                            <span className="truncate max-w-[150px]">{f.name}</span>
                            <button type="button" onClick={() => setChatFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500">
                              <X className="w-4 h-4" />
                            </button>
                         </div>
                       ))}
                    </div>
                  )}
                  <form onSubmit={sendChatMessage} className="flex gap-3">
                    <label 
                      className="relative overflow-hidden flex items-center justify-center bg-gray-100 hover:bg-gray-200 border border-gray-200 cursor-pointer rounded-xl px-4 transition-colors text-gray-600 group"
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          const files = Array.from(e.dataTransfer.files);
                          setChatFiles(prev => [...prev, ...files]);
                        }
                      }}
                    >
                      <Upload className="w-5 h-5 text-gray-400 group-hover:text-accent-cyan" />
                      <input type="file" multiple accept=".pdf,image/*,video/*,.mp4,.mov" onChange={(e) => {
                         if (e.target.files && e.target.files.length > 0) {
                           const files = Array.from(e.target.files);
                           setChatFiles(prev => [...prev, ...files]);
                         }
                         e.target.value = '';
                      }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-[0px]" />
                    </label>
                    <input 
                      type="text" 
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Prompt : Ajouter Images & Vidéos, Modifier la vibe..." 
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-5 py-4 text-sm font-mono focus:outline-none focus:border-accent-cyan transition-colors text-gray-700 placeholder:text-gray-300"
                    />
                    <button type="submit" className="bg-gray-100 text-gray-700 p-4 rounded-xl flex items-center justify-center hover:bg-accent-cyan hover:text-gray-700 transition-all">
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                  <button 
                    onClick={approveVibe}
                    className="w-full mt-4 bg-gray-100 border border-accent-green/50 text-gray-700 hover:bg-accent-green hover:text-gray-700 active:scale-95 rounded-xl py-4 font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:shadow-sm"
                  >
                    Valider Phase 3 & Lancer Compilation
                  </button>
                </div>
              </div>

              {/* Colonne 3 : Variables & Stats */}
              <div className="border-t lg:border-t-0 lg:border-l border-gray-200 bg-gray-50 overflow-y-auto p-4 lg:p-6 order-3 w-full lg:w-[380px] lg:shrink-0 max-h-[50vh] lg:max-h-none">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Layers className="text-gray-400" />
                  Hublot Visuel
                </h3>

                <div className="flex gap-2 mb-8 bg-gray-100/50 p-1.5 rounded-xl border border-gray-100">
                  <button 
                    onClick={() => setManifestTab("existant")}
                    className={`flex-1 py-2.5 text-xs uppercase tracking-widest font-bold rounded-lg transition-all duration-300 ${manifestTab === "existant" ? "bg-white text-[#1d1d1f] shadow-sm border border-gray-200" : "text-gray-400 hover:text-gray-600 hover:bg-white/50"}`}
                  >
                    Bilan Existant
                  </button>
                  <button 
                    onClick={() => setManifestTab("proposition")}
                    className={`flex-1 py-2.5 text-xs uppercase tracking-widest font-bold rounded-lg transition-all duration-300 ${manifestTab === "proposition" ? "bg-gradient-to-r from-[#FF9F1C] to-[#E58000] text-white shadow-md shadow-orange-500/20 border border-orange-500/50" : "text-gray-400 hover:text-gray-600 hover:bg-white/50"}`}
                  >
                    Nouvelle Vibe
                  </button>
                </div>

                <div className="space-y-6">
                  {/* ONGLET EXISTANT */}
                  {manifestTab === "existant" && manifest?.existing_assets && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <p className="text-xs font-mono text-gray-700 mb-2 uppercase">Diagnostic Vibe d'origine</p>
                        <p className="text-sm text-gray-700">{manifest.existing_assets.current_vibe}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs font-mono text-gray-400 mb-3 uppercase">Textes Mémorisés (Supprimer si inutile)</p>
                        <div className="space-y-2">
                          {manifest.existing_assets.strong_texts?.map((txt: string, idx: number) => (
                            <div key={idx} className="group relative flex items-center bg-white p-3 rounded-lg border border-gray-100 pr-10">
                              <span className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{txt}</span>
                              <button 
                                onClick={() => removeAsset('strong_texts', idx)} 
                                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 bg-red-500/10 p-1.5 rounded-md transition-all"
                                title="Supprimer cette phrase"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {manifest.existing_assets.color_palette?.length > 0 && (
                        <div>
                          <p className="text-xs font-mono text-gray-400 mb-3 uppercase">Code Couleur Récupéré</p>
                          <div className="flex flex-wrap gap-2">
                            {manifest.existing_assets.color_palette.map((color: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                                <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: color }}></div>
                                <span className="text-xs text-gray-700 font-mono">{color}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {manifest.existing_assets.typography?.length > 0 && (
                        <div>
                          <p className="text-xs font-mono text-gray-400 mb-3 uppercase">Typographie(s) Identifiée(s)</p>
                          <div className="flex flex-wrap gap-2">
                            {manifest.existing_assets.typography.map((font: string, idx: number) => (
                              <span key={idx} className="text-sm px-3 py-1 bg-white border border-gray-200 rounded-md text-gray-700 font-mono">
                                {font}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {manifest.existing_assets.pages_content?.length > 0 && (
                        <div>
                          <p className="text-xs font-mono text-gray-400 mb-3 uppercase">Contenu Intégral Préservé (Agendas, Dates, Textes)</p>
                          <div className="space-y-4">
                            {manifest.existing_assets.pages_content.map((page: any, idx: number) => (
                              <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative group overflow-hidden">
                                <h5 className="font-bold text-sm text-gray-800 mb-3">{page.page_url_or_name || `Page ${idx + 1}`}</h5>
                                <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto custom-scrollbar p-3 bg-gray-50 rounded-lg border border-gray-100 font-mono">
                                  {page.full_text}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {manifest.existing_assets.media_links?.length > 0 && (
                        <div>
                          <p className="text-xs font-mono text-gray-400 mb-3 uppercase">Médias Aspirés</p>
                          <div className="space-y-2">
                            {manifest.existing_assets.media_links.map((link: string, idx: number) => (
                              <div key={idx} className="group relative flex items-center bg-white p-3 rounded-lg border border-gray-100 pr-10">
                                <span className="text-xs text-gray-700 truncate flex-1 font-mono">{link}</span>
                                <button 
                                  onClick={() => removeAsset('media_links', idx)} 
                                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 bg-red-500/10 p-1.5 rounded-md transition-all"
                                  title="Supprimer ce média"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ONGLET PROPOSITION */}
                  {manifestTab === "proposition" && manifest?.proposed_strategy && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {Object.entries(manifest.proposed_strategy).map(([k, v]) => (
                        <div key={k} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                          <p className="text-xs font-mono text-gray-700 mb-2 uppercase">{k}</p>
                          {Array.isArray(v) ? (
                            <ul className="text-sm text-gray-700 list-disc pl-4 space-y-1">
                              {v.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-700 leading-relaxed">{v as string}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fallback si ancien format JSON utilisé */}
                  {!manifest?.proposed_strategy && !manifest?.existing_assets && manifest && (
                    <div className="space-y-4">
                      {Object.entries(manifest).map(([k, v]) => (
                        <div key={k} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                          <p className="text-xs font-mono text-gray-700 mb-2 uppercase">{k}</p>
                          {Array.isArray(v) ? (
                            <ul className="text-sm text-gray-700 list-disc pl-4 space-y-1">
                              {v.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-700 leading-relaxed">{v as string}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        {/* STAGE: BUILDER */}
        {stage === "builder" && manifest && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex items-center justify-center p-6"
          >
            <div className="max-w-4xl mx-auto text-center space-y-6 w-full mt-12 bg-panel border border-gray-100 rounded-3xl p-8 backdrop-blur-2xl">
              <Code2 className="w-16 h-16 text-gray-700 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-700">Plan de Déploiement</h2>
              <p className="text-gray-500 mb-8 max-w-2xl mx-auto">Le Manifeste est finalisé et épuré. Comment souhaites-tu concrétiser ce projet ?</p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-8 bg-gray-50 p-3 rounded-2xl border border-gray-100 w-full sm:w-auto mx-auto">
                <button 
                  onClick={() => setDeviceType("mobile")}
                  className={`px-4 sm:px-8 py-3 rounded-xl border transition-all flex items-center justify-center gap-2 sm:gap-3 font-semibold text-sm flex-1 sm:flex-none ${deviceType === "mobile" ? "border-gray-400 bg-gray-200 text-gray-700 shadow-sm" : "border-transparent text-gray-400 hover:bg-gray-50"}`}
                >
                  <Smartphone className="w-5 h-5" /> iPhone / Mobile First
                </button>
                <button 
                  onClick={() => setDeviceType("tablet")}
                  className={`px-4 sm:px-8 py-3 rounded-xl border transition-all flex items-center justify-center gap-2 sm:gap-3 font-semibold text-sm flex-1 sm:flex-none ${deviceType === "tablet" ? "border-gray-400 bg-gray-200 text-gray-700 shadow-sm" : "border-transparent text-gray-400 hover:bg-gray-50"}`}
                >
                  <Tablet className="w-5 h-5" /> Tablette
                </button>
                <button 
                  onClick={() => setDeviceType("desktop")}
                  className={`px-4 sm:px-8 py-3 rounded-xl border transition-all flex items-center justify-center gap-2 sm:gap-3 font-semibold text-sm flex-1 sm:flex-none ${deviceType === "desktop" ? "border-gray-400 bg-gray-200 text-gray-700 shadow-sm" : "border-transparent text-gray-400 hover:bg-gray-50"}`}
                >
                  <Monitor className="w-5 h-5" /> Desktop
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Option 1 : Fast */}
                <div 
                  onClick={() => setBuilderOption("fast")}
                  className={`bg-white border ${builderOption === "fast" ? 'border-accent-cyan shadow-sm' : 'border-gray-200 hover:border-gray-300'} p-8 rounded-2xl text-left transition-all group cursor-pointer flex flex-col h-full`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <Wand2 className={`w-8 h-8 ${builderOption === "fast" ? 'text-gray-700' : 'text-gray-400 group-hover:text-gray-700'} transition-colors duration-300`} />
                    <span className="bg-gray-100 text-gray-700 text-[10px] uppercase font-bold py-1.5 px-3 rounded-full tracking-wider border border-gray-200">iPhone Ready</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-3">Fast Prototype</h3>
                  <p className="text-sm text-gray-400 mb-6 flex-1 leading-relaxed">
                    Production accélérée via <strong>Stitch</strong> (ou Claude standard). Parfait pour expérimenter sur mobile, obtenir un brouillon Tailwind rapide, et concevoir des maquettes jetables.
                  </p>
                  <div className="text-gray-700 font-mono text-sm underline group-hover:opacity-80">Générer le Prompt Stitch →</div>
                </div>

                {/* Option 2 : Deep */}
                <div 
                  onClick={() => setBuilderOption("deep")}
                  className={`bg-[#0A0A0A] border ${builderOption === "deep" ? 'border-gray-400 shadow-sm' : 'border-gray-200 hover:border-gray-400/50'} p-8 rounded-2xl text-left transition-all group cursor-pointer flex flex-col h-full`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <Bot className={`w-8 h-8 ${builderOption === "deep" ? 'text-gray-700' : 'text-gray-400 group-hover:text-gray-700'} transition-colors duration-300`} />
                    <span className="bg-gray-100 text-gray-700 text-[10px] uppercase font-bold py-1.5 px-3 rounded-full tracking-wider border border-gray-200">Ordi / Antigravity Only</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-3">Deep Build DNA</h3>
                  <p className="text-sm text-gray-400 mb-6 flex-1 leading-relaxed">
                    Séquence experte en local. <strong>Antigravity</strong> fusionnera le manifeste FeelProd avec tes <strong>280 règles de FeelProd</strong> (Framer Motion, Remotion, SEO) pour coder chaque atome du site final de façon chirurgicale.
                  </p>
                  <div className="text-gray-700 font-mono text-sm underline group-hover:opacity-80">Ordonner à Antigravity →</div>
                </div>
              </div>

              {/* Panneau Affichage Code */}
              <AnimatePresence mode="wait">
                {builderOption && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`mt-10 p-6 rounded-2xl text-left relative overflow-hidden group ${builderOption === "fast" ? 'bg-gray-50 border border-gray-200' : 'bg-gray-50 border border-gray-200'}`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                      <h4 className="text-gray-700 font-mono text-xs sm:text-sm uppercase font-semibold">
                        {builderOption === "fast" ? "Prompt à copier dans Stitch" : "Instruction à copier dans Antigravity"}
                      </h4>
                      <button 
                        onClick={() => copyToClipboard(builderOption === "fast" ? getFastPrompt() : getDeepPrompt())}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition-all shrink-0 ${copied ? 'bg-green-500 text-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copié !" : "Copier le texte"}
                      </button>
                    </div>

                    <pre className="text-xs text-gray-500 whitespace-pre-wrap font-mono p-6 bg-gray-50/80 rounded-xl overflow-y-auto custom-scrollbar border border-gray-100 text-left max-h-[400px]">
                      {builderOption === "fast" ? getFastPrompt() : getDeepPrompt()}
                    </pre>

                    {builderOption === "deep" ? (
                      <div className="mt-6 flex items-start gap-4 p-4 bg-orange-50/50 rounded-xl border border-[#FF9F1C]/20">
                        <div className="w-8 h-8 rounded-full bg-[#FF9F1C]/20 flex items-center justify-center shrink-0">
                          <div className="w-2.5 h-2.5 bg-[#FF9F1C] rounded-full animate-pulse" />
                        </div>
                        <div className="text-sm text-gray-700">
                          <strong className="block mb-1 text-[#1d1d1f]">C'est l'heure de l'ingénierie (Antigravity) !</strong>
                          Copie ce texte en cliquant sur le bouton, puis retourne dans ton éditeur de code et <strong>colle ce pavé à Antigravity</strong> pour que la forge commence sur ta machine.
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 flex items-start gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-200/50">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <Smartphone className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-sm text-gray-700">
                          <strong className="block mb-1 text-[#1d1d1f]">Prêt pour le prototypage visuel (Stitch / v0) !</strong>
                          Copie ce texte, ouvre <strong>Stitch, v0 ou Lovable</strong> et <strong>colle le pavé complet directement dans leur barre de texte principale.</strong> Ils génèreront l'interface sous tes yeux.
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onClick={() => setStage("vibe-check")}
                className="mt-8 px-6 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-sm font-bold uppercase tracking-wider transition-all"
              >
                ← Revenir au Vibe Check
              </button>
            </div>
          </motion.div>
        )}
    </main>
  );
}

function StepCard({ active, done, icon, title, desc, alert = false, colorClass }: { active: boolean, done: boolean, icon: React.ReactNode, title: string, desc: string, alert?: boolean, colorClass: "brand"|"cyan"|"green" }) {
  
  const getColors = () => {
    if (active && alert) return "border-[#FF9F1C] shadow-md bg-orange-50/50";
    if (active && colorClass === "brand") return "border-[#FF9F1C] shadow-md bg-orange-50/50";
    if (active && colorClass === "cyan") return "border-[#33a5e8] shadow-md bg-blue-50/50";
    if (active && colorClass === "green") return "border-[#5A9C51] shadow-md bg-green-50/50";
    if (done) return "border-gray-200 bg-white opacity-80";
    return "border-gray-100 bg-gray-50/50 opacity-40";
  };

  const getIconColors = () => {
    if (active || done) {
      if (colorClass === "brand") return "bg-[#FF9F1C] text-white shadow-lg";
      if (colorClass === "cyan") return "bg-[#33a5e8] text-white shadow-lg";
      if (colorClass === "green") return "bg-[#5A9C51] text-white shadow-lg";
    }
    return "bg-gray-100 border border-gray-200 text-gray-300";
  };

  return (
    <div className={`p-5 rounded-2xl border transition-all duration-500 ${getColors()} flex flex-col gap-4 relative overflow-hidden`}>
      {done && <div className={`absolute top-4 right-4 ${colorClass === 'brand' ? 'text-gray-700' : colorClass === 'green' ? 'text-gray-700' : 'text-gray-700'}`}><CheckCircle2 className="w-4 h-4" /></div>}
      
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${getIconColors()}`}>
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-sm tracking-wide text-gray-700 uppercase">{title}</h4>
        <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wider font-mono">{desc}</p>
      </div>
    </div>
  )
}
