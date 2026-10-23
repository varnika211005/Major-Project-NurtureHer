import ReactMarkdown from "react-markdown";
import {
  Bot,
  FileText,
  Heart,
  History,
  MessageSquarePlus,
  Mic,
  MicOff,
  Send,
  Sparkles,
  ThumbsUp,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Page } from "@/components/common/Page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, ChatMessage } from "@/lib/api";
import { useLanguage } from "@/context/useLanguage";
import { useCallback, useEffect, useRef, useState } from "react";

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

interface HistoryItem {
  id: string;
  message: string;
  response: string;
  created_at?: string;
  createdAt?: string;
  sources?: ChatMessage["sources"];
}

export function Coach() {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.chatHistory().then(setMessages).catch(() => undefined);
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const items = await api.chatHistory();
      const mapped = items.map((item: ChatMessage) => ({
        id: item.id,
        message: item.message,
        response: item.response,
        created_at: (item as any).created_at || (item as any).createdAt,
        sources: item.sources,
      }));
      setHistoryItems(mapped);
    } catch (reason) {
      setHistoryError(reason instanceof Error ? reason.message : "Unable to load chat history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openHistory = useCallback(() => {
    setHistoryOpen(true);
    void loadHistory();
  }, [loadHistory]);

  const closeHistory = () => {
    setHistoryOpen(false);
  };

  const startNewChat = () => {
    setMessages([]);
    setActiveHistoryId(null);
    setMessage("");
    setError("");
  };

  const loadHistorySession = (item: HistoryItem) => {
    setActiveHistoryId(item.id);
    setMessages([
      {
        id: item.id,
        message: item.message,
        response: item.response,
        created_at: item.created_at || item.createdAt,
        sources: item.sources,
      } as ChatMessage,
    ]);
  };

  useEffect(() => {
    if (searchParams.get("history") === "1") {
      openHistory();
      const next = new URLSearchParams(searchParams);
      next.delete("history");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, openHistory]);

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
      alert(t.coach.speechUnsupported);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    // Match selected UI language
    if (language === "hi") recognition.lang = "hi-IN";
    else if (language === "kn") recognition.lang = "kn-IN";
    else if (language === "ta") recognition.lang = "ta-IN";
    else if (language === "te") recognition.lang = "te-IN";
    else if (language === "ml") recognition.lang = "ml-IN";
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
    else if (language === "ta") utterance.lang = "ta-IN";
    else if (language === "te") utterance.lang = "te-IN";
    else if (language === "ml") utterance.lang = "ml-IN";
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
      void loadHistory();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.coach.messageFailed);
    } finally {
      setSending(false);
    }
  }

  return (
    <Page title={t.coach.title} subtitle={t.coach.subtitle}>
      {/* Non-diagnostic disclaimer */}
      <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-lavender-200 bg-lavender-50 p-3.5 text-xs text-ink shadow-xs dark:border-lavender-700/60 dark:bg-lavender-900/60 dark:text-white">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary dark:text-lavender-200" />
        <div>
          <span className="font-bold text-ink dark:text-white">{t.coach.disclaimerTitle}</span> <span className="text-ink dark:text-white/95">{t.coach.disclaimerBody}</span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-1">
        <Card className="flex min-h-[620px] flex-col overflow-hidden border-lavender-100 p-0 shadow-soft md:min-h-[700px] dark:border-white/10">
          {/* Header */}
          <div className="border-b border-lavender-100 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-ink dark:text-white">{t.coach.coachName}</h2>
                  <div className="flex items-center gap-2 text-xs text-muted dark:text-white/80">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{t.coach.onlineStatus} · {t.coach.ragActive} ({language.toUpperCase()})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-lavender-300 text-primary dark:text-primary/80">
                  {t.coach.educationalUseOnly}
                </Badge>
                <Button type="button" variant="ghost" size="sm" onClick={historyOpen ? closeHistory : openHistory} aria-expanded={historyOpen} aria-controls="coach-history-panel">
                  <History className="mr-1.5 h-4 w-4" />
                  {t.coach.history}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={startNewChat}>
                  <MessageSquarePlus className="mr-1.5 h-4 w-4" />
                  {t.coach.newChat}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {historyOpen ? (
              <aside id="coach-history-panel" className="w-full max-w-[320px] border-r border-lavender-100 bg-lavender-50/40 dark:border-white/10 dark:bg-white/5" aria-label="Chat history">
              <div className="flex items-center justify-between border-b border-lavender-100 p-3 dark:border-white/10">
                <p className="text-xs font-bold text-ink dark:text-white">{t.coach.conversations}</p>
                <Button type="button" variant="ghost" size="sm" onClick={closeHistory} aria-label={t.coach.closeHistory}>
                  <History className="h-4 w-4" />
                </Button>
              </div>
              <div className="h-full overflow-y-auto p-2">
                <Button type="button" variant="ghost" size="sm" className="mb-2 w-full justify-start" onClick={loadHistory}>
                  <History className="mr-1.5 h-4 w-4" />
                  {t.coach.refresh}
                </Button>
                {historyLoading ? <p className="px-2 py-2 text-xs text-muted dark:text-white/70">{t.coach.loading}</p> : null}
                {historyError ? <p className="px-2 py-2 text-xs text-danger">{t.coach.unableToLoadHistory}</p> : null}
                  {!historyLoading && !historyError && historyItems.length === 0 ? <p className="px-2 py-2 text-xs text-muted dark:text-white/70">{t.chatHistory?.emptyTitle || "No conversations yet"}</p> : null}
                  {historyItems.map((item) => (
                    <button key={item.id} type="button" onClick={() => loadHistorySession(item)} className={`mb-1 w-full rounded-xl px-2 py-2 text-left text-xs transition ${activeHistoryId === item.id ? "bg-primary/10 text-primary dark:text-white" : "hover:bg-lavender-100/60 text-muted dark:text-white/80 dark:hover:bg-white/10"}`}>
                      <p className="truncate font-semibold text-ink dark:text-white">{item.message}</p>
                      <p className="mt-1 truncate text-[10px] text-muted dark:text-white/60">{item.response?.slice(0, 80)}</p>
                    </button>
                  ))}
                </div>
              </aside>
            ) : null}

            <div className="flex min-w-0 flex-1 flex-col">
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

                        {item.sources?.length ? (
                          <div className="mt-4 border-t border-lavender-100/70 pt-3 dark:border-white/10">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted dark:text-white/60">
                              {t.coach.sources}
                            </p>
                            <ul className="space-y-1.5">
                              {item.sources.map((source) => (
                                <li key={source.id} className="flex gap-2 text-[10px] leading-relaxed text-muted dark:text-white/70">
                                  <FileText className="mt-0.5 h-3 w-3 shrink-0 text-primary dark:text-lavender-200" />
                                  <div>
                                    <p className="font-semibold text-ink dark:text-white">{source.title}</p>
                                    <p>
                                      {[source.page, source.section, source.publisher, source.publication_date, source.source]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>

                      {/* Actions: TTS Speaker + Feedback */}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => toggleSpeak(item.id, item.response)}
                          className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition ${
                            currentlySpeakingId === item.id
                              ? "border-primary bg-primary text-white"
                              : "border-lavender-100 bg-white text-muted hover:text-primary dark:border-white/10 dark:bg-white/10 dark:text-white/80"
                          }`}
                          aria-label={t.coach.listen}
                        >
                          {currentlySpeakingId === item.id ? (
                            <>
                              <VolumeX className="h-3 w-3" /> {t.coach.stopAudio}
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3 w-3" /> {t.coach.listen}
                            </>
                          )}
                        </button>

                        <button
                          className="rounded-full border border-lavender-100 bg-white p-1 text-muted hover:text-primary dark:border-white/10 dark:bg-white/10 dark:text-white/80"
                          aria-label={t.coach.likeResponse}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button
                          className="rounded-full border border-lavender-100 bg-white p-1 text-muted hover:text-primary dark:border-white/10 dark:bg-white/10 dark:text-white/80"
                          aria-label={t.coach.saveResponse}
                        >
                          <Heart className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {!messages.length && !sending ? (
                  <div className="rounded-2xl border border-dashed border-lavender-200 p-8 text-center text-xs text-muted dark:border-white/10 dark:text-white/70">
                    <Bot className="mx-auto mb-2 h-8 w-8 text-primary/60" />
                    <p className="font-bold text-ink dark:text-white">{t.coach.noConversations}</p>
                    <p className="mt-1 text-[11px]">{t.coach.emptyPrompt}</p>
                  </div>
                ) : null}

                {sending ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted dark:text-white/80">
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
                    className="min-w-0 flex-1 bg-transparent px-3 text-xs outline-none text-ink dark:text-white sm:text-sm"
                    placeholder={isListening ? t.coach.listening : t.coach.inputPlaceholder}
                  />

                  {/* STT Microphone Button */}
                  <Button
                    type="button"
                    variant={isListening ? "primary" : "ghost"}
                    className={`h-10 w-10 shrink-0 px-0 rounded-xl ${isListening ? "animate-pulse bg-rose-600 hover:bg-rose-700 text-white" : ""}`}
                    aria-label={isListening ? t.coach.stopVoiceListening : t.coach.voiceInput}
                    onClick={toggleListening}
                    title={isListening ? t.coach.stopVoiceListening : t.coach.voiceInputTitle}
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
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}
