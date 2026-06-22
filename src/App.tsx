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
  Settings,
  Bookmark,
  Trash2,
  Calendar,
  Award,
  Activity,
  MessageSquare,
  LayoutDashboard,
  GraduationCap,
  Sparkle
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
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(true); // Dev default is true for easy visual controls
  
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

  // Nav/Toggle states
  const [sidebarActiveTab, setSidebarActiveTab] = useState<"coach" | "dashboard" | "vocab">("coach");
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [grammarErrors, setGrammarErrors] = useState<GrammarErrorItem[]>([]);
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  
  // Form and search states
  const [showAddVocabForm, setShowAddVocabForm] = useState<boolean>(false);
  const [vocabWordToAdd, setVocabWordToAdd] = useState<string>("");
  const [vocabMeaningToAdd, setVocabMeaningToAdd] = useState<string>("");
  const [vocabSentenceToAdd, setVocabSentenceToAdd] = useState<string>("");
  const [vocabSearchQuery, setVocabSearchQuery] = useState<string>("");
  const [grammarSearchQuery, setGrammarSearchQuery] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New persistent voice preference states
  const [accentPreference, setAccentPreference] = useState<"neutral" | "indian" | "british">("neutral");
  const [genderPreference, setGenderPreference] = useState<"female" | "male">("female");
  const [speedPreference, setSpeedPreference] = useState<"slow" | "normal" | "fast">("normal");

  // Recognition reference & logs scroller
  const recognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Synchronize dynamic persistent states with client storage
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem("serena_sessions");
      if (savedSessions) setSessions(JSON.parse(savedSessions));

      const savedErrors = localStorage.getItem("serena_grammar_errors");
      if (savedErrors) setGrammarErrors(JSON.parse(savedErrors));

      const savedVocab = localStorage.getItem("serena_vocab");
      if (savedVocab) setVocabList(JSON.parse(savedVocab));

      const savedStreak = localStorage.getItem("serena_streak");
      const savedTotal = localStorage.getItem("serena_total_attempts");
      const savedCorrect = localStorage.getItem("serena_correct_attempts");
      
      if (savedStreak) setStreakCount(parseInt(savedStreak));
      if (savedTotal) setTotalAttempts(parseInt(savedTotal));
      if (savedCorrect) setCorrectAttempts(parseInt(savedCorrect));

      // Voice Preferences
      const savedAccent = localStorage.getItem("serena_accent");
      if (savedAccent) setAccentPreference(savedAccent as any);

      const savedGender = localStorage.getItem("serena_gender");
      if (savedGender) setGenderPreference(savedGender as any);

      const savedSpeed = localStorage.getItem("serena_speed");
      if (savedSpeed) setSpeedPreference(savedSpeed as any);
    } catch (e) {
      console.error("Failed to restore progress assets from localStorage:", e);
    }
  }, []);

  // Sync preference states back to localstorage
  useEffect(() => {
    localStorage.setItem("serena_accent", accentPreference);
  }, [accentPreference]);

  useEffect(() => {
    localStorage.setItem("serena_gender", genderPreference);
  }, [genderPreference]);

  useEffect(() => {
    localStorage.setItem("serena_speed", speedPreference);
  }, [speedPreference]);

  // Load synthesized voice profiles into local state
  useEffect(() => {
    const handleVoicesChanged = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const availableVoices = window.speechSynthesis.getVoices();
        const enVoices = availableVoices.filter((v) =>
          v.lang.toLowerCase().startsWith("en")
        );
        setVoices(enVoices);
      }
    };

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
      handleVoicesChanged();
    }
  }, []);

  // Automatically find & map the best available system voice based on accent + gender preference
  useEffect(() => {
    if (voices.length === 0) return;

    const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));

    // Filter by accent preference (United States, India, Great Britain)
    let accentFiltered = enVoices;
    if (accentPreference === "neutral") {
      accentFiltered = enVoices.filter((v) =>
        v.lang.toLowerCase().includes("us") || v.lang.toLowerCase().includes("ca")
      );
      if (accentFiltered.length === 0) accentFiltered = enVoices;
    } else if (accentPreference === "indian") {
      accentFiltered = enVoices.filter((v) => v.lang.toLowerCase().includes("in"));
      if (accentFiltered.length === 0) {
        accentFiltered = enVoices.filter((v) =>
          v.lang.toLowerCase().includes("gb") || v.lang.toLowerCase().includes("uk")
        );
      }
    } else if (accentPreference === "british") {
      accentFiltered = enVoices.filter((v) =>
        v.lang.toLowerCase().includes("gb") || v.lang.toLowerCase().includes("uk")
      );
      if (accentFiltered.length === 0) accentFiltered = enVoices;
    }

    // Filter by voice gender keyword
    const femaleKeywords = [
      "samantha", "zira", "susan", "hazel", "victoria", "karen", "tessa", 
      "moira", "veena", "heera", "rani", "priya", "fiona", "female", 
      "elena", "lisa", "serena", "siri", "microsoft zira"
    ];
    const maleKeywords = [
      "david", "george", "mark", "ravi", "heera_male", "male", 
      "microsoft david", "rishi", "daniel", "peter", "guy", "google uk"
    ];

    let finalVoice = null;
    if (genderPreference === "female") {
      finalVoice = accentFiltered.find((v) =>
        femaleKeywords.some((keyword) => v.name.toLowerCase().includes(keyword))
      );
    } else {
      finalVoice = accentFiltered.find((v) =>
        maleKeywords.some((keyword) => v.name.toLowerCase().includes(keyword))
      );
    }

    if (!finalVoice) finalVoice = accentFiltered[0]; // Accent fallback
    if (!finalVoice) finalVoice = enVoices[0]; // Total English fallback

    if (finalVoice) {
      setSelectedVoice(finalVoice.name);
    }
  }, [voices, accentPreference, genderPreference]);

  // Adjust Speeds
  useEffect(() => {
    if (speedPreference === "slow") {
      setSpeechRate(0.75);
    } else if (speedPreference === "normal") {
      setSpeechRate(1.0);
    } else if (speedPreference === "fast") {
      setSpeechRate(1.25);
    }
  }, [speedPreference]);

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
  }, [messages, teacherState.isProcessing, interimTranscript]);

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
    utterance.pitch = genderPreference === "female" ? 1.05 : 0.95;

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
      setErrorMessage("Speech recognition is not fully supported in your current browser session. We recommend Google Chrome!");
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
      setErrorMessage(err.message || "Something went wrong. Make sure you set the Gemini API key in Settings.");
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

    localStorage.setItem("serena_total_attempts", newTotal.toString());
    localStorage.setItem("serena_correct_attempts", newCorrect.toString());
    localStorage.setItem("serena_streak", newStreak.toString());

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
      localStorage.setItem("serena_sessions", JSON.stringify(updated));
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
        localStorage.setItem("serena_grammar_errors", JSON.stringify(updated));
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
      meaning: meaning.trim() || "Extracted phrase from dialogue",
      sentence: sentence.trim() || "Example usage sentence from Serena",
      savedAt: new Date().toLocaleDateString(),
    };

    setVocabList((prev) => {
      if (prev.some((v) => v.word.toLowerCase() === wordClean.toLowerCase())) {
        return prev;
      }
      const updated = [newItem, ...prev];
      localStorage.setItem("serena_vocab", JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveFromVocabList = (id: string) => {
    setVocabList((prev) => {
      const updated = prev.filter((v) => v.id !== id);
      localStorage.setItem("serena_vocab", JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveGrammarError = (id: string) => {
    setGrammarErrors((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      localStorage.setItem("serena_grammar_errors", JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectScenario = (promptHint: string) => {
    setUserInput(promptHint);
  };

  const handleResetMetrics = () => {
    if (confirm("Are you sure you want to clear your learning history? This will delete all saved vocabulary and grammar errors.")) {
      setMessages([]);
      setLastAnalysis(null);
      setStreakCount(0);
      setTotalAttempts(0);
      setCorrectAttempts(0);
      setSessions([]);
      setGrammarErrors([]);
      setVocabList([]);
      localStorage.removeItem("serena_total_attempts");
      localStorage.removeItem("serena_correct_attempts");
      localStorage.removeItem("serena_streak");
      localStorage.removeItem("serena_sessions");
      localStorage.removeItem("serena_grammar_errors");
      localStorage.removeItem("serena_vocab");
    }
  };

  const accuracyPercent = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100;

  return (
    <div className="h-screen w-screen bg-slate-100 flex items-center justify-center p-0 md:p-3 overflow-hidden text-slate-800">
      {/* Immersive Window Frame */}
      <div className="w-full h-full max-w-[1380px] max-h-[920px] bg-white rounded-none md:rounded-2xl shadow-xl border-0 md:border-4 border-slate-200/60 flex flex-col overflow-hidden font-sans">
        
        {/* Upper Header Nav */}
        <header className="h-14 px-6 md:px-8 flex items-center justify-between bg-white border-b border-slate-100 shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-sm">S</span>
            </div>
            <div>
              <h1 className="text-sm md:text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                Serena <span className="text-blue-500 font-semibold px-1.5 py-0.5 bg-blue-50 rounded text-[10px] tracking-normal">AI English Coach</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Streak indicator */}
            {streakCount > 0 && (
              <div className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full text-xs font-bold leading-none">
                <Flame className="w-3.5 h-3.5 fill-orange-500 animate-pulse text-orange-500" />
                <span>Streak: {streakCount}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden xs:inline">
                Gemini Active
              </span>
            </div>
            
            <div className="h-5 w-px bg-slate-200"></div>

            <button
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isAudioMuted 
                  ? "bg-red-50 text-red-500 hover:bg-red-100" 
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
              }`}
              title={isAudioMuted ? "Unmute vocal playback" : "Mute vocal playback"}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Primary Screen Area - LARGE CENTRAL CHAT LEFT (2/3) + DASHBOARD & AVATAR RIGHT (1/3) */}
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT COLUMN: Large, Central Practice Conversation Workspace (2/3 size) */}
          <section className="flex-1 lg:w-2/3 flex flex-col bg-slate-50/50 relative overflow-hidden">
            
            {/* Subtle Chat grid background pattern */}
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none" 
              style={{ 
                backgroundImage: "radial-gradient(#3b82f6 0.75px, transparent 0.75px)", 
                backgroundSize: "24px 24px" 
              }} 
            />

            {/* Quick Practice Scenarios Tag Drawer (Placed at the top of the chat area) */}
            <div className="px-5 py-2.5 bg-white border-b border-slate-100 flex items-center gap-3 overflow-x-auto shrink-0 select-none z-10 scrollbar-none">
              <span className="text-[9px] font-bold bg-slate-100 text-slate-500 uppercase tracking-widest px-2 py-1 rounded whitespace-nowrap flex items-center gap-1">
                <Compass className="w-3 h-3 text-blue-500" /> Practice Scenarios:
              </span>
              <div className="flex gap-2">
                {PRACTICE_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectScenario(p.hint)}
                    className="py-1 px-3 text-xs bg-blue-50/40 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200/50 hover:border-blue-200 rounded-full transition-all whitespace-nowrap cursor-pointer flex flex-col items-start font-medium"
                    title={p.description}
                  >
                    <span className="text-[9px] font-bold text-blue-500 tracking-tight leading-none mb-0.5">{p.category}</span>
                    <span className="leading-none">{p.scenario}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive WhatsApp-Style Chat bubble thread log */}
            <div 
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 flex flex-col relative z-0"
              id="whatsapp-chat-thread"
            >
              {messages.length === 0 ? (
                // Centered Hello World Greeting Card
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto my-auto space-y-4">
                  <div className="w-12 h-12 rounded-full bg-blue-150/45 flex items-center justify-center shadow-xs">
                    <Sparkles className="w-6 h-6 text-blue-600 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Start Learning with Serena</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Write or speak a complete sentence in English. Serena will analyze your phrasing, spelling, and offer natural corrections immediately!
                    </p>
                  </div>
                  <div className="w-full flex flex-col gap-2 pt-2">
                    <button 
                      onClick={() => handleSelectScenario("I want a hot coffee and how much is it?")}
                      className="w-full py-2 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium transition-all"
                    >
                      💡 Try: "I want a hot coffee..."
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((item) => {
                  const isUser = item.role === "user";
                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5`}
                      id={`message-block-${item.id}`}
                    >
                      {/* Avatar initials or username badge */}
                      <span className="text-[9px] font-bold text-slate-400 px-1 font-mono">
                        {isUser ? "You" : "Serena Coach"}
                      </span>

                      {/* Message Bubble - Styled cleanly like WhatsApp with modern curves */}
                      <div
                        className={`p-4 shadow-3xs max-w-[85%] sm:max-w-[70%] relative ${
                          isUser
                            ? "bg-blue-600 text-white rounded-3xl rounded-tr-none text-sm animate-fade-in"
                            : "bg-white text-slate-800 rounded-3xl rounded-tl-none text-sm border border-slate-100"
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-line break-words font-medium">
                          {item.text}
                        </p>
                        
                        {/* Audio play, pronunciation, and vocabulary bookmarks for Model response */}
                        {!isUser && item.speechText && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-dashed border-slate-100">
                            <button
                              type="button"
                              onClick={() => playVoiceSynthesis(item.speechText!)}
                              className="text-[10px] font-bold py-1 px-2.5 bg-blue-50/50 border border-blue-105 rounded-lg text-blue-600 hover:bg-blue-150/50 flex items-center gap-1 active:scale-95 transition-all shadow-3xs cursor-pointer"
                              id={`speak-vocal-${item.id}`}
                            >
                              <Play className="w-3 h-3 fill-blue-600 text-blue-600" /> Listen Again
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => handleSaveToVocabList(item.text, "Conversational phrase from Serena", "Extracted from live chat transcript.")}
                              className="text-[10px] font-bold py-1 px-2 bg-slate-50 border border-slate-200/60 hover:border-blue-200 hover:text-blue-600 rounded-lg text-slate-500 flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                              title="Bookmark vocabulary phrase"
                              id={`save-vocab-${item.id}`}
                            >
                              <Bookmark className="w-3 h-3 text-slate-400" /> Keep Phrasing
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Grammatical evaluations and learning feedback card tied directly underneath the response bubble */}
                      {!isUser && (
                        <div className="w-full max-w-[85%] sm:max-w-[70%]">
                          <div className={`p-3.5 mt-1.5 rounded-2xl text-xs space-y-2.5 ${
                            item.isCorrect 
                              ? "bg-emerald-50/60 border border-emerald-100 text-slate-700" 
                              : "bg-amber-50/75 border border-amber-100/80 text-slate-700"
                          }`}>
                            <div className="flex items-center justify-between gap-1.5 border-b pb-1.5 border-slate-200/10">
                              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 font-mono">
                                <Sparkle className={`w-3 h-3 ${item.isCorrect ? "text-emerald-500" : "text-amber-500 text-amber-500"}`} /> 
                                {item.isCorrect ? "Grammar Check: Perfect" : "Grammar Advice"}
                              </span>
                            </div>

                            {!item.isCorrect && item.suggestions && (
                              <div className="bg-white/95 p-2 rounded-xl border border-amber-100 shadow-3xs space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Better Phrase Path:</p>
                                <p className="text-xs font-bold text-slate-800 select-all leading-tight">
                                  {item.suggestions}
                                </p>
                              </div>
                            )}

                            {item.corrections && (
                              <p className="text-xs leading-relaxed text-slate-600">
                                <span className="font-bold text-slate-700">Guide:</span> {item.corrections}
                              </p>
                            )}

                            {item.encouragement && (
                              <p className="text-[11px] font-medium text-blue-600/90 italic">
                                &ldquo;{item.encouragement}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Real-time processing loader */}
              {teacherState.isProcessing && (
                <div className="flex flex-col items-start space-y-1 animate-pulse">
                  <span className="text-[9px] font-bold text-slate-400 px-1 font-mono">Serena AI Coach</span>
                  <div className="bg-white px-4 py-3 rounded-3xl rounded-tl-none border border-slate-100 text-slate-500 text-xs flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span>Evaluating grammatical accuracy...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Error Notifications Panel */}
            {errorMessage && (
              <div className="mx-6 my-2 p-3 rounded-xl bg-red-50 border border-red-105 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
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

            {/* LARGE CONVERSATION INPUT ZONE - WHATSAPP STYLE PILL */}
            <div className="p-4 md:p-5 border-t border-slate-100 bg-white shrink-0 z-10">
              <div className="relative flex items-center max-w-4xl mx-auto">
                
                {/* Interim Voice transcribing feedback bubble floating quietly over inputs */}
                {interimTranscript && (
                  <div className="absolute -top-14 left-4 right-4 bg-slate-900 border border-slate-800 text-white px-4 py-2.5 rounded-2xl text-xs font-mono shadow-md flex items-center gap-2 z-10 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <p className="line-clamp-1 italic text-slate-100">&ldquo;{interimTranscript}&rdquo;</p>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (userInput.trim()) handleSubmitConversation(userInput);
                  }}
                  className="w-full relative flex items-center"
                >
                  {/* TEXT BOX FOR TYPING ENGLISH SENTENCES */}
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder={
                      teacherState.isListening
                        ? "Speak clearly to Serena now..."
                        : "Type an English sentence to correct..."
                    }
                    disabled={teacherState.isListening}
                    className="w-full pl-6 pr-24 py-3.5 bg-slate-50 border border-slate-200/80 rounded-full focus:outline-none focus:ring-2 focus:focus:ring-blue-500/15 focus:border-blue-500/80 focus:bg-white transition-all text-sm text-slate-800 placeholder-slate-400"
                    id="user-typed-input"
                  />

                  {/* ABSOLUTE POSITIONED CONTROL PILLS ON THE RIGHT SIDE OF THE INPUT BOX */}
                  <div className="absolute right-2 flex items-center gap-1.5">
                    
                    {/* MICROPHONE BUTTON SPEAK CONTAINER */}
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={`p-2 rounded-full transition-all cursor-pointer ${
                        teacherState.isListening
                          ? "bg-red-500 text-white animate-pulse shadow-md"
                          : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      }`}
                      title={teacherState.isListening ? "Listening - Click to send" : "Microphone: Speak English sentence"}
                      id="speech-dictation-mic-btn"
                    >
                      {teacherState.isListening ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </button>

                    {/* SEND BUTTON TRIGGER */}
                    <button
                      type="submit"
                      disabled={!userInput.trim() || teacherState.isProcessing || teacherState.isListening}
                      className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-95"
                      title="Send sentence for analysis"
                      id="submit-send-msg"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    
                  </div>
                </form>

              </div>

              {/* Tiny auxiliary status line in bar */}
              <div className="max-w-4xl mx-auto mt-2.5 flex justify-between items-center px-2 text-[10px] text-slate-400 select-none">
                <div className="flex items-center gap-1 uppercase font-bold tracking-wider">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    teacherState.isListening ? "bg-red-500 animate-pulse" : "bg-emerald-400"
                  }`} />
                  <span>{teacherState.isListening ? "Voice capture active" : "Ready to correct grammar"}</span>
                </div>
                <div className="flex gap-1.5 font-bold text-slate-450">
                  <span>Accent: {accentPreference}</span>
                  <span>•</span>
                  <span>Speed: {speedPreference}</span>
                </div>
              </div>

            </div>

          </section>

          {/* RIGHT COLUMN: Sidebar hosting Serena Avatar, Settings and Logs tabs (1/3 size) */}
          <section className="w-full lg:w-1/3 bg-white border-t lg:border-t-0 lg:border-l border-slate-250/50 flex flex-col h-[60%] lg:h-full overflow-hidden shrink-0 select-none" id="coach-dashboard-panel-sidebar">
            
            {/* Swappable Sidebar navigation */}
            <div className="flex border-b border-slate-100 bg-slate-50 p-2 gap-1 shrink-0" id="sidebar-tab-switcher">
              <button
                type="button"
                onClick={() => setSidebarActiveTab("coach")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  sidebarActiveTab === "coach"
                    ? "bg-white text-blue-600 shadow-3xs border border-slate-100"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Coach Profile
              </button>

              <button
                type="button"
                onClick={() => setSidebarActiveTab("vocab")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  sidebarActiveTab === "vocab"
                    ? "bg-white text-blue-600 shadow-3xs border border-slate-100"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                Vocabulary ({vocabList.length})
              </button>
              
              <button
                type="button"
                onClick={() => setSidebarActiveTab("dashboard")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  sidebarActiveTab === "dashboard"
                    ? "bg-white text-blue-600 shadow-3xs border border-slate-100"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-orange-500" />
                Analytics
              </button>
            </div>

            {/* ACTIVE SIDEBAR TAB DISPLAY */}
            <div className="flex-1 flex flex-col overflow-hidden" id="sidebar-tab-content-container">
              
              {sidebarActiveTab === "coach" && (
                // COACH TAB: Smaller Avatar layout placing controls securely below Serena profile
                <div className="flex-1 flex flex-col overflow-y-auto p-5 space-y-5" id="sidebar-coach-profile">
                  
                  {/* Avatar card: Beautiful smaller viewport nested inside a container card */}
                  <div className="w-full bg-slate-50 rounded-2xl p-1 border border-slate-100 shadow-xs flex flex-col overflow-hidden">
                    <div className="w-full h-44 relative bg-radial from-blue-50 to-white flex items-center justify-center overflow-hidden rounded-xl">
                      <CoachAvatar
                        isSpeaking={teacherState.isSpeaking}
                        isListening={teacherState.isListening}
                        isProcessing={teacherState.isProcessing}
                      />

                      {/* Speaking overlay interrupter button */}
                      {teacherState.isSpeaking && (
                        <button
                          onClick={stopVoiceOnCommand}
                          className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 bg-red-500/90 text-white rounded-lg text-[10px] font-bold shadow-xs hover:bg-red-600 transition-all flex items-center gap-1 backdrop-blur-xs cursor-pointer"
                        >
                          <Square className="w-2.5 h-2.5 fill-white text-white" /> Stop Voice
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ACCENT AND VOICE SETTINGS - Dropdowns & buttons for precise speech customizations */}
                  <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-150 shadow-3sm space-y-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider pb-1.5 border-b border-slate-200/50">
                      <Settings className="w-3.5 h-3.5 text-blue-500" />
                      <span>Speech Settings</span>
                    </div>

                    {/* 1. Dropdown menu to select accent (Neutral English, Indian English, British English) */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Tutor Accent:
                      </label>
                      <select
                        value={accentPreference}
                        onChange={(e) => {
                          setAccentPreference(e.target.value as any);
                          stopVoiceOnCommand();
                        }}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10 cursor-pointer"
                      >
                        <option value="neutral">Neutral English (US / Canada)</option>
                        <option value="indian">Indian English (India)</option>
                        <option value="british">British English (UK)</option>
                      </select>
                    </div>

                    {/* 2. Option to choose female or male voice */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Voice Gender:
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setGenderPreference("female");
                            stopVoiceOnCommand();
                          }}
                          className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            genderPreference === "female"
                              ? "bg-blue-600 text-white border-blue-600 shadow-3xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          👩 Female Voice
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGenderPreference("male");
                            stopVoiceOnCommand();
                          }}
                          className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            genderPreference === "male"
                              ? "bg-blue-600 text-white border-blue-600 shadow-3xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          👨 Male Voice
                        </button>
                      </div>
                    </div>

                    {/* 3. Option to adjust speaking speed (slow, normal, fast) */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Speaking Speed:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 mt-0.5" id="speaking-speed-options">
                        {(["slow", "normal", "fast"] as const).map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() => {
                              setSpeedPreference(spd);
                              stopVoiceOnCommand();
                            }}
                            className={`py-1.5 px-1.5 text-xs font-bold rounded-lg border transition-all text-center uppercase cursor-pointer ${
                              speedPreference === spd
                                ? "bg-slate-800 text-white border-slate-800"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {spd === "slow" ? "🐢 Slow" : spd === "normal" ? "⚡ Normal" : "🚀 Fast"}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Active Speech Device Label */}
                  <div className="p-3 bg-blue-50/40 rounded-xl text-[10px] text-slate-500 flex items-center gap-1.5 font-medium border border-blue-100/10">
                    <span className="w-1 px-1 rounded bg-blue-200 text-blue-700 font-extrabold text-[8px]">TTS</span>
                    <span className="truncate">
                      Speech Profile: {selectedVoice || "Loading native OS engine..."}
                    </span>
                  </div>

                  {/* Statistics highlights directly at the base */}
                  <div className="grid grid-cols-2 gap-2 pt-2 text-center" id="quick-coach-stats">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Score</p>
                      <p className="text-xl font-black text-slate-800 leading-tight">{accuracyPercent}%</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mistakes Cached</p>
                      <p className="text-xl font-black text-slate-800 leading-tight">{grammarErrors.length}</p>
                    </div>
                  </div>

                </div>
              )}

              {sidebarActiveTab === "vocab" && (
                // VOCAB CONTAINER: Large, scrollable vocabulary deck with manual additions
                <div className="flex-1 flex flex-col overflow-hidden p-5 space-y-4" id="sidebar-vocabulary-deck">
                  <div className="flex items-center justify-between shrink-0">
                    <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Active Flashcards</span>
                    <button
                      onClick={() => setShowAddVocabForm(!showAddVocabForm)}
                      className="py-1 px-2.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      {showAddVocabForm ? "Close Form" : "+ Add Phrase"}
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
                        className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-2.5 overflow-hidden shrink-0"
                      >
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400">Word or key phrase*</label>
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
                          <label className="text-[9px] font-black uppercase text-slate-400">Meaning context</label>
                          <input
                            type="text"
                            value={vocabMeaningToAdd}
                            onChange={(e) => setVocabMeaningToAdd(e.target.value)}
                            placeholder="e.g. Table reservation"
                            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg mt-0.5 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400">Example Sentence</label>
                          <input
                            type="text"
                            value={vocabSentenceToAdd}
                            onChange={(e) => setVocabSentenceToAdd(e.target.value)}
                            placeholder="e.g. I made a new dining reservation."
                            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg mt-0.5 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                          Save Word
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Filter search box */}
                  <div className="relative shrink-0">
                    <input
                      type="text"
                      value={vocabSearchQuery}
                      onChange={(e) => setVocabSearchQuery(e.target.value)}
                      placeholder="Search flashcards..."
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-205 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white"
                      id="search-vocab-deck"
                    />
                  </div>

                  {/* Scrollable list frame */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {vocabList.length === 0 ? (
                      <p className="text-center text-[11px] text-slate-400 italic py-8 leading-relaxed">
                        No words saved yet. Tap "Save Vocab" on Serena's response bubbles, or add a word above!
                      </p>
                    ) : (
                      (vocabSearchQuery 
                        ? vocabList.filter(v => 
                            v.word.toLowerCase().includes(vocabSearchQuery.toLowerCase()) || 
                            v.meaning.toLowerCase().includes(vocabSearchQuery.toLowerCase())
                          ) 
                        : vocabList
                      ).map((item) => (
                        <div
                          key={item.id}
                          className="bg-slate-50/60 p-3 rounded-xl border border-slate-150 relative group flex flex-col hover:bg-white hover:shadow-3xs transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 leading-snug">
                              📘 {item.word}
                            </span>
                            <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => playVoiceSynthesis(`${item.word}. Usage: ${item.sentence}`)}
                                className="p-1 hover:bg-slate-100 hover:text-blue-600 rounded transition-colors cursor-pointer text-slate-400"
                              >
                                <Play className="w-3 h-3 fill-current text-blue-500" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveFromVocabList(item.id)}
                                className="p-1 hover:bg-slate-100 hover:text-red-500 rounded transition-colors cursor-pointer text-slate-350"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          
                          {item.meaning && (
                            <p className="text-[10px] text-slate-500 mt-1 pl-1 italic leading-snug">
                              Context: {item.meaning}
                            </p>
                          )}
                          
                          {item.sentence && (
                            <div className="p-2 bg-white border border-slate-100 rounded-lg mt-1.5 text-[10px] text-slate-600 font-medium">
                              Example: &ldquo;<span className="font-semibold text-slate-800">{item.sentence}</span>&rdquo;
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {sidebarActiveTab === "dashboard" && (
                // ANALYTICS / MISTAKES TAB
                <div className="flex-1 flex flex-col overflow-y-auto p-5 space-y-5 bg-slate-50/40" id="sidebar-analytics">
                  
                  {/* Streak widget wrapper */}
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white shadow-3sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                        <Flame className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-orange-100">Speaking Streak</p>
                        <h4 className="text-sm font-black tracking-tight">{streakCount} in a Row</h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] opacity-75 uppercase leading-none">Level</p>
                      <span className="text-[10px] font-black bg-white/25 px-2 py-0.5 rounded-full mt-0.5 inline-block">
                        {streakCount > 10 ? "Explorer Plus" : streakCount > 4 ? "Speaker" : "Trainee"}
                      </span>
                    </div>
                  </div>

                  {/* Statistics matrix grids */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-white p-3 rounded-xl border border-slate-150 text-center">
                      <Activity className="w-4 h-4 text-blue-500 mx-auto" />
                      <p className="text-lg font-black mt-1 text-slate-850 leading-none">{totalAttempts}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-tight">Evaluations</p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-150 text-center">
                      <Award className="w-4 h-4 text-emerald-500 mx-auto" />
                      <p className="text-lg font-black mt-1 text-slate-850 leading-none">{accuracyPercent}%</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-tight">Accuracy</p>
                    </div>
                  </div>

                  {/* Grammar errors list ledger */}
                  <div className="space-y-3.5 pt-2 flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-slate-500 shrink-0">
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <span>Grammar Errors List ({grammarErrors.length})</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                      {grammarErrors.length === 0 ? (
                        <div className="text-center py-6 text-[11px] text-slate-400 italic">
                          No errors recorded! Practice typing or speaking sentences with Serena.
                        </div>
                      ) : (
                        grammarErrors.map((item) => (
                          <div
                            key={item.id}
                            className="bg-amber-50/20 p-3 rounded-xl border border-amber-100/50 flex flex-col space-y-2 text-xs"
                          >
                            <div>
                              <span className="text-[8px] font-mono uppercase bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">Mistake</span>
                              <p className="text-slate-500 line-through italic mt-1 pl-1 text-[11px]">
                                &ldquo;{item.original}&rdquo;
                              </p>
                            </div>

                            <div>
                              <span className="text-[8px] font-mono uppercase bg-green-150 text-green-700 font-bold px-1.5 py-0.5 rounded">Learned Correction</span>
                              <p className="font-bold text-slate-800 mt-1 pl-1">
                                {item.corrected}
                              </p>
                            </div>

                            {item.explanation && (
                              <p className="text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-amber-500/10 leading-relaxed font-sans mt-1">
                                <span className="font-bold text-slate-700">Explainer:</span> {item.explanation}
                              </p>
                            )}

                            <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-amber-500/10 shrink-0">
                              <span className="text-[9px] text-slate-400">{item.savedAt}</span>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGrammarError(item.id)}
                                  className="py-0.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-105 text-emerald-700 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                                >
                                  Mastered ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUserInput(item.original);
                                  }}
                                  className="py-0.5 px-2 bg-blue-600 text-white text-[10px] font-bold rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                                >
                                  Retry
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Database reset row */}
                  <div className="pt-2 shrink-0 border-t border-slate-205 text-center">
                    <button
                      type="button"
                      onClick={handleResetMetrics}
                      className="text-[10px] text-red-500 hover:text-red-700 font-bold tracking-tight cursor-pointer"
                    >
                      ⚠️ Reset metrics database
                    </button>
                  </div>

                </div>
              )}

            </div>

          </section>

        </main>

        {/* Lower Static Status Footer */}
        <footer className="h-9 bg-slate-50 border-t border-slate-100 px-6 flex items-center justify-between text-[10px] text-slate-400 select-none shrink-0 font-medium">
          <div className="flex gap-4">
            <span>Core Model: Gemini 3.5 Flash</span>
            <span>Channel: Live Web Speech Synth</span>
          </div>
          <div className="hidden xs:flex gap-4 items-center uppercase font-mono tracking-widest text-[9px]">
            <span>Active Accent Code: {selectedVoice ? selectedVoice.split(" ")[0] : "Female Humanoid"}</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
