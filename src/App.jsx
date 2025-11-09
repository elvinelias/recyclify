import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Detect from "./pages/Detect.jsx";
import Quiz from "./pages/Quiz.jsx";
import Learn from "./pages/Learn.jsx";
import ChatWidget from "./components/ChatWidget.jsx";

function NavItem({ to, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `px-3 py-2 rounded-lg transition ${
          isActive
            ? "bg-white/10 text-white"
            : "text-white/70 hover:text-white hover:bg-white/5"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function App() {
  const [stats, setStats] = useState({
    recyclable: 0,
    non: 0,
    total: 0,
    avgOverall: 0,
    fps: 0,
  });

  useEffect(() => {
    const onStats = (e) => {
      const { counts, avgOverall, fps } = e.detail || {};
      setStats({
        recyclable: counts?.recyclable ?? 0,
        non: counts?.non ?? 0,
        total: counts?.total ?? 0,
        avgOverall: avgOverall ?? 0,
        fps: Math.round(fps ?? 0),
      });
    };
    window.addEventListener("recyclify:stats", onStats);
    return () => window.removeEventListener("recyclify:stats", onStats);
  }, []);

  return (
    <BrowserRouter>
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 shadow-glow" />
            <span className="text-lg font-semibold tracking-tight">
              Recyclify
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* 🔢 Live AI Stats Pill */}
            <div className="hidden sm:flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80">
              <span className="inline-flex items-center gap-1">
                ♻️ <b className="text-emerald-400">{stats.recyclable}</b>
              </span>
              <span className="inline-flex items-center gap-1">
                🗑️ <b className="text-red-400">{stats.non}</b>
              </span>
              <span className="inline-flex items-center gap-1">
                Total <b className="text-white/90">{stats.total}</b>
              </span>
              <span className="inline-flex items-center gap-1">
                Avg {Math.round(stats.avgOverall * 100)}%
              </span>
              <span className="inline-flex items-center gap-1">
                {stats.fps} fps
              </span>
            </div>

            <NavItem to="/" label="Detect" end />
            <NavItem to="/quiz" label="Quiz" />
            <NavItem to="/learn" label="Learn" />
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="ml-1 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5"
            >
              GitHub
            </a>
          </div>
        </nav>
      </header>

      {/* Page Routes */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Detect />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/learn" element={<Learn />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="max-w-md text-white/70 text-sm">
            <div className="font-semibold text-white mb-1">Recyclify</div>
            AI-powered recycling assistant. Real-time detection + interactive
            learning.
          </div>

          <div className="flex gap-8 text-sm">
            <div className="space-y-2">
              <div className="text-white/60 uppercase tracking-wide text-xs">
                Product
              </div>
              <a className="block text-white/70 hover:text-white" href="/">
                Detect
              </a>
              <a className="block text-white/70 hover:text-white" href="/quiz">
                Quiz
              </a>
              <a className="block text-white/70 hover:text-white" href="/learn">
                Learn
              </a>
            </div>
          </div>
        </div>

        {/* Copyright section */}
        <div className="border-t border-white/10 mt-6 py-4 text-center text-white/60 text-sm">
          © {new Date().getFullYear()} Recyclify. Created by{" "}
          <span className="text-white font-medium">
            Elvin Elias, Sumeet Pramod, and Elson Philip
          </span>
          .
        </div>
      </footer>

      {/* Floating AI chat on every page */}
      <ChatWidget />
    </BrowserRouter>
  );
}
