'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Sparkles, Bot, ChevronDown, Trash2, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: 'gemini' | 'rule-based';
}

interface TokenContext {
  symbol?: string;
  name?: string;
  price?: number;
  priceChange24h?: number;
  volume24h?: number;
  liquidity?: number;
  marketCap?: number;
  verdict?: string;
  overallScore?: number;
  riskScore?: number;
  opportunityScore?: number;
  momentumScore?: number;
  liquidityScore?: number;
  labels?: string[];
}

interface ChatPanelProps {
  /** Optional token context — pre-fills the AI with current token data */
  tokenContext?: TokenContext;
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Should I ape into this token?',
  'What are the biggest risks here?',
  'Explain the opportunity score',
  'How safe is the liquidity?',
];

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500/20 ring-1 ring-accent-500/30">
          <Bot className="h-3.5 w-3.5 text-accent-400" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[82%] rounded-xl px-3 py-2 text-sm leading-relaxed',
          isUser
            ? 'rounded-tr-sm bg-accent-500/20 text-slate-100 ring-1 ring-accent-500/20'
            : 'rounded-tl-sm bg-space-700 text-slate-200',
        )}
      >
        {message.content}
        {!isUser && message.source && (
          <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-600">
            <Sparkles className="h-2.5 w-2.5" />
            {message.source === 'gemini' ? 'Gemini AI' : 'Rule-based'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatPanel({ tokenContext }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: tokenContext?.symbol
        ? `Hey! I'm AlphaScope AI. I can see you're looking at ${tokenContext.symbol}. Ask me anything about its scores, risks, or signals.`
        : "Hey! I'm AlphaScope AI. Open any token detail page for contextual analysis, or ask me anything about on-chain analytics.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          context: tokenContext,
          history,
        }),
      });

      const data = await res.json() as { reply: string; source?: 'gemini' | 'rule-based'; warning?: string };

      // If Gemini fell back, show a friendly one-liner instead of the raw error blob
      const friendlyWarning = data.warning
        ? data.warning.includes('429') || data.warning.includes('quota')
          ? 'Gemini is rate-limited right now. Showing a rule-based reply instead.'
          : 'Gemini is temporarily unavailable. Showing a rule-based reply instead.'
        : undefined;

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: friendlyWarning && data.source === 'rule-based'
            ? `${data.reply}\n\n_${friendlyWarning}_`
            : data.reply,
          source: data.source,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, tokenContext]);

  const welcomeMessage = useCallback((): Message => ({
    id: 'welcome',
    role: 'assistant',
    content: tokenContext?.symbol
      ? `Hey! I'm AlphaScope AI. I can see you're looking at ${tokenContext.symbol}. Ask me anything about its scores, risks, or signals.`
      : "Hey! I'm AlphaScope AI. Open any token detail page for contextual analysis, or ask me anything about on-chain analytics.",
  }), [tokenContext]);

  const clearChat = useCallback(() => {
    setMessages([welcomeMessage()]);
    setInput('');
  }, [welcomeMessage]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* ── Floating toggle button ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close AI chat' : 'Open AI chat'}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full',
          'bg-accent-500 shadow-lg shadow-accent-500/30 transition-all duration-200',
          'hover:bg-accent-400 hover:shadow-accent-500/50 hover:scale-105',
          open && 'rotate-180',
        )}
      >
        {open ? (
          <ChevronDown className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </button>

      {/* ── Slide-up panel ─────────────────────────────────────────────── */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-50 flex w-[min(380px,calc(100vw-3rem))] flex-col',
          'overflow-hidden rounded-2xl border border-space-600 bg-space-900',
          'shadow-2xl shadow-black/40 ring-1 ring-white/5',
          'transition-all duration-300 ease-out',
          open
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-4 opacity-0 pointer-events-none',
        )}
        style={{ height: '480px' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-space-700 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-500/20 ring-1 ring-accent-500/30">
            <Sparkles className="h-4 w-4 text-accent-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100">Ask AlphaScope</p>
            {tokenContext?.symbol && (
              <p className="text-[10px] text-slate-500 truncate">
                Context: {tokenContext.symbol} · {tokenContext.verdict} · Score {tokenContext.overallScore}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={clearChat}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-space-700 hover:text-slate-200"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-space-700 hover:text-slate-200"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((m) => (
            <Bubble key={m.id} message={m} />
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500/20 ring-1 ring-accent-500/30">
                <Bot className="h-3.5 w-3.5 text-accent-400" />
              </div>
              <div className="rounded-xl rounded-tl-sm bg-space-700 px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions (only when ≤ 1 message) */}
        {messages.length <= 1 && !loading && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendMessage(s)}
                className="rounded-full border border-space-600 bg-space-800 px-2.5 py-1 text-[11px] text-slate-400 transition-colors hover:border-accent-500/40 hover:text-slate-200"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-space-700 px-3 py-2.5">
          <div className="flex items-end gap-2 rounded-xl border border-space-600 bg-space-800 px-3 py-2 focus-within:border-accent-500/50">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything…"
              rows={1}
              maxLength={500}
              className="flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder-slate-600 outline-none"
              style={{ maxHeight: '100px' }}
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150',
                input.trim() && !loading
                  ? 'bg-accent-500 text-white hover:bg-accent-400'
                  : 'bg-space-700 text-slate-600',
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
