import ReactMarkdown from "react-markdown";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileText,
  History,
  Lock,
  MessageSquarePlus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, CaregiverChatResponse, CaregiverChatSource } from "@/lib/api";
import { LanguageContext } from "@/context/language-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function CaregiverChat() {
  const langCtx = useContext(LanguageContext);
  const language = langCtx?.language || "en";
  const [messages, setMessages] = useState<CaregiverChatResponse[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedSourcesId, setExpandedSourcesId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const history = await api.caregiverChatHistory();
      // Reverse because API returns descending
      setMessages([...history].reverse());
    } catch (err: unknown) {
      // If error loading history, display message but don't crash
      const msg = err instanceof Error ? err.message : "Failed to load chat history.";
      setErrorMsg(msg);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputText.trim();
    if (!query || loading) return;

    setInputText("");
    setErrorMsg("");
    setLoading(true);

    try {
      const response = await api.caregiverChat(query, language || "en");
      setMessages((prev) => [...prev, response]);
    } catch (err: unknown) {
      const errorText =
        err instanceof Error
          ? err.message
          : "AI Health Coach provider is temporarily unavailable. Please try again later.";
      setErrorMsg(errorText);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear your conversation history?")) return;
    try {
      await api.clearCaregiverChatHistory();
      setMessages([]);
      setErrorMsg("");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to clear history.");
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputText(question);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="space-y-4" data-testid="caregiver-rag-chatbot">
      {/* Disclaimer Header */}
      <Card className="border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="text-xs font-black text-amber-900 dark:text-amber-200">
              Caregiver AI Health Coach · Retrieval-Grounded Guidance
            </p>
            <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              Answers are grounded in trusted maternal and postpartum care guidelines (WHO & MoHFW) with verifiable source citations.
              Maternal health data is accessible only when permitted by the mother via CareCircle consent.
              Informational only; not a medical diagnosis.
            </p>
          </div>
        </div>
      </Card>

      {/* Main Chat Interface */}
      <Card className="flex flex-col overflow-hidden border-lavender-200/80 bg-white shadow-soft dark:border-white/10 dark:bg-card">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-lavender-100 bg-lavender-50/50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-ink dark:text-white">Care Companion Assistant</h3>
              <p className="text-[11px] text-muted">Dedicated Caregiver RAG · Isolated & Consent-Guarded</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              id="caregiver-chat-new-btn"
              variant="secondary"
              size="sm"
              onClick={handleClearHistory}
              className="gap-1.5 text-xs font-bold"
              title="Clear active conversation history"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              <span className="hidden sm:inline">Clear History</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadHistory()}
              className="gap-1.5 text-xs font-bold"
              title="Refresh conversation history"
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Message Area */}
        <div className="min-h-[380px] max-h-[540px] overflow-y-auto p-4 sm:p-5 space-y-4">
          {initialLoading ? (
            <div className="py-12 text-center text-xs text-muted">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary mb-2" />
              Loading your conversation history...
            </div>
          ) : messages.length === 0 ? (
            <div id="caregiver-chat-empty" className="py-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Bot className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-black text-ink dark:text-white">How can I support you as a caregiver today?</h4>
              <p className="mx-auto max-w-md text-xs text-muted">
                Ask questions about newborn soothing, maternal warning signs, postpartum nutrition, or permitted dashboard updates.
              </p>

              {/* Suggested Questions */}
              <div className="pt-2 flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                {[
                  "What postpartum warning signs require immediate emergency care?",
                  "How can I help my partner get better sleep during newborn feeding?",
                  "What are high-iron meals to prepare for postpartum recovery?",
                  "What was the mother's latest logged mood or screening risk?",
                ].map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickQuestion(q)}
                    className="rounded-xl border border-lavender-200 bg-white px-3 py-1.5 text-left text-xs font-semibold text-ink shadow-2xs transition hover:border-primary hover:bg-lavender-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    💬 {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="space-y-3" data-testid={`caregiver-message-${msg.id}`}>
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-primary px-4 py-2.5 text-xs font-medium text-white shadow-soft">
                    {msg.message}
                  </div>
                </div>

                {/* Assistant Response */}
                <div className="flex justify-start">
                  <div className="max-w-[95%] sm:max-w-[85%] rounded-2xl border border-lavender-200/80 bg-lavender-50/40 p-4 text-xs text-ink shadow-2xs dark:border-white/10 dark:bg-white/5 dark:text-white space-y-3">
                    {/* Consent status header if applicable */}
                    {msg.maternal_consent_status && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
                        {msg.has_maternal_data ? (
                          <>
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{msg.maternal_consent_status}</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-amber-800 dark:text-amber-300">{msg.maternal_consent_status}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Markdown Body */}
                    <div className="prose prose-xs dark:prose-invert max-w-none text-xs leading-relaxed">
                      <ReactMarkdown>{msg.response}</ReactMarkdown>
                    </div>

                    {/* Source Attribution Citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="pt-2 border-t border-lavender-200/60 dark:border-white/10 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-muted flex items-center gap-1">
                            <FileText className="h-3 w-3 text-primary" />
                            Source Attribution ({msg.sources.length} clinical references)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSourcesId((prev) => (prev === msg.id ? null : msg.id))
                            }
                            className="text-[10px] font-bold text-primary underline"
                          >
                            {expandedSourcesId === msg.id ? "Hide Excerpts" : "View Excerpts"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((src, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-ink border border-lavender-200 shadow-2xs dark:bg-white/10 dark:text-white/90 dark:border-white/10"
                              title={`${src.publisher} — Page ${src.page}`}
                            >
                              📖 {src.title} (p. {src.page})
                            </span>
                          ))}
                        </div>
                        {expandedSourcesId === msg.id && (
                          <div className="mt-2 space-y-1.5 rounded-xl bg-white/80 p-2.5 text-[11px] text-muted dark:bg-white/5">
                            {msg.sources.map((src, sIdx) => (
                              <div key={sIdx} className="border-b border-lavender-100 pb-1 last:border-none last:pb-0 dark:border-white/5">
                                <p className="font-bold text-ink dark:text-white">
                                  {src.title} · {src.publisher} (Page {src.page})
                                </p>
                                <p className="text-[10px] italic text-muted mt-0.5">"{src.excerpt}"</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-lavender-200 bg-lavender-50/60 p-3.5 text-xs text-muted flex items-center gap-2 dark:border-white/10 dark:bg-white/5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Retrieving evidence and formulating guidance...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div
            id="caregiver-chat-error"
            role="alert"
            className="flex items-center justify-between border-t border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg("")}
              className="text-xs font-bold text-rose-700 underline hover:text-rose-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className="border-t border-lavender-100 bg-white p-3 sm:p-4 dark:border-white/10 dark:bg-card">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              id="caregiver-chat-input"
              type="text"
              placeholder="Ask a question about maternal recovery, warning signs, or permitted status..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              className="flex-1"
            />
            <Button
              id="caregiver-chat-send-btn"
              type="submit"
              variant="primary"
              disabled={loading || !inputText.trim()}
              className="gap-1.5 px-4"
            >
              <span>Send</span>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
