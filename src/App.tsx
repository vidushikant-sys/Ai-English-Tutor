import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  Compass,
  Volume2,
  VolumeX,
  Play,
  Square,
  BookOpen,
  ChevronRight,
  Flame,
  Info,
  Settings,
  HelpCircle,
  Bookmark,
  Trash2,
  Plus,
  Calendar,
  TrendingUp,
  Award,
  Activity,
  Check,
  LayoutDashboard,
  MessageSquare,
  GraduationCap
} from "lucide-react";
import { ChatMessage, TeacherState, VocabItem, GrammarErrorItem, SessionRecord } from "./types";
import CoachAvatar from "./components/CoachAvatar";

// Suggestion topics to trigger interactive conversational feedback
const PRACTICE_PROMPTS = [
  {
    category: "Cafe Order",
    scenario: "Order a hot cup of coffee",
    hint: "I want a hot coffee and how much is it?",
    description: "Practice simple transactions."
  },
  {
    category: "Weekend Plans",
    scenario: "Talk about your weekend activities",
    hint: "Last Sunday I am going to the park with my dog.",
    description: "Practice past tense verbs."
  },
  {
    category: "Job Interview",
    scenario: "Introduce yourself to an interviewer",
    hint: "I have graduated from college since last year and I am search for a job.",
    description: "Practice professional tenses."
  },
  {
    category: "Travel & Hotels",
    scenario: "Ask front desk for checking in",
    hint: "Hi, I have a reservation and I is checking in today.",
    description: "Practice check-in vocabulary."
  }
];

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [speechRate, setSpeechRate] = useState<number>(0.95);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // Custom interactive system indicators
  const [teacherState, setTeacherState] = useState<TeacherState>({
    isSpeaking: false,
    isListening: false,
    isProcessing: false,
  });

  // Performance dashboard states
  const [streakCount, setStreakCount] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [correctAttempts, setCorrectAttempts] = useState<number>(0);
  const [lastAnalysis, setLastAnalysis] = useState<{
    original: string;
    isCorrect: boolean;
    corrections: string;
    suggestions: string;
    encouragement: string;
  } | null>(null);

  // Progress tracking database states
  const [activeTab, setActiveTab] = useState<"practice" | "dashboard">("practice");
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [grammarErrors, setGrammarErrors] = useState<GrammarErrorItem[]>([]);
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  
  // Quick-Add Vocabulary form states
  const [showAddVocabForm, setShowAddVocabForm] = useState<boolean>(false);
  const [vocabWordToAdd, setVocabWordToAdd] = useState<string>("");
  const [vocabMeaningToAdd, setVocabMeaningToAdd] = useState<string>("");
  const [vocabSentenceToAdd, setVocabSentenceToAdd] = useState<string>("");

  // Search & filter queries
  const [vocabSearchQuery, setVocabSearchQuery] = useState<string>("");
  const [grammarSearchQuery, setGrammarSearchQuery] = useState<string>("");

  // Status logs
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize dynamic persistent states with client storage
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem("cody_sessions");
      if (savedSessions) setSessions(JSON.parse(savedSessions));

      const savedErrors = localStorage.getItem("cody_grammar_errors");
      if (savedErrors) setGrammarErrors(JSON.parse(savedErrors));

      const savedVocab = localStorage.getItem("cody_vocab");
      if (savedVocab) setVocabList(JSON.parse(savedVocab));

      const savedStreak = localStorage.getItem("cody_streak");
      const savedTotal = localStorage.getItem("cody_total_attempts");
      const savedCorrect = localStorage.getItem("cody_correct_attempts");
      
      if (savedStreak) setStreakCount(parseInt(savedStreak));
      if (savedTotal) setTotalAttempts(parseInt(savedTotal));
      if (savedCorrect) setCorrectAttempts(parseInt(savedCorrect));
    } catch (e) {
      console.error("Failed to restore progress assets from localStorage:", e);
    }
  }, []);

  // Recognition reference & logs scroller
  const recognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Setup TTS speech synthesis voice profiles
  useEffect(() => {
    const handleVoicesChanged = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const availableVoices = window.speechSynthesis.getVoices();
        const enVoices = availableVoices.filter((v) =>
          v.lang.toLowerCase().startsWith("en")
        );
        setVoices(enVoices);

        const defaultChoice =
          enVoices.find((v) => v.name.includes("Google US English") || v.name.includes("Samantha")) ||
          enVoices[0];
        if (defaultChoice && !selectedVoice) {
          setSelectedVoice(defaultChoice.name);
        }
      }
    };

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
      handleVoicesChanged();
    }
  }, [selectedVoice]);

  // Setup Web Speech Recognition hooks
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setTeacherState((prev) => ({ ...prev, isListening: true }));
        setInterimTranscript("");
        setErrorMessage(null);
      };

      rec.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (final) {
          setUserInput(final);
          setInterimTranscript("");
          handleSubmitConversation(final);
        } else {
          setInterimTranscript(interim);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition error:", event.error);
        if (event.error === "not-allowed") {
          setErrorMessage("Microphone permission denied. Turn on microphone access in your browser settings bar.");
        } else {
          setErrorMessage(`Audio tracker error: ${event.error}. Feel free to type instead!`);
        }
        setTeacherState((prev) => ({ ...prev, isListening: false }));
      };

      rec.onend = () => {
        setTeacherState((prev) => ({ ...prev, isListening: false }));
        setInterimTranscript("");
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Sync scroll to chat logs bottom offset
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, teacherState.isProcessing]);

  // TTS Voice announcer
  const playVoiceSynthesis = (text: string) => {
    if (isAudioMuted || typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      const voiceObj = voices.find((v) => v.name === selectedVoice);
      if (voiceObj) utterance.voice = voiceObj;
    }

    utterance.rate = speechRate;
    utterance.pitch = 1.05;

    utterance.onstart = () => {
      setTeacherState((p) => ({ ...p, isSpeaking: true }));
    };

    utterance.onend = () => {
      setTeacherState((p) => ({ ...p, isSpeaking: false }));
    };

    utterance.onerror = () => {
      setTeacherState((p) => ({ ...p, isSpeaking: false }));
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopVoiceOnCommand = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setTeacherState((p) => ({ ...p, isSpeaking: false }));
  };

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      setErrorMessage("Speech recognition is not fully supported in your current browser session. We recommend Chrome!");
      return;
    }

    stopVoiceOnCommand();

    if (teacherState.isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  // Submit to Gemini Live Tutor API
  const handleSubmitConversation = async (textToSend: string) => {
    const textClean = textToSend.trim();
    if (!textClean) return;

    // User message payload
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      text: textClean,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setUserInput("");
    setErrorMessage(null);
    setTeacherState((prev) => ({ ...prev, isProcessing: true }));

    stopVoiceOnCommand();

    const mappedHistory = messages.slice(-10).map((m) => ({
      role: m.role,
      text: m.role === "user" ? m.text : m.speechText || m.text,
    }));

    try {
      const response = await fetch("/api/coach/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textClean,
          history: mappedHistory,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Server error while evaluating dialogue phrase.");
      }

      const coachData = await response.json();

      const coachMsg: ChatMessage = {
        id: Math.random().toString(),
        role: "model",
        text: coachData.speechText,
        speechText: coachData.speechText,
        isCorrect: coachData.analysis.isCorrect,
        corrections: coachData.analysis.corrections,
        suggestions: coachData.analysis.suggestions,
        encouragement: coachData.analysis.encouragement,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, coachMsg]);

      // Trigger metrics tracking engines
      recordLearningAttempt(
        textClean,
        coachData.analysis.isCorrect,
        coachData.analysis.corrections,
        coachData.analysis.suggestions
      );

      setLastAnalysis({
        original: textClean,
        isCorrect: coachData.analysis.isCorrect,
        corrections: coachData.analysis.corrections,
        suggestions: coachData.analysis.suggestions,
        encouragement: coachData.analysis.encouragement,
      });

      setTimeout(() => {
        playVoiceSynthesis(coachData.speechText);
      }, 150);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Something went wrong. Make sure you set the Gemini API key.");
    } finally {
      setTeacherState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  // Dedicated persistent learning recording handlers
  const recordLearningAttempt = (original: string, isCorrect: boolean, corrections: string, suggestions: string) => {
    const newTotal = totalAttempts + 1;
    const newCorrect = correctAttempts + (isCorrect ? 1 : 0);
    const newStreak = isCorrect ? streakCount + 1 : 0;

    setTotalAttempts(newTotal);
    setCorrectAttempts(newCorrect);
    setStreakCount(newStreak);

    localStorage.setItem("cody_total_attempts", newTotal.toString());
    localStorage.setItem("cody_correct_attempts", newCorrect.toString());
    localStorage.setItem("cody_streak", newStreak.toString());

    // Grouping practice sessions by day
    const todayStr = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    setSessions((prev) => {
      const existingIdx = prev.findIndex((s) => s.date === todayStr);
      let updated: SessionRecord[] = [];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          totalAttempts: updated[existingIdx].totalAttempts + 1,
          correctAttempts: updated[existingIdx].correctAttempts + (isCorrect ? 1 : 0),
        };
      } else {
        updated = [
          ...prev,
          {
            id: Math.random().toString(),
            date: todayStr,
            totalAttempts: 1,
            correctAttempts: isCorrect ? 1 : 0,
          },
        ];
      }
      localStorage.setItem("cody_sessions", JSON.stringify(updated));
      return updated;
    });

    // Save grammar mistakes persistently on correction
    if (!isCorrect) {
      setGrammarErrors((prev) => {
        if (prev.some((e) => e.original.toLowerCase().trim() === original.toLowerCase().trim())) {
          return prev;
        }
        const errorItem: GrammarErrorItem = {
          id: Math.random().toString(),
          original: original.trim(),
          corrected: suggestions?.trim() || "Suggested alternative phrasing pattern",
          explanation: corrections?.trim() || "Grammar guidance recommendation",
          savedAt: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        const updated = [errorItem, ...prev];
        localStorage.setItem("cody_grammar_errors", JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleSaveToVocabList = (word: string, meaning: string, sentence: string) => {
    const wordClean = word.trim();
    if (!wordClean) return;

    const newItem: VocabItem = {
      id: Math.random().toString(),
      word: wordClean,
      meaning: meaning.trim() || "Custom phrasing item",
      sentence: sentence.trim() || "Example usage sentence from practices",
      savedAt: new Date().toLocaleDateString(),
    };

    setVocabList((prev) => {
      if (prev.some((v) => v.word.toLowerCase() === wordClean.toLowerCase())) {
        return prev;
      }
      const updated = [newItem, ...prev];
      localStorage.setItem("cody_vocab", JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveFromVocabList = (id: string) => {
    setVocabList((prev) => {
      const updated = prev.filter((v) => v.id !== id);
      localStorage.setItem("cody_vocab", JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveGrammarError = (id: string) => {
    setGrammarErrors((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      localStorage.setItem("cody_grammar_errors", JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectScenario = (promptText: string) => {
    setUserInput(promptText);
  };

  const handleResetMetrics = () => {
    setMessages([]);
    setLastAnalysis(null);
    setStreakCount(0);
    setTotalAttempts(0);
    setCorrectAttempts(0);
    setSessions([]);
    setGrammarErrors([]);
    setVocabList([]);
    localStorage.removeItem("cody_total_attempts");
    localStorage.removeItem("cody_correct_attempts");
    localStorage.removeItem("cody_streak");
    localStorage.removeItem("cody_sessions");
    localStorage.removeItem("cody_grammar_errors");
    localStorage.removeItem("cody_vocab");
  };

  const accuracyPercent = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100;

  return (
    <div className="h-screen w-screen bg-slate-100 flex items-center justify-center p-0 md:p-4 overflow-hidden">
      {/* Immersive UI Container Window */}
      <div className="w-full h-full max-w-[1280px] max-h-[850px] bg-white rounded-none md:rounded-3xl shadow-2xl border-0 md:border-8 border-slate-200 flex flex-col overflow-hidden font-sans">
        
        {/* Header Navigation styled with "Immersive UI" aesthetic */}
        <header className="h-16 px-6 md:px-8 flex items-center justify-between bg-white border-b border-blue-100 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <h1 className="text-lg md:text-xl font-display font-bold text-slate-800 tracking-tight">
              Cody <span className="text-blue-500 font-medium">English Coach</span>
            </h1>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest hidden sm:inline">
                Gemini AI Active
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  showSettings 
                    ? "bg-blue-50 text-blue-600" 
                    : "text-slate-500 hover:text-blue-600 hover:bg-slate-50"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Voice Control</span>
              </button>

              <button
                onClick={handleResetMetrics}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                title="Reset session score and logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Primary Screen Area divided as Left (2/3 Avatar) and Right (1/3 Chat panel) */}
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left Side: Dynamic Humanoid Agent 3D Viewport with backgrid */}
          <section className="flex-1 lg:w-2/3 relative bg-gradient-to-br from-blue-55 via-blue-50/30 to-white flex flex-col overflow-hidden">
            
            {/* Grid Overlay for 3D depth feel styled from the design document */}
            <div 
              className="absolute inset-0 opacity-15 pointer-events-none" 
              style={{ 
                backgroundImage: "radial-gradient(#3b82f6 1px, transparent 1px)", 
                backgroundSize: "40px 40px" 
              }} 
            />

            {/* Float visual card 1: Accuracy gauge */}
            <div className="absolute top-6 left-6 p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-blue-100/30 shadow-md z-10 transition-all duration-300">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Grammar Accuracy</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-800 font-display">{accuracyPercent}%</span>
                <span className="text-xs text-slate-400 font-medium">({correctAttempts}/{totalAttempts || 0})</span>
              </div>
            </div>

            {/* Float visual card 2: Streak counter */}
            {streakCount > 0 && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute top-6 right-6 p-3 bg-orange-500 text-white rounded-2xl shadow-lg z-10 flex items-center gap-2"
              >
                <Flame className="w-5 h-5 animate-bounce" />
                <div>
                  <p className="text-[9px] font-mono leading-none text-orange-200 uppercase font-black">Streak Active</p>
                  <p className="text-sm font-black font-display">{streakCount} in a row!</p>
                </div>
              </motion.div>
            )}

            {/* Main Interactive 3D Canvas element wrapper */}
            <div className="flex-1 w-full min-h-[280px] lg:min-h-0 relative z-0 flex items-center justify-center">
              <CoachAvatar
                isSpeaking={teacherState.isSpeaking}
                isListening={teacherState.isListening}
                isProcessing={teacherState.isProcessing}
              />
            </div>

            {/* Floating state control triggers directly below model */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-center justify-center gap-3 z-10">
              {teacherState.isSpeaking ? (
                <button
                  onClick={stopVoiceOnCommand}
                  className="px-4 py-2 bg-red-500 text-white rounded-full text-xs font-semibold shadow-lg hover:bg-red-600 transition-all active:scale-95 flex items-center gap-1.5 animate-pulse"
                >
                  <Square className="w-3 h-3 fill-white" /> Speaking (Click to interrupt)
                </button>
              ) : teacherState.isListening ? (
                <button
                  onClick={toggleSpeechRecognition}
                  className="px-5 py-2.5 bg-green-500 text-white rounded-full text-xs font-semibold shadow-lg hover:bg-green-600 transition-all active:scale-95 flex items-center gap-1.5 animate-bounce"
                >
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" /> Listening (Speak now...)
                </button>
              ) : (
                <div className="px-4 py-1.5 bg-white/70 backdrop-blur-md text-slate-500 rounded-full text-xs font-semibold shadow-xs border border-slate-100">
                  🎙️ Use the microphone below to talk or click scenarios to learn sentences!
                </div>
              )}
            </div>

            {/* Settings drop drawer container panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-white border-t border-slate-100 p-4 relative z-20 shadow-xl"
                >
                  <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tutor Accent:</span>
                      {voices.length > 0 ? (
                        <select
                          value={selectedVoice}
                          onChange={(e) => {
                            setSelectedVoice(e.target.value);
                            stopVoiceOnCommand();
                          }}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white"
                        >
                          {voices.map((v) => (
                            <option key={v.name} value={v.name}>
                              {v.name} ({v.lang})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-400">Loading accents...</span>
                      )}
                    </div>

                    <div className="flex flex-col justify-center gap-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-500 uppercase">Speed Rate:</span>
                        <span className="font-mono font-bold text-blue-600">{speechRate}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.75"
                        max="1.25"
                        step="0.05"
                        value={speechRate}
                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-start lg:justify-center pt-2">
                      <button
                        onClick={() => setIsAudioMuted(!isAudioMuted)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold ${
                          isAudioMuted
                            ? "bg-red-50 text-red-600 border-red-100"
                            : "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"
                        }`}
                      >
                        {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        <span>{isAudioMuted ? "Volume Playback Muted" : "Voice On"}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </section>

          {/* Right Side: Robust Sidebar featuring Practice Chat & User Progress Dashboard modes */}
          <section className="w-full lg:w-1/3 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col h-[50%] lg:h-full overflow-hidden" id="session-dashboard-sidebar">
            
            {/* Elegant Tab Switcher - Fits Immersive UI styling guidelines */}
            <div className="flex border-b border-slate-150 bg-slate-50 p-2 gap-1 select-none shrink-0" id="sidebar-tab-navigation">
              <button
                type="button"
                onClick={() => setActiveTab("practice")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "practice"
                    ? "bg-white text-blue-600 shadow-sm border border-slate-100"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
                id="tab-practice"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Practice Chat
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-white text-blue-600 shadow-sm border border-slate-100"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
                id="tab-dashboard"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                User Dashboard
              </button>
            </div>

            {activeTab === "practice" ? (
              // PRACTICE TAB MODE (Original Conversational Dialogue Experience)
              <div className="flex-1 flex flex-col overflow-hidden" id="practice-tab-viewport">
                {/* Scrollable logs & Analyzers segment */}
                <div className="flex-1 p-5 md:p-6 overflow-y-auto space-y-6 flex flex-col" ref={chatScrollRef}>
                  
                  {/* Scenario selector triggers */}
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-widest">
                      <Compass className="w-4 h-4 text-blue-500 animate-spin-slow" />
                      <span>Practice Scenarios</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {PRACTICE_PROMPTS.map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectScenario(p.hint)}
                          className="text-left py-2 px-3 rounded-xl bg-white border border-slate-200/60 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-xs font-medium text-slate-700 flex items-center justify-between group shadow-3xs cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-blue-600 uppercase leading-none mb-0.5">{p.category}</span>
                            <span className="text-slate-800 tracking-tight leading-snug">{p.scenario}</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transform group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Analyzed Grammar Corrections Board (Styled in warm amber matching the Immersive theme exactly!) */}
                  <AnimatePresence mode="wait">
                    {lastAnalysis ? (
                      <motion.div
                        key={lastAnalysis.original}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-1 mb-2.5">
                          <span className="text-amber-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" /> Grammatical Evaluation
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            lastAnalysis.isCorrect 
                              ? "bg-green-100 text-green-700" 
                              : "bg-orange-100 text-orange-700"
                          }`}>
                            {lastAnalysis.isCorrect ? "Perfect English" : "Incorrect grammar"}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] text-slate-400 font-mono font-semibold">Before Correction:</p>
                            <p className="text-xs text-slate-600 line-through italic">&ldquo;{lastAnalysis.original}&rdquo;</p>
                          </div>

                          {!lastAnalysis.isCorrect && (
                            <div className="p-3 bg-white rounded-xl border border-amber-100 space-y-1">
                              <div className="flex justify-between items-center text-xs pb-1 border-b border-amber-50">
                                <span className="font-mono text-[9px] text-slate-450 uppercase">Try Saying Instead:</span>
                                <button
                                  type="button"
                                  onClick={() => handleSaveToVocabList(lastAnalysis.suggestions, "Correct grammar phrasing model", `Replacing sentence error: "${lastAnalysis.original}"`)}
                                  className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 active:scale-95 transition-colors cursor-pointer"
                                  title="Add correct structure to your Vocabulary Deck"
                                >
                                  <Bookmark className="w-3.5 h-3.5" /> Save Phrasing
                                </button>
                              </div>
                              <p className="text-xs font-bold text-slate-800 leading-relaxed pt-1">
                                {lastAnalysis.suggestions}
                              </p>
                            </div>
                          )}

                          <div className="bg-white/60 p-2.5 rounded-xl border border-amber-100/30 text-xs text-slate-700 leading-relaxed font-normal">
                            <span className="font-bold text-slate-800">Cody's Tip: </span>
                            {lastAnalysis.corrections}
                          </div>

                          <p className="text-xs italic text-indigo-600 font-semibold text-center border-t border-amber-200/50 pt-2.5 flex items-center justify-center gap-1.5">
                            <ThumbsUp className="w-3.5 h-3.5" /> &ldquo;{lastAnalysis.encouragement}&rdquo;
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 flex flex-col gap-2 items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">Tutor Cody Ready</span>
                        <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs">
                          Type your sentence below or speak to practice. Your live feedback, alternate pathways, and spelling checks will show up right here!
                        </p>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Chat Message transcripts panel list */}
                  <div className="space-y-4 pt-3 border-t border-slate-100 flex-1 flex flex-col min-h-[160px]">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 bg-white py-1">Chat transcript</p>
                    {messages.length === 0 ? (
                      <div className="text-center py-6 text-slate-300 text-xs">
                        No replies log yet during this speaking session.
                      </div>
                    ) : (
                      messages.map((item) => (
                        <div
                          key={item.id}
                          className={`flex gap-3 ${
                            item.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {item.role !== "user" && (
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex-shrink-0 flex items-center justify-center font-bold text-xs select-none">
                              C
                            </div>
                          )}
                          
                          <div className={`p-3.5 rounded-2xl max-w-[80%] ${
                            item.role === "user"
                              ? "bg-blue-600 text-white rounded-tr-none text-sm animate-fade-in"
                              : "bg-slate-100 text-slate-800 rounded-tl-none text-sm border border-slate-200/40"
                          }`}>
                            <p className="leading-relaxed">{item.text}</p>
                            
                            {item.role === "model" && item.speechText && (
                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-dashed border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => playVoiceSynthesis(item.speechText!)}
                                  className="text-[10px] font-bold py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-blue-600 hover:bg-blue-50/50 flex items-center gap-1 active:scale-95 transition-all shadow-3xs cursor-pointer"
                                  id={`listen-vocal-${item.id}`}
                                >
                                  <Play className="w-3 h-3 fill-blue-600 text-blue-600" /> Speak Out Loud
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleSaveToVocabList(item.text, "Dialogue sentence from Cody", "Extracted item from live practice transcript.")}
                                  className="text-[10px] font-bold py-1 px-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-500 flex items-center gap-1 active:scale-95 transition-colors cursor-pointer"
                                  title="Add to study vocabulary"
                                  id={`save-vocab-badge-${item.id}`}
                                >
                                  <Bookmark className="w-3 h-3 text-slate-400" /> Save Vocab
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    {/* Processing overlay state */}
                    {teacherState.isProcessing && (
                      <div className="flex gap-3 justify-start animate-pulse">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-400 flex-shrink-0 flex items-center justify-center font-bold text-xs">
                          ...
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-2xl rounded-tl-none border border-slate-100 text-slate-500 text-xs flex items-center gap-1.5">
                          Evaluating grammar phrasing...
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Error alerts widget overlay, placed safely */}
                {errorMessage && (
                  <div className="mx-6 my-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 animate-bounce" />
                    <span className="flex-1">{errorMessage}</span>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="text-[10px] font-bold text-red-500 px-1 hover:text-red-700 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Interactive User Input Form Bar structured matching Immersive UI exact mockup specifications */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
                  <div className="relative flex items-center">
                    
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (userInput.trim()) handleSubmitConversation(userInput);
                      }}
                      className="w-full relative flex items-center"
                    >
                      <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={
                          teacherState.isListening
                            ? "Speak clearly to Cody now..."
                            : "Type an English sentence to correct..."
                        }
                        disabled={teacherState.isListening}
                        className="w-full pl-6 pr-24 py-4 bg-white border border-slate-200 rounded-full shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm text-slate-800 placeholder-slate-400"
                        id="user-conversation-input"
                      />

                      {/* Absolute positioning of control buttons on the right side of input */}
                      <div className="absolute right-2.5 flex items-center gap-1.5">
                        
                        {/* Speech Dictation Mic Trigger */}
                        <button
                          type="button"
                          onClick={toggleSpeechRecognition}
                          className={`p-2 rounded-full transition-all cursor-pointer ${
                            teacherState.isListening
                              ? "bg-red-500 text-white animate-pulse shadow-md"
                              : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                          }`}
                          title={teacherState.isListening ? "Listening - Click to finish" : "Microphone Speech Input"}
                        >
                          {teacherState.isListening ? (
                            <MicOff className="w-4.5 h-4.5" />
                          ) : (
                            <Mic className="w-4.5 h-4.5" />
                          )}
                        </button>

                        {/* Send Message Trigger */}
                        <button
                          type="submit"
                          disabled={!userInput.trim() || teacherState.isProcessing || teacherState.isListening}
                          className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                          title="Send sentence for analysis"
                          id="send-conversation-btn"
                        >
                          <Send className="w-4.5 h-4.5" />
                        </button>
                        
                      </div>
                    </form>

                  </div>

                  {/* Status footer inside input zone */}
                  <div className="mt-3.5 flex justify-between items-center px-1 text-[10px] select-none text-slate-400">
                    <div className="flex items-center gap-1.5 uppercase font-bold tracking-wider">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        teacherState.isListening ? "bg-red-500 animate-ping" : "bg-blue-400"
                      }`}></span>
                      <span>{teacherState.isListening ? "Voice Mode Active" : "Interactive Input Mode"}</span>
                    </div>
                    <div className="flex gap-2 font-semibold">
                      <span>{voices.length} synthesizer voices available</span>
                    </div>
                  </div>

                  {/* Interim voice transcribing visual block */}
                  {interimTranscript && (
                    <div className="absolute bottom-20 left-6 right-6 bg-slate-900/90 text-white px-4 py-2 rounded-2xl text-xs font-mono shadow-lg flex items-center gap-2 z-10 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                      <p className="line-clamp-1 italic">&ldquo;{interimTranscript}&rdquo;</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // USER PROGRESS DASHBOARD TAB MODE
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50" id="progress-dashboard-viewport">
                
                {/* Scrollable Dashboard Pane */}
                <div className="flex-1 p-5 md:p-6 overflow-y-auto space-y-6">
                  
                  {/* Streak & Core Stat Dashboard Row Cards */}
                  <div className="grid grid-cols-2 gap-3" id="dashboard-numeric-metrics-grid">
                    
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-3xs flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Evaluations</span>
                      </div>
                      <div className="pt-2">
                        <p className="text-2xl font-black text-slate-800 leading-none">{totalAttempts}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">Sentences checked</p>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-3xs flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Grammar Score</span>
                      </div>
                      <div className="pt-2">
                        <p className="text-2xl font-black text-slate-800 leading-none">{accuracyPercent}%</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">Correct grammar tenses</p>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-3xs flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <BookOpen className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Vocabs Logged</span>
                      </div>
                      <div className="pt-2">
                        <p className="text-2xl font-black text-slate-800 leading-none">{vocabList.length}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">Active flashcards</p>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-3xs flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="w-4 h-4 text-purple-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Active Days</span>
                      </div>
                      <div className="pt-2">
                        <p className="text-2xl font-black text-slate-800 leading-none">{sessions.length || 1}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">Practice session records</p>
                      </div>
                    </div>

                  </div>

                  {/* ACTIVE STUDY STREAK BLOCK */}
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <Flame className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-100">Daily Streak Progress</p>
                        <h4 className="text-base font-black tracking-tight">{streakCount} Sentences Answered Correctly</h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-orange-200">Level</p>
                      <p className="text-xs font-black bg-white/25 px-2 py-0.5 rounded-full mt-0.5">
                        {streakCount > 10 ? "Fluent Explorer" : streakCount > 4 ? "Tense Master" : "Language Novice"}
                      </p>
                    </div>
                  </div>

                  {/* VOCABULARY LEARNED DECK EXPANSION */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-3xs space-y-4" id="dashboard-vocabulary-center">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <GraduationCap className="w-4 h-4 text-emerald-500" />
                        <h3 className="text-xs font-bold uppercase tracking-widest">My Vocabulary Deck ({vocabList.length})</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddVocabForm(!showAddVocabForm)}
                        className="py-1 px-2.5 bg-blue-55 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
                        id="toggle-vocab-form-btn"
                      >
                        {showAddVocabForm ? "Hide Form" : "+ Add Word"}
                      </button>
                    </div>

                    {/* Expandable Manual Add Vocab form block */}
                    <AnimatePresence>
                      {showAddVocabForm && (
                        <motion.form
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (vocabWordToAdd.trim()) {
                              handleSaveToVocabList(vocabWordToAdd, vocabMeaningToAdd, vocabSentenceToAdd);
                              setVocabWordToAdd("");
                              setVocabMeaningToAdd("");
                              setVocabSentenceToAdd("");
                              setShowAddVocabForm(false);
                            }
                          }}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-2.5 overflow-hidden"
                          id="manual-vocab-add-form"
                        >
                          <div>
                            <label className="text-[9px] font-black uppercase text-slate-400">Vocabulary Word / Key Phrase*</label>
                            <input
                              type="text"
                              required
                              value={vocabWordToAdd}
                              onChange={(e) => setVocabWordToAdd(e.target.value)}
                              placeholder="e.g. Reservation"
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg mt-0.5 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-slate-400">Meaning / Context Translation</label>
                            <input
                              type="text"
                              value={vocabMeaningToAdd}
                              onChange={(e) => setVocabMeaningToAdd(e.target.value)}
                              placeholder="e.g. Booking a seat or table in advance"
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg mt-0.5 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 font-medium">Example Practice Sentence</label>
                            <input
                              type="text"
                              value={vocabSentenceToAdd}
                              onChange={(e) => setVocabSentenceToAdd(e.target.value)}
                              placeholder="e.g. I made a dinner reservation for tomorrow night."
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg mt-0.5 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
                          >
                            Save Word to Desk
                          </button>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    {/* Vocab filter search bar */}
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={vocabSearchQuery}
                        onChange={(e) => setVocabSearchQuery(e.target.value)}
                        placeholder="Search word deck..."
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400"
                        id="vocab-deck-search"
                      />
                    </div>

                    {/* List Grid view of vocabulary cards */}
                    <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1" id="vocab-items-scroller">
                      {vocabList.length === 0 ? (
                        <p className="text-center text-[11px] text-slate-400 italic py-4">No vocabulary words bookmarked yet. Tap "Save to Vocab" inside chat logs or add manually!</p>
                      ) : (vocabSearchQuery ? vocabList.filter(item => item.word.toLowerCase().includes(vocabSearchQuery.toLowerCase()) || item.meaning.toLowerCase().includes(vocabSearchQuery.toLowerCase())) : vocabList).map((item) => (
                        <div
                          key={item.id}
                          className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-150 relative group flex flex-col hover:bg-white hover:shadow-2xs transition-all"
                          id={`vocab-item-card-${item.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 leading-snug">
                              📘 {item.word}
                            </span>
                            <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-600">
                              <button
                                type="button"
                                onClick={() => playVoiceSynthesis(`${item.word}. Usage context: ${item.sentence}`)}
                                className="p-1 hover:bg-white hover:text-blue-500 rounded-md transition-colors cursor-pointer"
                                title="Synthesizer: Listen word pronunciation"
                              >
                                <Play className="w-3.5 h-3.5 fill-current text-blue-500" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveFromVocabList(item.id)}
                                className="p-1 hover:bg-white hover:text-red-500 rounded-md transition-colors cursor-pointer text-slate-300"
                                title="Remove word from active study deck"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          
                          {item.meaning && (
                            <p className="text-[10px] text-slate-500 italic mt-1 leading-snug">
                              Meaning: {item.meaning}
                            </p>
                          )}
                          
                          {item.sentence && (
                            <div className="p-1.5 bg-white border border-slate-100 rounded-lg mt-1.5 text-[10px] text-slate-600 font-medium tracking-tight">
                              Usage: &ldquo;<span className="font-semibold text-slate-800">{item.sentence}</span>&rdquo;
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                  </div>

                  {/* MASTERED GRAMMAR ERRORS LEDGER */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-3xs space-y-4" id="dashboard-grammar-ledger">
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <h3 className="text-xs font-bold uppercase tracking-widest">Grammar Errors Tracker ({grammarErrors.length})</h3>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={grammarSearchQuery}
                        onChange={(e) => setGrammarSearchQuery(e.target.value)}
                        placeholder="Search errors database..."
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400"
                        id="grammar-errors-search"
                      />
                    </div>

                    <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1" id="grammar-errors-scroller">
                      {grammarErrors.length === 0 ? (
                        <p className="text-center text-[10px] text-slate-400 italic py-4 flex flex-col items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          No active grammar errors recorded yet. Practice checking sentences with Cody!
                        </p>
                      ) : (grammarSearchQuery ? grammarErrors.filter(item => item.original.toLowerCase().includes(grammarSearchQuery.toLowerCase()) || item.corrected.toLowerCase().includes(grammarSearchQuery.toLowerCase()) || item.explanation.toLowerCase().includes(grammarSearchQuery.toLowerCase())) : grammarErrors).map((item) => (
                        <div
                          key={item.id}
                          className="bg-amber-50/40 p-3 rounded-xl border border-amber-100/50 hover:bg-amber-50/80 transition-all flex flex-col space-y-2"
                        >
                          <div>
                            <span className="text-[9px] font-mono uppercase bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">Mistake</span>
                            <p className="text-xs text-slate-500 line-through italic mt-1 leading-snug pl-1">
                              &ldquo;{item.original}&rdquo;
                            </p>
                          </div>

                          <div>
                            <span className="text-[9px] font-mono uppercase bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded">Learned Alternative</span>
                            <p className="text-xs font-bold text-slate-800 mt-1 leading-snug pl-1">
                              {item.corrected}
                            </p>
                          </div>

                          {item.explanation && (
                            <p className="text-[10px] text-slate-600 bg-white/70 p-2 rounded-lg border border-amber-100/30">
                              <span className="font-bold text-slate-700 font-sans">Why: </span>
                              {item.explanation}
                            </p>
                          )}

                          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-amber-500/10">
                            <span className="text-[9px] text-slate-400">{item.savedAt}</span>
                            
                            <div className="flex gap-2">
                              {/* Mastered/Dismiss trigger */}
                              <button
                                type="button"
                                onClick={() => handleRemoveGrammarError(item.id)}
                                className="py-0.5 px-2 bg-white hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 text-[10px] font-bold rounded-lg border border-slate-200 hover:border-emerald-100 transition-colors cursor-pointer"
                                title="Mark grammatical tense category as Mastered"
                                id={`mastered-err-${item.id}`}
                              >
                                Mastered ✓
                              </button>

                              {/* Try Again / Set input trigger */}
                              <button
                                type="button"
                                onClick={() => {
                                  setUserInput(item.original);
                                  setActiveTab("practice");
                                }}
                                className="py-0.5 px-2 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Preset this sentence in inputs to retry master evaluation"
                                id={`retry-err-${item.id}`}
                              >
                                Try Again
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>

                  {/* DATA DISCIPLINE MAINTENANCE ROW */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={handleResetMetrics}
                      className="text-[10px] text-red-500 hover:text-red-700 font-bold hover:underline cursor-pointer"
                    >
                      ⚠️ Reset entire progress database and files
                    </button>
                  </div>

                </div>

              </div>
            )}

          </section>

        </main>

        {/* Lower Status Info Bar */}
        <footer className="h-10 bg-slate-100 border-t border-slate-200 px-6 md:px-8 flex items-center justify-between text-[10px] text-slate-500 font-medium select-none shrink-0">
          <div className="flex gap-4">
            <span>Server Ingress: Port 3000</span>
            <span>Synthesizer: HTML5 Web Speech API</span>
          </div>
          <div className="flex gap-4 items-center">
            <span className="flex items-center gap-1">
              Playback Volume
              <div className="w-12 h-1 bg-slate-300 rounded-full overflow-hidden">
                <div className={`h-full bg-blue-500 transition-all ${isAudioMuted ? "w-0" : "w-10/12"}`} />
              </div>
            </span>
            <span className="uppercase text-[9px] font-mono tracking-widest">{selectedVoice ? selectedVoice.split(" ")[0] : "English Tutor Native"}</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
