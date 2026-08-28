"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Square,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  FileText,
  FileDown,
  Copy,
  Share2,
  Check,
  Clock,
  Volume2,
  Trash2,
  ChevronRight,
  Stethoscope,
  BookOpen,
  ListTodo,
  Mail,
  Settings,
  History,
  ArrowLeft,
  Download,
  Key,
  X,
  Sparkle
} from "lucide-react";
import jsPDF from "jspdf";

type RecordingMode = "dictee" | "consultation" | "synthese" | "podcast";
type ResultTab = "transcription" | "synthese" | "pdf";
type AnalysisType = "synthese" | "fiche_clinique" | "actions" | "email";

interface SavedVoiceNote {
  id: string;
  title: string;
  transcript: string;
  analysis?: string;
  analysisType?: AnalysisType;
  duration: string;
  mode: RecordingMode;
  date: string;
  timestamp: number;
}

export default function FeelProdVoiceMobileApp() {
  // Navigation & State
  const [view, setView] = useState<"record" | "history">("record");
  const [mode, setMode] = useState<RecordingMode>("dictee");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [tempKey, setTempKey] = useState("");
  
  // Timer & Audio
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Transcription & Analysis Content
  const [transcript, setTranscript] = useState("");
  const [analysisText, setAnalysisText] = useState("");
  const [currentAnalysisType, setCurrentAnalysisType] = useState<AnalysisType>("synthese");
  const [activeTab, setActiveTab] = useState<ResultTab>("transcription");
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // History & Storage
  const [history, setHistory] = useState<SavedVoiceNote[]>([]);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);

  // Refs for Web Audio & MediaRecorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load history and custom key from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("feelprod_voice_history");
      if (saved) setHistory(JSON.parse(saved));

      const savedKey = localStorage.getItem("feelprod_gemini_key");
      if (savedKey) {
        setCustomKey(savedKey);
        setTempKey(savedKey);
      }
    } catch (e) {
      console.error("Failed to load local storage", e);
    }
  }, []);

  // Save custom key
  const handleSaveKey = () => {
    const k = tempKey.trim();
    setCustomKey(k);
    if (k) {
      localStorage.setItem("feelprod_gemini_key", k);
    } else {
      localStorage.removeItem("feelprod_gemini_key");
    }
    setShowSettings(false);
    if (navigator.vibrate) navigator.vibrate(15);
  };

  // Save history to localStorage
  const saveToHistory = (newNote: SavedVoiceNote) => {
    setHistory((prev) => {
      const filtered = prev.filter((n) => n.id !== newNote.id);
      const updated = [newNote, ...filtered];
      try {
        localStorage.setItem("feelprod_voice_history", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Timer logic
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording, isPaused]);

  // Audio Visualizer Drawing Loop
  const startVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.9 + 4;
          
          // Gradient stylé Ligne Claire (Ambre chaud vers Ardoise)
          const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
          grad.addColorStop(0, "#D97706");
          grad.addColorStop(0.6, "#7EAEC8");
          grad.addColorStop(1, "#234458");

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, canvas.height - barHeight, barWidth - 3, barHeight, [4, 4, 0, 0]);
          ctx.fill();

          x += barWidth + 1;
        }
      };
      draw();
    } catch (e) {
      console.warn("Visualizer init warning:", e);
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
  };

  // Start Recording
  const startRecording = async () => {
    try {
      if (navigator.vibrate) navigator.vibrate(25);

      audioChunksRef.current = [];
      setTranscript("");
      setAnalysisText("");
      setAudioUrl(null);
      setSeconds(0);
      setIsPaused(false);
      setStatusMessage(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      streamRef.current = stream;

      let mimeType = "audio/mp4";
      if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/aac")) {
        mimeType = "audio/aac";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stopVisualizer();
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        stream.getTracks().forEach((track) => track.stop());
        await sendToTranscribe(audioBlob, mimeType);
      };

      recorder.start(250);
      setIsRecording(true);
      startVisualizer(stream);

    } catch (err: any) {
      console.error("Mic access error:", err);
      alert("Accès microphone refusé ou non disponible. Veuillez autoriser l'accès au micro dans Safari.");
    }
  };

  // Pause / Resume Recording
  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (navigator.vibrate) navigator.vibrate(15);

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  // Cancel Recording
  const cancelRecording = () => {
    if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    }
    setIsRecording(false);
    setIsPaused(false);
    setSeconds(0);
    stopVisualizer();
  };

  // Stop and Process Recording
  const stopRecording = () => {
    if (navigator.vibrate) navigator.vibrate(40);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setIsProcessing(true);
      setStatusMessage("Gemini 2.5 Flash transcrit votre voix...");
    }
  };

  // Call API Transcribe
  const sendToTranscribe = async (blob: Blob, mimeType: string) => {
    try {
      const formData = new FormData();
      formData.append("file", blob, "voice_recording.mp4");
      formData.append("mode", mode);
      if (customKey) formData.append("apiKey", customKey);

      const headers: Record<string, string> = {};
      if (customKey) headers["x-gemini-key"] = customKey;

      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        headers,
        body: formData
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Erreur de transcription.");
      }

      const text = data.transcript || "";
      setTranscript(text);
      setIsProcessing(false);
      setStatusMessage(null);
      setActiveTab("transcription");

      const noteId = Date.now().toString();
      setCurrentNoteId(noteId);

      const durationStr = formatDuration(seconds);
      const newNote: SavedVoiceNote = {
        id: noteId,
        title: getNoteTitle(text, mode),
        transcript: text,
        duration: durationStr,
        mode: mode,
        date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
        timestamp: Date.now()
      };
      saveToHistory(newNote);

      if (navigator.vibrate) navigator.vibrate([30, 80, 30]);

    } catch (err: any) {
      console.error("Transcribe failed:", err);
      setIsProcessing(false);
      setStatusMessage(`❌ ${err.message}`);
    }
  };

  // Generate Analysis with Gemini
  const generateAnalysis = async (type: AnalysisType) => {
    if (!transcript) return;
    if (navigator.vibrate) navigator.vibrate(20);

    setIsAnalyzing(true);
    setCurrentAnalysisType(type);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (customKey) headers["x-gemini-key"] = customKey;

      const res = await fetch("/api/voice/analyze", {
        method: "POST",
        headers,
        body: JSON.stringify({
          transcript,
          format: type,
          title: getNoteTitle(transcript, mode),
          apiKey: customKey || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erreur analyse");

      setAnalysisText(data.analysis || "");
      setActiveTab("synthese");

      if (currentNoteId) {
        const note = history.find((n) => n.id === currentNoteId);
        if (note) {
          const updatedNote = { ...note, analysis: data.analysis, analysisType: type };
          saveToHistory(updatedNote);
        }
      }

      if (navigator.vibrate) navigator.vibrate([30, 80]);

    } catch (e: any) {
      alert("Erreur lors de l'analyse : " + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper formatting
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getNoteTitle = (text: string, m: RecordingMode) => {
    if (!text) return "Dictée FeelProd";
    const firstLine = text.split("\n")[0].replace(/[#*\-]/g, "").trim();
    if (firstLine.length > 40) return firstLine.slice(0, 37) + "...";
    return firstLine || `Note vocale (${m})`;
  };

  // Export PDF Generation
  const exportPDF = () => {
    if (!transcript) return;
    if (navigator.vibrate) navigator.vibrate(25);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      let cursorY = 22;

      // En-tête Ligne Claire FeelProd
      doc.setFillColor(250, 247, 242);
      doc.rect(0, 0, pageWidth, 42, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(35, 68, 88);
      doc.text("FEELPROD VOICE — COMPTE-RENDU", 15, cursorY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(140, 78, 51);
      cursorY += 7;
      const dateStr = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
      doc.text(`📅 Date : ${dateStr}   •   ⏱️ Durée : ${formatDuration(seconds)}   •   Mode : ${mode.toUpperCase()}`, 15, cursorY);

      cursorY += 6;
      doc.setDrawColor(200, 180, 160);
      doc.line(15, cursorY, pageWidth - 15, cursorY);

      cursorY += 14;

      if (analysisText) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(35, 68, 88);
        doc.text("📑 SYNTHÈSE & ANALYSE STRUCTURÉE (GEMINI 2.5 FLASH)", 15, cursorY);
        cursorY += 7;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);

        const cleanAnalysis = analysisText.replace(/[*#]/g, "");
        const splitAnalysis = doc.splitTextToSize(cleanAnalysis, pageWidth - 30);
        doc.text(splitAnalysis, 15, cursorY);
        cursorY += splitAnalysis.length * 5.2 + 10;
      }

      if (cursorY > pageHeight - 60) {
        doc.addPage();
        cursorY = 22;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35, 68, 88);
      doc.text("📝 TRANSCRIPTION INTÉGRALE FIDÈLE", 15, cursorY);
      cursorY += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(50, 50, 50);

      const splitTranscript = doc.splitTextToSize(transcript, pageWidth - 30);
      
      for (let i = 0; i < splitTranscript.length; i++) {
        if (cursorY > pageHeight - 20) {
          doc.addPage();
          cursorY = 20;
        }
        doc.text(splitTranscript[i], 15, cursorY);
        cursorY += 4.8;
      }

      const totalPages = doc.internal.pages.length - 1;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`FeelProd Voice • Guillaume Philippe (Ostéopathe D.O. • TDT) • Page ${p}/${totalPages}`, pageWidth / 2, pageHeight - 8, { align: "center" });
      }

      const filename = `FeelProd_Voice_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.pdf`;
      doc.save(filename);

    } catch (e: any) {
      alert("Erreur génération PDF : " + e.message);
    }
  };

  // Export TXT
  const exportTXT = () => {
    const fullContent = `==================================================
FEELPROD VOICE — TRANSCRIPTION
Date : ${new Date().toLocaleString("fr-FR")}
Mode : ${mode}
Durée : ${formatDuration(seconds)}
==================================================

${analysisText ? `--- SYNTHÈSE & ANALYSE ---\n${analysisText}\n\n==================================================\n` : ""}-- TRANSCRIPTION INTÉGRALE --
${transcript}
`;
    const blob = new Blob([fullContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FeelProd_Voice_${Date.now()}.txt`;
    a.click();
  };

  // Copy to Clipboard
  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (navigator.vibrate) navigator.vibrate(15);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Web Share API (Natif iOS)
  const shareNative = async () => {
    const textToShare = analysisText ? `${analysisText}\n\n--- Transcription brute ---\n${transcript}` : transcript;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "FeelProd Voice Note",
          text: textToShare
        });
      } catch (e) {}
    } else {
      copyToClipboard(textToShare);
      alert("Texte copié dans le presse-papier !");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#234458] font-sans antialiased pb-28 pt-safe">
      {/* 1. Header iOS Style */}
      <header className="sticky top-0 z-30 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E6DEC8] px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar BD Guillaume Philippe */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[#7EAEC8] shadow-sm bg-white shrink-0">
              <img
                src="/avatar.png"
                alt="Avatar Guillaume Philippe"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as any).src = "/apple-touch-icon.png";
                }}
              />
              {isRecording && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-ping" />
              )}
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-[#162734] leading-tight flex items-center gap-1.5">
                FEELPROD VOICE
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-[#7EAEC8]/20 text-[#234458] rounded-full">
                  2.5 Flash
                </span>
              </h1>
              <p className="text-xs text-[#8C4E33] font-medium">
                Dictée TDT & Intelligence Ostéopathique
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bouton Réglages Clé API */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full bg-white border border-[#D9CEBA] text-[#234458] active:scale-95 shadow-xs"
              title="Réglages Clé API"
            >
              <Settings className="w-4 h-4 text-gray-600" />
            </button>

            {/* Switcher Historique / Enregistrement */}
            <button
              onClick={() => setView(view === "record" ? "history" : "record")}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-[#D9CEBA] shadow-xs text-[#234458] active:scale-95 transition-all flex items-center gap-1.5"
            >
              {view === "record" ? (
                <>
                  <History className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>({history.length})</span>
                </>
              ) : (
                <>
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Nouveau</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MODAL RÉGLAGES CLÉ API */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E6DEC8] shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-[#D97706]" />
                <h3 className="font-bold text-sm text-[#162734]">Réglages Clé Gemini</h3>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Personnalisez ou mettez à jour votre clé API Google Gemini pour les transcriptions directes :
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#8C4E33] uppercase tracking-wider block">
                Clé API Gemini (AIzaSy...) :
              </label>
              <input
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="Collez votre clé AIzaSy... ici"
                className="w-full p-3 text-xs font-mono bg-[#FAF7F2] rounded-xl border border-[#D9CEBA] focus:bg-white focus:ring-2 focus:ring-[#7EAEC8]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveKey}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#234458] text-white active:scale-95 shadow-xs"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 pt-4">
        {/* VIEW 1 : STUDIO D'ENREGISTREMENT */}
        {view === "record" && (
          <div className="space-y-5">
            {/* Mode Selector Chips */}
            {!isRecording && !transcript && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#8C4E33] uppercase tracking-wider block px-1">
                  Mode de Dictée :
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode("dictee")}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      mode === "dictee"
                        ? "bg-white border-[#234458] shadow-sm ring-1 ring-[#234458]"
                        : "bg-white/60 border-[#E2D8C3] hover:bg-white text-gray-700"
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#162734]">Dictée Rapide</div>
                      <div className="text-[11px] text-gray-500">Ponctuation & syntaxe fluide</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode("consultation")}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      mode === "consultation"
                        ? "bg-white border-[#234458] shadow-sm ring-1 ring-[#234458]"
                        : "bg-white/60 border-[#E2D8C3] hover:bg-white text-gray-700"
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#162734]">Consultation Ostéo</div>
                      <div className="text-[11px] text-gray-500">Diarisation Praticien/Patient</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode("synthese")}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      mode === "synthese"
                        ? "bg-white border-[#234458] shadow-sm ring-1 ring-[#234458]"
                        : "bg-white/60 border-[#E2D8C3] hover:bg-white text-gray-700"
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#162734]">Synthèse de Cours</div>
                      <div className="text-[11px] text-gray-500">Organisation thématique</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode("podcast")}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      mode === "podcast"
                        ? "bg-white border-[#234458] shadow-sm ring-1 ring-[#234458]"
                        : "bg-white/60 border-[#E2D8C3] hover:bg-white text-gray-700"
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-rose-100 text-rose-800">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#162734]">Podcast / Idée</div>
                      <div className="text-[11px] text-gray-500">Style parlé FeelProd</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Recording Card / Visualizer Hero */}
            <div className="bg-white rounded-2xl border border-[#E6DEC8] shadow-sm p-6 text-center relative overflow-hidden">
              {/* Statut & Timer */}
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E6DEC8] text-xs font-semibold text-[#8C4E33]">
                  {isRecording ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      <span>{isPaused ? "⏸️ En pause" : "🔴 En écoute en direct..."}</span>
                    </>
                  ) : isProcessing ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-spin" />
                      <span>✨ Gemini transcrit...</span>
                    </>
                  ) : transcript ? (
                    <span>✅ Transcription prête</span>
                  ) : (
                    <span>🎙️ Prêt pour l'enregistrement</span>
                  )}
                </div>

                <div className="mt-2 text-4xl font-mono font-bold tracking-tight text-[#162734]">
                  {formatDuration(seconds)}
                </div>
              </div>

              {/* Dynamic Audio Visualizer Canvas */}
              <div className="w-full h-20 bg-[#FAF7F2] rounded-xl border border-[#EDE4D3] overflow-hidden flex items-center justify-center my-3 relative">
                {isRecording ? (
                  <canvas ref={canvasRef} width={360} height={80} className="w-full h-full object-cover" />
                ) : isProcessing ? (
                  <div className="flex flex-col items-center gap-2 text-xs text-purple-700 font-medium animate-pulse">
                    <Sparkles className="w-6 h-6 animate-spin text-purple-600" />
                    Traitement neuronal TDT en cours...
                  </div>
                ) : transcript ? (
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    {transcript.split(/\s+/).filter(Boolean).length} mots enregistrés avec succès
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 font-medium">
                    Appuyez sur le micro ci-dessous pour parler
                  </div>
                )}
              </div>

              {/* Main Button & Controls */}
              <div className="pt-2 flex items-center justify-center gap-4">
                {isRecording ? (
                  <>
                    {/* Annuler */}
                    <button
                      onClick={cancelRecording}
                      className="p-3.5 rounded-full bg-gray-100 text-gray-600 active:scale-90 transition-transform shadow-xs"
                      title="Annuler"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>

                    {/* Stop & Transcrire (Bouton Principal) */}
                    <button
                      onClick={stopRecording}
                      className="p-5 rounded-full bg-red-600 text-white active:scale-95 transition-transform shadow-lg ring-4 ring-red-100 flex items-center justify-center"
                      title="Terminer et transcrire"
                    >
                      <Square className="w-7 h-7 fill-white" />
                    </button>

                    {/* Pause / Resume */}
                    <button
                      onClick={togglePause}
                      className="p-3.5 rounded-full bg-amber-100 text-amber-800 active:scale-90 transition-transform shadow-xs"
                      title={isPaused ? "Reprendre" : "Pause"}
                    >
                      {isPaused ? <Play className="w-5 h-5 fill-amber-800" /> : <Pause className="w-5 h-5" />}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startRecording}
                    disabled={isProcessing}
                    className="px-6 py-4 rounded-full bg-[#234458] text-white font-bold text-base tracking-wide active:scale-95 transition-all shadow-md flex items-center gap-3 disabled:opacity-50"
                  >
                    <Mic className="w-6 h-6 text-amber-300" />
                    {transcript ? "Nouvelle Dictée Vocale" : "Démarrer l'Enregistrement"}
                  </button>
                )}
              </div>
            </div>

            {/* Audio Playback Bar if recorded */}
            {audioUrl && !isRecording && (
              <div className="bg-white rounded-xl border border-[#E6DEC8] p-3 flex items-center justify-between gap-3 shadow-xs">
                <audio
                  ref={audioPlayerRef}
                  src={audioUrl}
                  onTimeUpdate={(e) => setAudioCurrentTime((e.target as any).currentTime)}
                  onLoadedMetadata={(e) => setAudioDuration((e.target as any).duration)}
                  onEnded={() => setIsPlayingAudio(false)}
                />
                <button
                  onClick={() => {
                    if (audioPlayerRef.current) {
                      if (isPlayingAudio) {
                        audioPlayerRef.current.pause();
                        setIsPlayingAudio(false);
                      } else {
                        audioPlayerRef.current.play();
                        setIsPlayingAudio(true);
                      }
                    }
                  }}
                  className="p-2.5 rounded-full bg-[#234458] text-white shrink-0 active:scale-95"
                >
                  {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                </button>
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] font-mono text-gray-500 mb-1">
                    <span>{formatDuration(Math.floor(audioCurrentTime))}</span>
                    <span>{formatDuration(Math.floor(audioDuration || seconds))}</span>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#D97706] h-full transition-all"
                      style={{
                        width: `${((audioCurrentTime / (audioDuration || seconds || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* POST-RECORDING HUB (Résultats & Actions) */}
            {transcript && (
              <div className="bg-white rounded-2xl border border-[#E6DEC8] shadow-sm overflow-hidden">
                {/* Result Tabs */}
                <div className="flex border-b border-[#E6DEC8] bg-[#FAF7F2]/60">
                  <button
                    onClick={() => setActiveTab("transcription")}
                    className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                      activeTab === "transcription"
                        ? "border-[#234458] text-[#234458] bg-white"
                        : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    Transcription
                  </button>

                  <button
                    onClick={() => setActiveTab("synthese")}
                    className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                      activeTab === "synthese"
                        ? "border-[#234458] text-[#234458] bg-white"
                        : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Synthèse & IA
                    {analysisText && <span className="w-2 h-2 rounded-full bg-purple-600" />}
                  </button>

                  <button
                    onClick={() => setActiveTab("pdf")}
                    className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                      activeTab === "pdf"
                        ? "border-[#234458] text-[#234458] bg-white"
                        : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <FileDown className="w-4 h-4 text-emerald-600" />
                    Export PDF
                  </button>
                </div>

                <div className="p-4">
                  {/* TAB 1 : TRANSCRIPTION ÉDITABLE */}
                  {activeTab === "transcription" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>📝 Texte brut nettoyé (éditable) :</span>
                        <span>{transcript.split(/\s+/).filter(Boolean).length} mots</span>
                      </div>
                      <textarea
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        rows={8}
                        className="w-full p-3.5 text-sm leading-relaxed text-[#162734] bg-[#FAF7F2]/40 rounded-xl border border-[#E6DEC8] focus:ring-2 focus:ring-[#7EAEC8] focus:bg-white transition-all resize-y"
                      />
                    </div>
                  )}

                  {/* TAB 2 : SYNTHÈSE IA & OPTIONS */}
                  {activeTab === "synthese" && (
                    <div className="space-y-4">
                      {/* Boutons de génération d'analyse */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-[#8C4E33] uppercase tracking-wider block">
                          Générer un format spécifique avec Gemini :
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => generateAnalysis("synthese")}
                            disabled={isAnalyzing}
                            className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-left text-xs font-bold text-purple-900 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                          >
                            <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                            <span>Synthèse Points Clés</span>
                          </button>

                          <button
                            onClick={() => generateAnalysis("fiche_clinique")}
                            disabled={isAnalyzing}
                            className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-left text-xs font-bold text-blue-900 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                          >
                            <Stethoscope className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>Fiche Clinique TDT</span>
                          </button>

                          <button
                            onClick={() => generateAnalysis("actions")}
                            disabled={isAnalyzing}
                            className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-left text-xs font-bold text-emerald-900 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                          >
                            <ListTodo className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Plan d'Action / To-Do</span>
                          </button>

                          <button
                            onClick={() => generateAnalysis("email")}
                            disabled={isAnalyzing}
                            className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-left text-xs font-bold text-amber-900 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                          >
                            <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Email / Message Pro</span>
                          </button>
                        </div>
                      </div>

                      {/* Résultat d'analyse */}
                      {isAnalyzing ? (
                        <div className="p-8 text-center bg-[#FAF7F2] rounded-xl border border-[#E6DEC8] animate-pulse">
                          <Sparkles className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-2" />
                          <p className="text-xs font-bold text-purple-900">Génération neuronale en cours...</p>
                          <p className="text-[11px] text-gray-500 mt-1">Structuration TDT par Gemini 2.5 Flash</p>
                        </div>
                      ) : analysisText ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="font-bold text-[#234458]">Rendu IA structuré :</span>
                            <button
                              onClick={() => copyToClipboard(analysisText)}
                              className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Copier la synthèse
                            </button>
                          </div>
                          <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#E6DEC8] text-xs leading-relaxed text-[#162734] whitespace-pre-wrap font-sans max-h-96 overflow-y-auto">
                            {analysisText}
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center bg-[#FAF7F2] rounded-xl border border-dashed border-[#D9CEBA] text-xs text-gray-500">
                          Cliquez sur un des boutons ci-dessus pour générer une synthèse automatique.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3 : EXPORT PDF & ACTIONS */}
                  {activeTab === "pdf" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#E6DEC8] text-center space-y-3">
                        <FileDown className="w-10 h-10 text-[#D97706] mx-auto" />
                        <div>
                          <h3 className="font-bold text-sm text-[#162734]">Compte-Rendu PDF Haute Définition</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Mise en page officielle FeelProd avec entête, date, durée, synthèse et transcription.
                          </p>
                        </div>
                        <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                          <button
                            onClick={exportPDF}
                            className="px-5 py-2.5 rounded-xl bg-[#234458] text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 shadow-xs"
                          >
                            <Download className="w-4 h-4" />
                            Télécharger le PDF
                          </button>
                          <button
                            onClick={exportTXT}
                            className="px-4 py-2.5 rounded-xl bg-white border border-[#D9CEBA] text-[#234458] font-bold text-xs flex items-center justify-center gap-2 active:scale-95 shadow-xs"
                          >
                            <FileText className="w-4 h-4" />
                            Exporter TXT
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Bottom Quick Action Toolbar */}
                <div className="p-3 bg-[#FAF7F2] border-t border-[#E6DEC8] flex items-center justify-between gap-2">
                  <button
                    onClick={() => copyToClipboard(analysisText ? `${analysisText}\n\n---\n${transcript}` : transcript)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-white border border-[#D9CEBA] text-xs font-bold text-[#234458] shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#D97706]" />}
                    {copied ? "Copié !" : "Copier Tout"}
                  </button>

                  <button
                    onClick={shareNative}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#234458] text-white text-xs font-bold shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-4 h-4 text-amber-300" />
                    Partager iOS
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2 : HISTORIQUE DES DICTÉES */}
        {view === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-base text-[#162734]">Vos Dictées Récentes</h2>
              {history.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm("Voulez-vous effacer tout l'historique ?")) {
                      setHistory([]);
                      localStorage.removeItem("feelprod_voice_history");
                    }
                  }}
                  className="text-xs text-red-600 font-bold hover:underline"
                >
                  Tout effacer
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-[#E6DEC8] text-gray-500 space-y-2">
                <History className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-xs font-bold">Aucune dictée enregistrée pour le moment.</p>
                <p className="text-[11px] text-gray-400">Vos enregistrements et transcriptions apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-white rounded-2xl border border-[#E6DEC8] shadow-xs hover:shadow-sm transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-xs text-[#162734] leading-tight">{item.title}</h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {item.date} • {item.duration} • <span className="uppercase font-semibold text-[#8C4E33]">{item.mode}</span>
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                        {item.transcript.split(/\s+/).filter(Boolean).length} mots
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {item.transcript}
                    </p>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-bold">
                      <button
                        onClick={() => {
                          setTranscript(item.transcript);
                          setAnalysisText(item.analysis || "");
                          setMode(item.mode);
                          setCurrentNoteId(item.id);
                          setView("record");
                          setActiveTab("transcription");
                        }}
                        className="text-[#234458] hover:underline flex items-center gap-1"
                      >
                        Ouvrir dans le Studio
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(item.transcript)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                          title="Copier"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            const updated = history.filter((h) => h.id !== item.id);
                            setHistory(updated);
                            localStorage.setItem("feelprod_voice_history", JSON.stringify(updated));
                          }}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
