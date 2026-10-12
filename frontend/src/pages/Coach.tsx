import ReactMarkdown from "react-markdown";
import {
  Bot,
  Heart,
  Mic,
  MicOff,
  Paperclip,
  Send,
  Sparkles,
  ThumbsUp,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Page } from "@/components/common/Page";
import { SectionHeader } from "@/components/common/Premium";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, ChatMessage } from "@/lib/api";
import { useLanguage } from "@/context/useLanguage";
import { useEffect, useRef, useState } from "react";

// Web Speech API interface definitions for TypeScript
interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: Event) => void;
  onend: () => void;
}

export function Coach() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.chatHistory().then(setMessages).catch(() => undefined);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Handle Speech-to-Text via Web Speech API
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    // Match selected UI language
    if (language === "hi") recognition.lang = "hi-IN";
    else if (language === "kn") recognition.lang = "kn-IN";
    else recognition.lang = "en-IN";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  // Handle Text-to-Speech via Web Speech API
  const toggleSpeak = (id: string, text: string) => {
    if (currentlySpeakingId === id) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[#*_`~-]/g, ""); // Strip markdown symbols
    const utterance = new SpeechSynthesisUtterance(cleanText);

    if (language === "hi") utterance.lang = "hi-IN";
    else if (language === "kn") utterance.lang = "kn-IN";
    else utterance.lang = "en-IN";

    utterance.onend = () => setCurrentlySpeakingId(null);
    utterance.onerror = () => setCurrentlySpeakingId(null);

    setCurrentlySpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  async function send() {
    if (!message.trim() || sending) return;
    setSending(true);
    setError("");
    const text = message.trim();
    setMessage("");
    try {
      const response = await api.sendChat(text, language);
      setMessages((items) => [...items, response]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Message failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <Page title={t.coach.title} subtitle={t.coach.subtitle}>
      {/* Non-diagnostic disclaimer */}
      <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-lavender-200 bg-lavender-50/70 p-3.5 text-xs text-lavender-900 shadow-xs dark:border-lavender-800/40 dark:bg-lavender-950/40 dark:text-lavender-200">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <div>
          <span className="font-bold">Multilingual AI Coach:</span> Responses are grounded in verified WHO maternal
          health guidelines and ICMR nutritional references. For acute medical emergencies, call 112 immediately.
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="flex min-h-[620px] flex-col overflow-hidden border-lavender-100 p-0 shadow-soft md:min-h-[700px] dark:border-white/10">
          {/* Header */}
          <div className="border-b border-lavender-100 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-ink dark:text-white">{t.coach.coachName}</h2>
                  <div className="flex items-center gap-2 text-xs text-muted dark:text-white/60">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{t.coach.onlineStatus} · RAG Active ({language.toUpperCase()})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-lavender-300 text-primary">
                  WHO & ICMR Grounded
                </Badge>
              </div>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-lavender-50/30 to-white/40 p-5 dark:from-white/5 dark:to-transparent">
            {messages.map((item) => (
              <div key={item.id} className="space-y-2">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="max-w-[82%] rounded-[24px] rounded-tr-xs bg-gradient-to-r from-primary to-accent px-5 py-3 text-xs leading-relaxed text-white shadow-xs sm:text-sm">
                    {item.message}
                  </div>
                </div>

                {/* Assistant RAG Response */}
                <div className="max-w-[85%]">
                  <div className="rounded-[24px] rounded-tl-xs border border-lavender-100 bg-white p-5 text-xs leading-relaxed text-ink shadow-2xs dark:border-white/10 dark:bg-white/10 dark:text-white sm:text-sm">
                    <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
                      {item.response}
                    </ReactMarkdown>

                    {/* Grounding Source Attribution Tag */}
                    <div className="mt-3 flex items-center gap-2 border-t border-lavender-100/70 pt-2 text-[10px] text-muted dark:border-white/10 dark:text-white/50">
                      <span className="rounded bg-lavender-100 px-1.5 py-0.5 font-bold text-primary dark:bg-white/10">
                        Evidence Grounded
                      </span>
                      <span>WHO Maternal Guideline · NurtureHer Clinical RAG</span>
                    </div>
                  </div>

                  {/* Actions: TTS Speaker + Feedback */}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => toggleSpeak(item.id, item.response)}
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition ${
                        currentlySpeakingId === item.id
                          ? "border-primary bg-primary text-white"
                          : "border-lavender-100 bg-white text-muted hover:text-primary dark:border-white/10 dark:bg-white/10 dark:text-white/60"
                      }`}
                      aria-label="Listen to audio speech"
                    >
                      {currentlySpeakingId === item.id ? (
                        <>
                          <VolumeX className="h-3 w-3" /> Stop
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3 w-3" /> Listen
                        </>
                      )}
                    </button>

                    <button
                      className="rounded-full border border-lavender-100 bg-white p-1 text-muted hover:text-primary dark:border-white/10 dark:bg-white/10"
                      aria-label={t.coach.likeResponse}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </button>
                    <button
                      className="rounded-full border border-lavender-100 bg-white p-1 text-muted hover:text-primary dark:border-white/10 dark:bg-white/10"
                      aria-label={t.coach.saveResponse}
                    >
                      <Heart className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {!messages.length && !sending ? (
              <div className="rounded-2xl border border-dashed border-lavender-200 p-8 text-center text-xs text-muted dark:border-white/10">
                <Bot className="mx-auto mb-2 h-8 w-8 text-primary/60" />
                <p className="font-bold">{t.coach.noConversations}</p>
                <p className="mt-1 text-[11px]">Ask about pregnancy symptoms, nutrition, cycle health, or emotional wellbeing.</p>
              </div>
            ) : null}

            {sending ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-secondary [animation-delay:120ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:240ms]" />
                <span>{t.coach.typingStatus}</span>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          {/* Input & Voice Controls */}
          <div className="border-t border-lavender-100 bg-white/90 p-4 dark:border-white/10 dark:bg-white/5">
            {/* Quick Suggestion Chips */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {t.coach.suggestions.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setMessage(chip)}
                  className="rounded-full border border-lavender-200 bg-lavender-50/50 px-2.5 py-1 text-[11px] font-semibold text-ink transition hover:border-primary hover:bg-lavender-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-lavender-200 bg-lavender-50/40 p-1.5 focus-within:border-primary dark:border-white/10 dark:bg-white/5">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                className="min-w-0 flex-1 bg-transparent px-3 text-xs outline-none dark:text-white sm:text-sm"
                placeholder={isListening ? "Listening... speak clearly" : t.coach.inputPlaceholder}
              />

              {/* STT Microphone Button */}
              <Button
                type="button"
                variant={isListening ? "primary" : "ghost"}
                className={`h-10 w-10 shrink-0 px-0 rounded-xl ${isListening ? "animate-pulse bg-rose-600 hover:bg-rose-700 text-white" : ""}`}
                aria-label={isListening ? "Stop voice listening" : t.coach.voiceInput}
                onClick={toggleListening}
                title={isListening ? "Click to stop listening" : "Voice input (English, Hindi, Kannada)"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>

              {/* Send Button */}
              <Button
                type="button"
                className="h-10 w-10 shrink-0 px-0 rounded-xl"
                aria-label={t.coach.sendMessage}
                onClick={() => void send()}
                disabled={sending || !message.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {error ? <p className="mt-2 text-xs font-bold text-danger">{error}</p> : null}
          </div>
        </Card>

        {/* Suggested Care Plan Sidebar */}
        <Card className="p-6">
          <SectionHeader title={t.coach.suggestedCarePlan} subtitle={t.coach.suggestedCarePlanSubtitle} />
          <div className="mt-5 space-y-3">
            {t.coach.carePlanItems.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-lavender-100 bg-lavender-50/50 p-4 dark:border-white/10 dark:bg-white/5"
              >
                <Sparkles className="mb-1.5 h-4 w-4 text-primary" />
                <p className="text-xs font-bold text-ink dark:text-white">{item.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted dark:text-white/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  );
}
