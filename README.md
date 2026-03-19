# 🌿 PlantScan — AI Plant Disease Scanner

An AI-powered web app that analyses plant leaf photos and tells you whether your plant is **healthy or diseased** — using Claude's vision capabilities.

![PlantScan Screenshot](screenshot.png)

---

## ✨ Features

- 📷 **Drag & drop** or click to upload any plant leaf photo
- 🤖 **Claude Vision AI** analyses the leaf for signs of disease, discoloration, lesions, or abnormalities
- ✅ Returns a **health verdict** (Healthy / Diseased / Unknown)
- 💊 Provides **disease name + treatment recommendations** if a problem is detected
- 🔐 Your API key is never stored — it stays in the browser tab only
- 📱 Fully **responsive** — works on mobile and desktop
- 🚀 **Zero backend required** — pure HTML/CSS/JS, runs from any static host

---

## 🚀 Quick Start

### Option 1 — Open directly (no server needed)

```bash
git clone https://github.com/yourusername/plant-disease-scanner.git
cd plant-disease-scanner
open index.html   # macOS
# or double-click index.html in your file manager
```

### Option 2 — Local dev server

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js
npx serve .

# Using VS Code
# Install "Live Server" extension and click "Go Live"
```

Then visit `http://localhost:8080`

### Option 3 — Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to `main` branch, root `/`
4. Your app will be live at `https://yourusername.github.io/plant-disease-scanner`

---

## 🔑 API Key Setup

You need an **Anthropic API key** to use this app.

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Go to **API Keys** and create a new key
3. Paste it into the app's key field when prompted

> Your key is only used client-side to call Anthropic's API directly. It is never sent to any other server.

---

## 🗂 File Structure

```
plant-disease-scanner/
├── index.html      # App UI & markup
├── style.css       # All styling (no framework dependencies)
├── app.js          # Core logic: upload, preview, API call, results
└── README.md       # This file
```

---

## 🧠 How It Works

1. User uploads a leaf photo (drag & drop or file picker)
2. The image is converted to **base64** in the browser
3. Sent to **Claude's Vision API** (`claude-opus-4-5`) with a structured system prompt
4. Claude responds with structured JSON:
   ```json
   {
     "status": "diseased",
     "confidence": "high",
     "verdict": "Signs of early blight detected on tomato leaf.",
     "details": "The leaf shows concentric brown rings typical of Alternaria solani (early blight)..."
   }
   ```
5. The app renders the result with a health indicator, confidence level, and detailed explanation

---

## 🌿 Example Diseases It Can Detect

- **Early Blight** (tomato, potato)
- **Late Blight**
- **Powdery Mildew**
- **Leaf Rust**
- **Bacterial Leaf Spot**
- **Mosaic Virus**
- **Nutrient deficiencies** (yellowing, chlorosis)
- And many more — Claude is trained on broad botanical knowledge

---

## ⚙️ Customisation

### Change the AI model
In `app.js`, find:
```js
model: 'claude-opus-4-5',
```
You can swap to `claude-sonnet-4-5` (faster, cheaper) or `claude-opus-4-5` (most capable).

### Add more diseases / custom instructions
Edit the `systemPrompt` string in `app.js` to focus on specific plant types, add language support, or change the output format.

---

## 🔒 Privacy

- No images or API keys are ever stored or sent to any server other than Anthropic
- All processing happens in the user's browser
- No cookies, no tracking

---

## 🙏 Built With

- [Claude API](https://anthropic.com) — Vision AI
- [DM Serif Display & Syne](https://fonts.google.com) — Typography
- Vanilla HTML, CSS & JavaScript — No frameworks

---

## 📄 License

MIT — free to use, modify, and deploy.
