# Serverless QR Attendance Check-In PWA (`DiemDanhQR`)

<div align="center">
  <a href="https://tthanh2k6.github.io/DiemDanhQR/">
    <img src="https://raw.githubusercontent.com/Tthanh2k6/Portfolio/main/public/IMG/project-diemdanhqr.jpg" alt="Serverless QR Check-In PWA with Google Sheets & Apps Script" width="100%" />
  </a>

  <br />

  <p align="center">
    <a href="https://tthanh2k6.github.io/DiemDanhQR/">
      <img src="https://img.shields.io/badge/📱_Launch_Live_PWA-tthanh2k6.github.io/DiemDanhQR-10B981?style=for-the-badge&logo=pwa&logoColor=white" alt="Live PWA" />
    </a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=flat-square&logo=javascript&logoColor=111827" alt="JavaScript" />
    <img src="https://img.shields.io/badge/PWA-Offline_Shell-5A0FC8?style=flat-square&logo=pwa&logoColor=white" alt="PWA" />
    <img src="https://img.shields.io/badge/Google_Apps_Script-Webhook_API-4285F4?style=flat-square&logo=google&logoColor=white" alt="Google Apps Script" />
    <img src="https://img.shields.io/badge/Google_Sheets-Real--Time_DB-34A853?style=flat-square&logo=googlesheets&logoColor=white" alt="Google Sheets" />
  </p>
</div>

---

## ⚡ Overview

**DiemDanhQR** is a zero-server-cost mobile Progressive Web App (PWA) that scans member QR codes via smartphone camera and logs attendance directly into **Google Sheets** in real time through a **Google Apps Script (`doGet`)** webhook backend.

### Key Engineering Features
- **Continuous Queue Scanning Mode (`~25 people/min`):** Keeps the camera stream running continuously without blocking on network latency. Uses a `3,000ms` per-ID debounce map (`recentScans`) so operators can scan a line of attendees rapidly while Google Apps Script requests resolve asynchronously in the background.
- **Automated Google Sheets Schema Management:** The Apps Script endpoint ([`google-apps-script.js`](google-apps-script.js)) automatically locates or creates the `dd-MM-yyyy` date column on the **`Data`** sheet, marks `"x"` on the matching member row, and returns the member's full name as JSON.
- **Field-Tested Mobile UX:**
  - **Multi-Lens Camera Selector:** Enumerates physical camera lenses (including `0.6x` ultra-wide lenses on modern phones for close-range focus).
  - **Synthesized Web Audio & Voice Greeting:** Generates crisp success/error tones via **Web Audio API** (zero external MP3 assets) and reads the attendee's name aloud via **Web Speech API (`speechSynthesis`)**.
  - **Installable PWA:** Includes `manifest.json` and `sw.js` Service Worker for home-screen installation on Android & iOS.

```mermaid
flowchart LR
    QR["Smartphone Camera\n(html5-qrcode)"] --> PWA["DiemDanhQR PWA\n(3s Debounce Queue)"]
    PWA -->|"GET ?id=GT01&date=dd-MM-yyyy"| GAS["Google Apps Script\n(doGet Webhook)"]
    GAS -->|"Find/Create Date Column\n& Mark 'x'"| Sheet[("Google Sheets\n('Data' Tab)")]
    GAS -->|"JSON { status, name }"| PWA
```

---

## 🛠️ Setup Guide (Google Sheets + Apps Script)

### 1. Prepare the Google Sheet
Create a Google Sheet with a tab named **`Data`** and the following header columns in Row 1:

| Column | Purpose |
| :--- | :--- |
| **A** | **Member ID** (matches QR code payload, e.g., `GT01`) |
| **B** | Title / Middle Prefix *(optional)* |
| **C** | **Full Name** |
| **D** | Notes / Reserved |
| **E+** | Attendance date columns (`dd-MM-yyyy`) — **automatically created by the script** when scanning |

### 2. Deploy the Google Apps Script Webhook
1. In your Google Sheet, click **Extensions → Apps Script**.
2. Paste the contents of [`google-apps-script.js`](google-apps-script.js) and save.
3. Click **Deploy → New deployment → Web app**:
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*
4. Copy the generated Web App URL ending in `/exec`.
5. Open the PWA ([Live Demo](https://tthanh2k6.github.io/DiemDanhQR/)) → **Settings (Cài đặt)** → paste the `/exec` URL and click **Save**.

---

## 💻 Run Locally

Requires Node.js (uses zero external npm packages; `server.js` runs on Node's built-in `http` module):

```powershell
git clone https://github.com/Tthanh2k6/DiemDanhQR.git
cd DiemDanhQR
node server.js
```

Open **`http://localhost:8080`** in your browser (or double-click `Chay_App.bat` on Windows).

---

## 📂 Repository Structure

| File | Role |
| :--- | :--- |
| [`index.html`](index.html), [`style.css`](style.css) | Responsive mobile UI with light/dark theme support |
| [`app.js`](app.js) | Camera controller, 3s debounce queue, Web Audio synthesizer, TTS & webhook client |
| [`google-apps-script.js`](google-apps-script.js) | Serverless Google Apps Script (`doGet`) backend for Google Sheets |
| [`manifest.json`](manifest.json), [`sw.js`](sw.js) | PWA manifest and offline Service Worker shell |
| [`server.js`](server.js) | Zero-dependency local static HTTP development server |

---

**Author:** **Trung Thanh Tran** (*Trần Trung Thành*) · [GitHub `@Tthanh2k6`](https://github.com/Tthanh2k6) · [Upwork Profile](https://www.upwork.com/freelancers/~01ee7c2348cb4b62fe)
