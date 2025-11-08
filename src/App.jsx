import { useEffect, useRef, useState } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";

const SCORE_THRESHOLD = 0.5; // anything below this is too low-confidence
const IGNORED_CLASSES = new Set(["person"]); // skip humans only
const RECYCLABLE = new Set([
  "bottle", "can", "cardboard", "paper", "cup", "box", "wine glass", "plastic bag",
  "bowl", "fork", "knife", "spoon", "plate", "banana", "apple", "orange"
]);

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [status, setStatus] = useState("Loading AI model…");
  const [detecting, setDetecting] = useState(true);

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

    const detectFrame = async () => {
      if (detecting && videoRef.current) {
        let predictions = await model.detect(videoRef.current);

        // ignore people, filter by confidence
        predictions = predictions.filter(
          (p) =>
            !IGNORED_CLASSES.has(p.class.toLowerCase()) &&
            p.score >= SCORE_THRESHOLD
        );

        draw(predictions);
      }
      rafId = requestAnimationFrame(detectFrame);
    };

    detectFrame();
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
      const color = isRecyclable ? "#00ff88" : "#ff4444";
      const tag = isRecyclable ? "♻️ Recyclable" : "🗑️ Not Recyclable";

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      const text = `${p.class} ${Math.round(p.score * 100)}% – ${tag}`;
      ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      const pad = 6;
      const tw = ctx.measureText(text).width + pad * 2;
      const th = 22;

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(x, Math.max(0, y - th), tw, th);

      ctx.fillStyle = color;
      ctx.fillText(text, x + pad, Math.max(14, y - 6));
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-5xl font-bold text-green-400 mb-1">Recyclify</h1>
      <p className="text-sm text-gray-300 mb-4">{status}</p>

      <div className="relative w-full max-w-[900px] aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>

      <div className="mt-5 flex gap-3">
        <button
          onClick={() => setDetecting((d) => !d)}
          className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 active:scale-95 transition font-semibold"
        >
          {detecting ? "⏸ Pause Detection" : "▶️ Resume Detection"}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-gray-600 hover:bg-gray-700 active:scale-95 transition font-semibold"
        >
          🔄 Restart
        </button>
      </div>

      <footer className="mt-6 text-xs text-gray-500">
        Built for the hackathon ♻️ — detects all objects (no people)
      </footer>
    </div>
  );
}
