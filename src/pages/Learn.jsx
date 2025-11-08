// src/pages/Learn.jsx
import { useMemo, useState } from "react";

const GUIDES = [
  {
    title: "Paper & Cardboard",
    items: ["Office paper", "Newspapers", "Magazines", "Clean cardboard boxes"],
    notes: "Flatten boxes. Remove plastic wrap. Small staples okay.",
    color: "from-sky-500/20 to-sky-500/5",
    badge: "📄 Paper",
  },
  {
    title: "Plastic & Metal",
    items: ["Plastic bottles & jugs (#1, #2)", "Aluminum cans", "Steel/tin cans"],
    notes: "Rinse. Caps back on bottles. Aerosol cans must be empty.",
    color: "from-emerald-500/20 to-emerald-500/5",
    badge: "🧴 Containers",
  },
  {
    title: "Glass (varies by city)",
    items: ["Glass bottles", "Jars"],
    notes: "Rinse. No ceramics, mirrors, or cookware.",
    color: "from-amber-500/20 to-amber-500/5",
    badge: "🫙 Glass",
  },
];

const MISTAKES = [
  "Food residue on containers (rinse quickly).",
  "Plastic bags/film in curbside bins (take to store drop-off).",
  "Batteries & electronics in recycling (take to e-waste).",
  "Loose shredded paper (often not accepted).",
];

export default function Learn() {
  // Nearby finder (ZIP + geolocation)
  const [zip, setZip] = useState("");
  const [loc, setLoc] = useState({ lat: null, lng: null, status: "idle", error: null });
  const zipValid = useMemo(() => /^\d{5}$/.test(zip.trim()), [zip]);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setLoc((s) => ({ ...s, status: "denied", error: "Geolocation not supported" }));
      return;
    }
    setLoc((s) => ({ ...s, status: "requesting", error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          status: "granted",
          error: null,
        });
      },
      (err) => setLoc({ lat: null, lng: null, status: "denied", error: err.message || "Denied" }),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const openMaps = () => {
    if (loc.lat != null && loc.lng != null) {
      window.open(
        `https://www.google.com/maps/search/${encodeURIComponent("recycling center")}/@${loc.lat},${loc.lng},14z`,
        "_blank"
      );
    } else {
      const q = zipValid ? `recycling center near ${zip}` : "recycling center near me";
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(q)}`, "_blank");
    }
  };

  const openEarth911 = () => {
    const where =
      loc.lat != null && loc.lng != null ? `${loc.lat},${loc.lng}` : zipValid ? zip : "";
    window.open(
      `https://search.earth911.com/?what=Recycling&where=${encodeURIComponent(where)}`,
      "_blank"
    );
  };

  return (
    <div className="py-10 lg:py-14">
      {/* Hero */}
      <section className="text-center mb-10 lg:mb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          Learn • Sort • Recycle better
        </div>
        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
          What’s <span className="text-emerald-400">recyclable</span> — and what’s not
        </h1>
        <p className="mt-3 text-white/70 max-w-2xl mx-auto">
          Quick guides and local resources to help you recycle the right way.
        </p>
      </section>

      {/* Guides */}
      <div className="grid md:grid-cols-3 gap-6">
        {GUIDES.map((g, i) => (
          <div key={i} className={`rounded-2xl border border-white/10 bg-gradient-to-b ${g.color} p-6 shadow-lg`}>
            <div className="text-xs text-white/70">{g.badge}</div>
            <h3 className="mt-1 text-xl font-semibold">{g.title}</h3>
            <ul className="mt-3 space-y-1 text-sm text-white/80 list-disc list-inside">
              {g.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
            <div className="mt-3 text-sm text-white/70">
              <span className="text-white/80 font-medium">Tip: </span>
              {g.notes}
            </div>
          </div>
        ))}
      </div>

      {/* Common mistakes */}
      <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-semibold">Common mistakes</h3>
        <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm text-white/80">
          {MISTAKES.map((m, i) => (
            <li key={i} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              ❗ {m}
            </li>
          ))}
        </ul>
      </section>

      {/* Local Recycling Finder */}
      <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-semibold">Find local recycling options</h3>
        <p className="mt-1 text-sm text-white/70">
          Rules vary by city. Use your current location or enter a ZIP code to find nearby centers and guidelines.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={requestLocation}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-semibold shadow-glow"
          >
            📍 Use my location
          </button>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="ZIP code (US)"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            className="w-full sm:w-48 rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex gap-3">
            <button onClick={openMaps} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-semibold">
              Open in Google Maps
            </button>
            <button onClick={openEarth911} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-semibold">
              Earth911 Search
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-white/60">
          {loc.status === "requesting" && "Requesting location permission…"}
          {loc.status === "granted" && (
            <span>
              Location set ✓{" "}
              <span className="text-white/50">
                ({loc.lat?.toFixed(3)}, {loc.lng?.toFixed(3)})
              </span>
            </span>
          )}
          {loc.status === "denied" && <span className="text-red-400">Location unavailable: {loc.error}</span>}
        </div>
      </section>

      {/* CTA to Quiz */}
      <div className="mt-10 flex items-center justify-center gap-3">
        <a href="/quiz" className="px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 font-semibold shadow-glow">
          Take the Recycling Quiz →
        </a>
        <a href="/" className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-semibold">
          ← Back to Detector
        </a>
      </div>
    </div>
  );
}
