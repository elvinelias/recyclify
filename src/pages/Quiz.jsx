import { useMemo, useState } from "react";

const QUESTIONS = [
  {
    q: "Which item is widely recyclable in most curbside programs?",
    choices: ["Greasy pizza box", "Rinsed aluminum can", "Ceramic mug", "Plastic utensils"],
    answer: 1,
    explain: "Aluminum cans are accepted almost everywhere. Grease contaminates paper streams."
  },
  {
    q: "Where should plastic bags/film go?",
    choices: ["Trash", "Curbside bin", "Store drop-off bin", "Compost"],
    answer: 2,
    explain: "Most curbside programs don't accept film; use retail collection points."
  },
  {
    q: "What should you do before recycling a plastic bottle?",
    choices: ["Leave liquid inside", "Rinse & cap back on", "Remove labels", "Crush with food in it"],
    answer: 1,
    explain: "Rinse, then cap on helps capture small caps in processing."
  },
  {
    q: "Which paper item is usually NOT recyclable?",
    choices: ["Office paper", "Cardboard", "Newspaper", "Loose shredded paper"],
    answer: 3,
    explain: "Shredded paper can jam sorters; check local rules — often not loose."
  },
  {
    q: "Glass recycling — generally true?",
    choices: ["No glass is recyclable", "Only colored glass is accepted", "Clean bottles/jars often accepted", "Mirrors are ideal for recycling"],
    answer: 2,
    explain: "Bottles/jars yes (if clean). Mirrors/ceramics usually no."
  }
];

export default function Quiz() {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const current = QUESTIONS[idx];
  const progress = useMemo(() => Math.round(((idx) / QUESTIONS.length) * 100), [idx]);

  const submit = () => {
    if (selected === null) return;
    if (selected === current.answer) setScore(s => s + 1);
    setTimeout(() => {
      if (idx + 1 >= QUESTIONS.length) setDone(true);
      else { setIdx(i => i + 1); setSelected(null); }
    }, 300);
  };

  const reset = () => {
    setIdx(0); setSelected(null); setScore(0); setDone(false);
  };

  return (
    <div className="py-10 lg:py-14">
      <section className="text-center mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          Learn • Test • Improve
        </div>
        <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight">
          Recycling <span className="text-brand-400">Quiz</span>
        </h1>
        <p className="mt-3 text-white/70 max-w-2xl mx-auto">
          Short, high-signal questions based on common curbside rules.
        </p>
      </section>

      <div className="mx-auto max-w-2xl">
        {/* Progress */}
        <div className="mb-5">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${done ? 100 : progress}%` }} />
          </div>
          <div className="mt-2 text-xs text-white/60">
            {done ? "Quiz complete" : `Question ${idx + 1} of ${QUESTIONS.length}`}
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl2 border border-white/10 bg-gradient-to-b from-white/5 to-white/[.03] shadow-soft p-6">
          {!done ? (
            <>
              <div className="text-xl font-semibold mb-4">{current.q}</div>
              <div className="grid gap-3">
                {current.choices.map((c, i) => {
                  const active = selected === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelected(i)}
                      className={`text-left px-4 py-3 rounded-xl border transition
                      ${active ? "border-brand-400 bg-brand-400/10" : "border-white/10 hover:border-white/20"}
                    `}
                    >
                      {String.fromCharCode(65+i)}. {c}
                    </button>
                  );
                })}
              </div>

              {selected !== null && (
                <div className="mt-4 text-sm">
                  {selected === current.answer
                    ? <span className="text-brand-400">✅ Correct!</span>
                    : <span className="text-red-400">❌ Not quite.</span>}
                  <div className="mt-1 text-white/70">{current.explain}</div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button onClick={submit}
                        className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 font-semibold shadow-glow">
                  {idx + 1 === QUESTIONS.length ? "Finish" : "Next"}
                </button>
                <button onClick={reset}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-semibold">
                  Reset
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-3xl font-bold mb-2">Your score: {score} / {QUESTIONS.length}</div>
              <p className="text-white/70 mb-6">
                {score === QUESTIONS.length
                  ? "Flawless! You’re a recycling ace ♻️"
                  : score >= Math.ceil(QUESTIONS.length * 0.7)
                  ? "Great job — nearly there!"
                  : "Good start — review and try again."}
              </p>
              <button onClick={reset}
                      className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 font-semibold shadow-glow">
                Take again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
