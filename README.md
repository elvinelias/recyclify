# ♻️ Recyclify — AI-Powered Recycling Assistant

Recyclify is an intelligent, real-time recycling assistant that helps users identify recyclable items, locate nearby recycling centers, and learn proper waste-sorting habits. Using on-device computer vision (TensorFlow.js + COCO-SSD), Recyclify scans items through your camera and automatically classifies them as recyclable or not, keeping all processing private on your device. It also features an embedded map that finds nearby recycling centers and trash bins using OpenStreetMap and the Overpass API, along with optional ZIP-code search and Google Maps integration. A dedicated Learn page teaches proper sorting rules, and an optional Gemini-powered chat assistant answers recycling questions. The goal of Recyclify is to make sustainable living simple, accurate, and accessible for everyone.

---

## 🚀 Running Recyclify Locally

### **1. Clone the repository**

```bash
git clone https://github.com/YOUR-USERNAME/recyclify.git
cd recyclify
```

### **2. Install dependencies**

```bash
npm install
```

### **3. Create a `.env` file in the project root**

```
GOOGLE_API_KEY=YOUR_API_KEY_HERE
PORT=8787
```

### **4. Start the backend (Express server)**

```bash
node server.js
```

Backend runs at:

```
http://localhost:8787
```

### **5. Start the frontend (Vite)**

```bash
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

## 🧰 Tech Stack

* React + Vite
* Tailwind CSS
* TensorFlow.js (COCO-SSD object detection)
* React-Leaflet + OpenStreetMap - Under Development
* Overpass API for recycling 
* Trash-bin lookup - Slightly Buggy
* Google Gemini API (optional chat assistant) - Under Development
* Express.js backend

---
