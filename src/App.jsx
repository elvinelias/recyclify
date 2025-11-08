import { useEffect, useRef, useState } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs"; // required side-effect to init TF backend

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [status, setStatus] = useState("Loading AI model…");
  const [detecting, setDetecting] = useState(true);

  // Load COCO-SSD model
  useEffect(() => {
    (async () => {
      try {
        const m = await cocoSsd.load();
        setModel(m);
        setStatus("Model loaded ✅");
      } catch (e) {
        console.error(e);
        setStatus("Failed to load model ❌");
      }
    })();
  }, []);

  // Ask for webcam and attach stream
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

  // Detection loop (every 300ms)
  useEffect(() => {
    if (!model) return;
    const id = setInterval(async () => {
      if (!detecting || !videoRef.current) return;
      const preds = await model.detect(videoRef.current);
      draw(preds);
    }, 300);
    return () => clearInterval(id);
  }, [model, detecting]);

  const draw = (predictions) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // match canvas to video stream size
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const recyclable = [
      "bottle", "can", "cardboard", "paper", "cup", "box", "wine glass"
    ];

    predictions.forEach((p) => {
      const [x, y, w, h] = p.bbox;
      const label = (p.class || "").toLowerCase();
      const isRecyclable = recyclable.includes(label);
      const tag = isRecyclable ? "♻️ Recyclable" : "🗑️ Not Recyclable";

      ctx.strokeStyle = isRecyclable ? "#00ff88" : "#ff4444";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      const text = `${p.class} ${Math.round(p.score * 100)}% – ${tag}`;
      ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      const pad = 6;
      const tw = ctx.measureText(text).width + pad * 2;
      const th = 22;

      // label background
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(x, Math.max(0, y - th), tw, th);

      // label text
      ctx.fillStyle = isRecyclable ? "#00ff88" : "#ffdddd";
      ctx.fillText(text, x + pad, Math.max(14, y - 6));
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-5xl font-bold text-green-400 mb-1">Recyclify</h1>
      <p className="text-sm text-gray-300 mb-4">{status}</p>

      <div className="relative w-full max-w-[900px] aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
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
        Built for the hackathon ♻️
      </footer>
    </div>
  );
}
