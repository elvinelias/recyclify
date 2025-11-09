import { useEffect, useRef, useState } from "react";

const USE_OPENAI = true;

async function callLLM(prompt, history = []) {
  const messages = [...history, { role: "user", content: prompt }];

  const resp = await fetch("http://localhost:8787/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || "API request failed");
  }

  const data = await resp.json();
  return data.answer;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState([
    {
      role: "assistant",
      content:
        "👋 Hi! I'm the Recyclify AI assistant. Ask me about recycling, how to use the detector, or where to find local centers.",
    },
  ]);

  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  async function send() {
    const q = input.trim();
    if (!q) return;

    const next = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setInput("");
    setLoading(true);

    try {
      const answer = await callLLM(q, msgs);
      setMsgs([...next, { role: "assistant", content: answer }]);
    } catch (e) {
      setMsgs([
        ...next,
        {
          role: "assistant",
          content: "⚠️ I couldn’t reach the AI right now. Please try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Floating chat toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 rounded-2xl px-4 py-3 font-semibold shadow-lg border border-white/10 bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
      >
        {open ? "Close chat" : "Chat ♻️"}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[min(92vw,380px)] h-[520px] rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
              <div className="font-semibold">Recyclify Assistant</div>
            </div>
            <a href="/learn" className="text-xs text-white/70 hover:text-white underline">
              Learn →
            </a>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-white/10"
                    : "bg-gradient-to-b from-white/5 to-white/[.03] border border-white/10"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="max-w-[85%] bg-gradient-to-b from-white/5 to-white/[.03] border border-white/10 rounded-xl px-3 py-2 text-sm">
                Thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10 flex gap-2">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about recycling or this site…"
              className="flex-1 resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={send}
              disabled={loading}
              className="rounded-xl px-4 py-2 bg-emerald-500 hover:bg-emerald-600 font-semibold disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
