import { useEffect, useRef, useState } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";

const SCORE_THRESHOLD = 0.5;
const IGNORED_CLASSES = new Set(["person"]);
const RECYCLABLE = new Set([
  "bottle","can","cardboard","paper","cup","box","wine glass","plastic bag",
  "bowl","fork","knife","spoon","plate","banana","apple","orange"
]);

export default function Detect() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [status, setStatus] = useState("Loading AI model…");
  const [detecting, setDetecting] = useState(true);
  const [fps, setFps] = useState(0);
  const last = useRef(performance.now());

  // --- Nearby location + ZIP search state (NEW) ---
  const [zip, setZip] = useState("");
  const [loc, setLoc] = useState({
    lat: null,
    lng: null,
    status: "idle", // idle | requesting | granted | denied
    error: null,
  });

  const isZip = (z) => /^\d{5}$/.test((z || "").trim());

  function requestLocation() {
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
      (err) => {
        setLoc({ lat: null, lng: null, status: "denied", error: err.message || "Denied" });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function mapsUrl() {
    if (loc.lat != null && loc.lng != null) {
      return `https://www.google.com/maps/search/${encodeURIComponent("recycling center")}/@${loc.lat},${loc.lng},14z`;
    }
    const q = isZip(zip) ? `recycling center near ${zip}` : "recycling center near me";
    return `https://www.google.com/maps/search/${encodeURIComponent(q)}`;
  }

  function openMaps() {
    window.open(mapsUrl(), "_blank");
  }

  function openEarth911() {
    const where =
      loc.lat != null && loc.lng != null
        ? `${loc.lat},${loc.lng}`
        : isZip(zip)
        ? zip
        : "";
    window.open(
      `https://search.earth911.com/?what=Recycling&where=${encodeURIComponent(where)}`,
      "_blank"
    );
  }
  // --- End Nearby location state ---

  useEffect(() => {
    (async () => {
      try {
        await tf.setBackend("webgl");
        await tf.ready();
        const m = await cocoSsd.load();
        setModel(m);
        setStatus("Model loaded ✅");
      } catch (e) {
        console.error(e);
        setStatus("Failed to load model ❌");
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
        console.error("Camera error:", e);
        setStatus("Camera permission denied ❌");
      }
    })();
  }, []);

  useEffect(() => {
    if (!model) return;
    let rafId;
    const loop = async () => {
      if (detecting && videoRef.current) {
        let preds = await model.detect(videoRef.current);
        preds = preds.filter(
          (p) => p.score >= SCORE_THRESHOLD && !IGNORED_CLASSES.has(p.class.toLowerCase())
        );

        draw(preds);

        // fps (compute instantaneous + smoothed)
        const now = performance.now();
        const dt = now - last.current;
        last.current = now;
        const instFps = 1000 / Math.max(dt, 1);
        const newFps = Math.round(fps * 0.7 + instFps * 0.3);
        setFps(newFps);

        // 🧠 Emit detection stats to App.jsx (navbar pill)
        const recCount = preds.filter((p) => RECYCLABLE.has(p.class.toLowerCase())).length;
        const nonCount = preds.filter(
          (p) => !RECYCLABLE.has(p.class.toLowerCase()) && !IGNORED_CLASSES.has(p.class.toLowerCase())
        ).length;
        const avgOverall =
          preds.length > 0 ? preds.reduce((s, p) => s + p.score, 0) / preds.length : 0;

        window.dispatchEvent(
          new CustomEvent("recyclify:stats", {
            detail: {
              counts: { recyclable: recCount, non: nonCount, total: preds.length },
              avgOverall, // 0..1
              fps: newFps, // number
            },
          })
        );
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
  }, [model, detecting, fps]);

  const draw = (predictions) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    predictions.forEach((p) => {
      const [x, y, w, h] = p.bbox;
      const label = p.class.toLowerCase();
      const isRecyclable = RECYCLABLE.has(label);
      const color = isRecyclable ? "#10c58a" : "#ef4444";
      const tag = isRecyclable ? "♻️ Recyclable" : "🗑️ Not Recyclable";

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      const text = `${p.class} ${Math.round(p.score * 100)}% — ${tag}`;
      ctx.font = "14px -apple-system, system-ui, Segoe UI, Inter, Roboto, sans-serif";
      const pad = 6;
      const tw = ctx.measureText(text).width + pad * 2;
      const th = 22;

      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x, Math.max(0, y - th), tw, th);
      ctx.fillStyle = color;
      ctx.fillText(text, x + pad, Math.max(14, y - 6));
    });
  };

  return (
    <div className="py-10 lg:py-14">
      {/* Hero */}
      <section className="text-center mb-10 lg:mb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          Real-time • On-device • Private
        </div>
        <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
          See what’s <span className="text-brand-400">recyclable</span> — instantly.
        </h1>
        <p className="mt-4 text-white/70 max-w-2xl mx-auto">
          Recyclify uses computer vision to identify items and guide better recycling habits.
        </p>
      </section>

      {/* Detector + Side panel */}
      <div className="grid lg:grid-cols-[1fr,360px] gap-6 items-start">
        <div className="relative rounded-xl2 border border-white/10 bg-gradient-to-b from-white/5 to-white/[.03] shadow-soft overflow-hidden">
          <div className="absolute left-4 top-4 z-10 rounded-full bg-black/60 text-xs px-3 py-1.5 text-white/80 border border-white/10">
            {status} • {fps || 0} fps
          </div>

          <div className="relative w-full aspect-video">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
            <canvas ref={canvasRef} className="absolute inset-0" />
          </div>
        </div>

        {/* Info card */}
        <aside className="rounded-xl2 border border-white/10 bg-white/5 shadow-soft p-5 sticky top-20">
          <h3 className="text-lg font-semibold">Legend</h3>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-brand-500 shadow-glow"></span>
              <span className="text-white/80">Recyclable (green)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500"></span>
              <span className="text-white/80">Not recyclable (red)</span>
            </div>
          </div>

          <h4 className="mt-6 font-medium text-white/90">Tips</h4>
          <ul className="mt-2 list-disc list-inside text-white/70 text-sm space-y-1">
            <li>Rinse containers — no food residue.</li>
            <li>Keep caps on bottles after rinsing.</li>
            <li>Plastic bags/film: take to store drop-off.</li>
          </ul>

          {/* Nearby Recycling Finder (NEW) */}
          <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
            <h4 className="font-medium text-white/90">Find nearby recycling</h4>
            <p className="mt-1 text-xs text-white/60">
              Use your current location or enter a ZIP code.
            </p>

            <div className="mt-3 flex flex-col sm:flex-row gap-3">
              <button
                onClick={requestLocation}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 font-semibold shadow-glow"
              >
                📍 Use my location
              </button>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="ZIP code (US)"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="w-full sm:w-40 rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Status line */}
            <div className="mt-2 text-xs text-white/60">
              {loc.status === "requesting" && "Requesting location permission…"}
              {loc.status === "granted" && (
                <span>
                  Location set ✓{" "}
                  <span className="text-white/50">
                    ({loc.lat?.toFixed(3)}, {loc.lng?.toFixed(3)})
                  </span>
                </span>
              )}
              {loc.status === "denied" && (
                <span className="text-red-400">Location unavailable: {loc.error}</span>
              )}
            </div>

            <div className="mt-3 flex gap-3">
              <button
                onClick={openMaps}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-semibold"
              >
                Open in Google Maps
              </button>
              <button
                onClick={openEarth911}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-semibold"
              >
                Earth911 Search
              </button>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setDetecting((v) => !v)}
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 font-semibold shadow-glow"
            >
              {detecting ? "⏸ Pause" : "▶️ Resume"}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-semibold"
            >
              🔄 Restart
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
