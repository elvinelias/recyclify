// src/pages/Detect.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";

const SCORE_THRESHOLD = 0.5;
const IGNORED_CLASSES = new Set(["person"]);
const RECYCLABLE = new Set([
  "bottle", "can", "cardboard", "paper", "cup", "box", "wine glass", "plastic bag",
  "bowl", "fork", "knife", "spoon", "plate", "banana", "apple", "orange"
]);

export default function Detect() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [status, setStatus] = useState("Loading AI model…");
  const [detecting, setDetecting] = useState(true);
  const [fps, setFps] = useState(0);
  const last = useRef(performance.now());

  // 📍 Map/geo state
  const [coord, setCoord] = useState(null);            // { lat, lon }
  const [places, setPlaces] = useState([]);            // recycling / waste_disposal
  const [geoErr, setGeoErr] = useState("");
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  // 🗑️ Public trash bins
  const [showTrash, setShowTrash] = useState(true);
  const [bins, setBins] = useState([]);
  const [loadingBins, setLoadingBins] = useState(false);

  // 🔎 Finder (ZIP + explicit geolocation)
  const [zip, setZip] = useState("");
  const [loc, setLoc] = useState({ lat: null, lng: null, status: "idle", error: null });
  const zipValid = useMemo(() => /^\d{5}$/.test(zip.trim()), [zip]);

  // ====== AI model + camera ======
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

        // fps (smoothed)
        const now = performance.now();
        const dt = now - last.current;
        last.current = now;
        const instFps = 1000 / Math.max(dt, 1);
        setFps((prev) => Math.round(prev * 0.7 + instFps * 0.3));

        // navbar stats broadcast
        const recCount = preds.filter((p) => RECYCLABLE.has(p.class.toLowerCase())).length;
        const nonCount = preds.length - recCount;
        const avgOverall = preds.length ? preds.reduce((s, p) => s + p.score, 0) / preds.length : 0;

        window.dispatchEvent(
          new CustomEvent("recyclify:stats", {
            detail: {
              counts: { recyclable: recCount, non: nonCount, total: preds.length },
              avgOverall,
              fps: Math.round(instFps),
            },
          })
        );
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
  }, [model, detecting]);

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

  // ======= GEO + MAP HELPERS =======
  function FlyTo({ center }) {
    const map = useMap();
    useEffect(() => {
      if (center) map.flyTo([center.lat, center.lon], 13, { duration: 0.8 });
    }, [center, map]);
    return null;
  }

  // Robust location request
  const requestLocation = async () => {
    try {
      const isLocalhost =
        location.hostname === "localhost" || location.hostname === "127.0.0.1";
      if (!isLocalhost && location.protocol !== "https:") {
        setLoc({ lat: null, lng: null, status: "denied", error: "Geolocation requires HTTPS or localhost" });
        setGeoErr("Geolocation requires HTTPS or localhost");
        return;
      }

      // Permissions API (best effort)
      try {
        if (navigator.permissions?.query) {
          const perm = await navigator.permissions.query({ name: "geolocation" });
          if (perm.state === "denied") {
            setLoc({ lat: null, lng: null, status: "denied", error: "Permission denied in browser settings" });
            setGeoErr("Permission denied in browser settings");
            return;
          }
        }
      } catch {
        // ignore
      }

      if (!("geolocation" in navigator)) {
        setLoc({ lat: null, lng: null, status: "denied", error: "Geolocation not supported" });
        setGeoErr("Geolocation not supported");
        return;
      }

      setLoc((s) => ({ ...s, status: "requesting", error: null }));
      setGeoErr("");

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLoc({ lat, lng, status: "granted", error: null });
          setCoord({ lat, lon: lng });
        },
        (err) => {
          let msg = "Denied";
          if (err?.code === 1) msg = "Permission denied";
          else if (err?.code === 2) msg = "Position unavailable";
          else if (err?.code === 3) msg = "Timeout";
          setLoc({ lat: null, lng: null, status: "denied", error: msg });
          setGeoErr(msg);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } catch (e) {
      console.error("Geolocation exception:", e);
      setLoc({ lat: null, lng: null, status: "denied", error: "Unexpected error" });
      setGeoErr("Unexpected error");
    }
  };

  // External helpers
  const openMaps = () => {
    if (coord) {
      window.open(
        `https://www.google.com/maps/search/${encodeURIComponent("recycling center")}/@${coord.lat},${coord.lon},14z`,
        "_blank"
      );
    } else {
      const q = zipValid ? `recycling center near ${zip}` : "recycling center near me";
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(q)}`, "_blank");
    }
  };

  const openEarth911 = () => {
    const where = coord ? `${coord.lat},${coord.lon}` : zipValid ? zip : "";
    window.open(
      `https://search.earth911.com/?what=Recycling&where=${encodeURIComponent(where)}`,
      "_blank"
    );
  };

  // Recycling centers from Overpass (when we have coord)
  useEffect(() => {
    if (!coord) return;

    const fetchOverpass = async () => {
      try {
        setLoadingPlaces(true);
        const radius = 4000;
        const query = `
          [out:json][timeout:25];
          (
            node["amenity"="recycling"](around:${radius},${coord.lat},${coord.lon});
            node["amenity"="waste_disposal"](around:${radius},${coord.lat},${coord.lon});
            way["amenity"="recycling"](around:${radius},${coord.lat},${coord.lon});
            way["amenity"="waste_disposal"](around:${radius},${coord.lat},${coord.lon});
          );
          out center;
        `;
        const resp = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: new URLSearchParams({ data: query }),
        });
        const data = await resp.json();

        const items = (data.elements || [])
          .map((el) => {
            const isWay = el.type === "way";
            const lat = isWay ? el.center?.lat : el.lat;
            const lon = isWay ? el.center?.lon : el.lon;
            return {
              id: `${el.type}/${el.id}`,
              lat,
              lon,
              name:
                el.tags?.name ||
                (el.tags?.operator ? `${el.tags.operator} (site)` : "Recycling point"),
              tags: el.tags || {},
            };
          })
          .filter((p) => p.lat && p.lon);

        setPlaces(items);
      } catch (e) {
        console.error("Overpass error:", e);
      } finally {
        setLoadingPlaces(false);
      }
    };

    fetchOverpass();
  }, [coord]);

  // Public trash bins (toggleable) from Overpass
  useEffect(() => {
    if (!coord || !showTrash) {
      if (!showTrash) setBins([]);
      return;
    }

    const fetchBins = async () => {
      try {
        setLoadingBins(true);
        const radius = 3000;
        const query = `
          [out:json][timeout:25];
          (
            node["amenity"="waste_basket"](around:${radius},${coord.lat},${coord.lon});
            node["amenity"="litter_bin"](around:${radius},${coord.lat},${coord.lon});
          );
          out center;
        `;
        const resp = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: new URLSearchParams({ data: query }),
        });
        const data = await resp.json();

        const items = (data.elements || [])
          .map((el) => ({
            id: `${el.type}/${el.id}`,
            lat: el.lat ?? el.center?.lat,
            lon: el.lon ?? el.center?.lon,
            name: el.tags?.name || "Trash bin",
            tags: el.tags || {},
          }))
          .filter((p) => p.lat && p.lon);

        setBins(items);
      } catch (e) {
        console.error("Overpass (bins) error:", e);
      } finally {
        setLoadingBins(false);
      }
    };

    fetchBins();
  }, [coord, showTrash]);

  // Optional: try fetching location once on mount
  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {/* Detector + Side panel (with map) */}
      <div className="grid lg:grid-cols-[1fr,420px] gap-6 items-start">
        {/* Left: Camera */}
        <div className="relative rounded-xl2 border border-white/10 bg-gradient-to-b from-white/5 to-white/[.03] shadow-soft overflow-hidden">
          <div className="absolute left-4 top-4 z-10 rounded-full bg-black/60 text-xs px-3 py-1.5 text-white/80 border border-white/10">
            {status} • {fps || 0} fps
          </div>

          <div className="relative w-full aspect-video">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
            <canvas ref={canvasRef} className="absolute inset-0" />
          </div>
        </div>

        {/* Right: Info + Finder + Map */}
        <aside className="rounded-xl2 border border-white/10 bg-white/5 shadow-soft p-5 sticky top-20 space-y-5">
          <h3 className="text-lg font-semibold">Legend</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-brand-500 shadow-glow" />
              <span className="text-white/80">Recyclable (green)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-white/80">Not recyclable (red)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
              <span className="text-white/80">Trash bins (orange)</span>
            </div>
          </div>

          {/* Finder controls */}
          <div className="space-y-2">
            <div className="text-sm text-white/70">Find recycling near…</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={requestLocation}
                className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-sm font-semibold"
              >
                📍 Use my location
              </button>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="ZIP code (US)"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="w-40 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
              />
              <button onClick={openMaps} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
                Open in Google Maps
              </button>
              <button onClick={openEarth911} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
                Earth911 Search
              </button>
            </div>

            {/* Status line */}
            <div className="text-xs text-white/60 space-y-1">
              {loc.status === "requesting" && "Requesting location permission…"}

              {loc.status === "granted" && (
                <>
                  Location set ✓{" "}
                  <span className="text-white/50">
                    ({loc.lat?.toFixed(3)}, {loc.lng?.toFixed(3)})
                  </span>
                </>
              )}

              {loc.status === "denied" && (
                <div className="text-red-400">
                  Location unavailable: {loc.error}.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.userAgent.includes("Chrome")) {
                        window.open("chrome://settings/content/location", "_blank");
                      } else {
                        alert("Please enable Location for this site in your browser settings and try again.");
                      }
                    }}
                    className="underline text-white/80"
                  >
                    Open location settings
                  </button>
                </div>
              )}

              {(!loc.status || loc.status === "idle") && (
                <div>
                  {geoErr
                    ? `📍 ${geoErr}`
                    : coord
                    ? `Location: ${coord.lat?.toFixed(4)}, ${coord.lon?.toFixed(4)}`
                    : "—"}
                </div>
              )}

              {location.protocol !== "https:" &&
                location.hostname !== "localhost" &&
                location.hostname !== "127.0.0.1" && (
                  <div className="text-amber-300">
                    Tip: Use HTTPS or open via http://localhost for geolocation.
                  </div>
                )}
            </div>

            {/* Toggle bins */}
            <label className="mt-2 inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-amber-400"
                checked={showTrash}
                onChange={(e) => setShowTrash(e.target.checked)}
              />
              <span className="text-white/80">Show nearby trash bins</span>
            </label>
          </div>

          {/* Embedded map */}
          <div className="rounded-xl overflow-hidden border border-white/10">
            <div className="h-[320px]">
              <MapContainer
                center={coord ? [coord.lat, coord.lon] : [37.7749, -122.4194]}
                zoom={coord ? 13 : 12}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {coord && <FlyTo center={coord} />}

                {/* User location marker */}
                {coord && (
                  <CircleMarker
                    center={[coord.lat, coord.lon]}
                    radius={8}
                    pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.6 }}
                  >
                    <Popup><b>You are here</b></Popup>
                  </CircleMarker>
                )}

                {/* Recycling centers */}
                {places.map((p) => (
                  <CircleMarker
                    key={p.id}
                    center={[p.lat, p.lon]}
                    radius={7}
                    pathOptions={{ color: "#60a5fa", fillColor: "#60a5fa", fillOpacity: 0.6 }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">{p.name}</div>
                        {p.tags?.operator && <div>Operator: {p.tags.operator}</div>}
                        {p.tags?.recycling_type && <div>Type: {p.tags.recycling_type}</div>}
                        <div className="mt-1">
                          <a
                            className="underline"
                            href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open in Maps
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* Trash bins */}
                {showTrash && bins.map((p) => (
                  <CircleMarker
                    key={`bin-${p.id}`}
                    center={[p.lat, p.lon]}
                    radius={6}
                    pathOptions={{ color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.65 }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">Trash bin</div>
                        {p.tags?.operator && <div>Operator: {p.tags.operator}</div>}
                        <div className="mt-1">
                          <a
                            className="underline"
                            href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open in Maps
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
            <div className="px-3 py-2 text-xs text-white/60 border-t border-white/10">
              {loadingPlaces || loadingBins
                ? "Searching nearby…"
                : `Found ${places.length} recycling site(s)${
                    showTrash ? ` and ${bins.length} trash bin(s)` : ""
                  }`}
            </div>
          </div>

          <div className="flex gap-3">
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
