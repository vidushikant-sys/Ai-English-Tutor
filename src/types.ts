export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string | Date; // handle JSON serialization
  isCorrect?: boolean;
  corrections?: string;
  suggestions?: string;
  encouragement?: string;
  speechText?: string;
}

export interface TeacherState {
  isSpeaking: boolean;
  isListening: boolean;
  isProcessing: boolean;
}

export interface VocabItem {
  id: string;
  word: string;
  meaning: string;
  sentence: string;
  savedAt: string;
}

export interface GrammarErrorItem {
  id: string;
  original: string;
  corrected: string;
  explanation: string;
  savedAt: string;
}

export interface SessionRecord {
  id: string;
  date: string;
  totalAttempts: number;
  correctAttempts: number;
}
