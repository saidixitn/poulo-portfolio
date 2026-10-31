# Poulo Portfolio — Local High-Fidelity Replica

A complete offline replica of [poulo.site](https://www.poulo.site/) with all animations, client-side React hydration, Framer Motion interactions, videos, fonts, and responsive media preserved.

---

## 🚀 Quick Start

The server is already running in the background on port `3000`.

To start or reopen at any time:

```bash
# Start the local server
npm start

# Open all 7 pages in your browser
npm run open
```

---

## 🌐 Routes Available Locally

| Page | URL | Description |
|------|-----|-------------|
| **Home** | [http://localhost:3000/](http://localhost:3000/) | Interactive portfolio with filterable projects, about drawer, hairline keyboard loader, and stack icons. |
| **Billdr AI** | [http://localhost:3000/work/ai-agentic/billdr](http://localhost:3000/work/ai-agentic/billdr) | AI & Agentic case study for construction crew management. |
| **Chloe AI** | [http://localhost:3000/work/ai-agentic/chloe](http://localhost:3000/work/ai-agentic/chloe) | Agentic AI companion and workflow manager. |
| **Otera AI** | [http://localhost:3000/work/ai-agentic/otera](http://localhost:3000/work/ai-agentic/otera) | Technical product design for AI co-worker workflows. |
| **QPage SaaS** | [http://localhost:3000/work/saas/qpage](http://localhost:3000/work/saas/qpage) | Enterprise recruiting SaaS UX & design systems. |
| **Weldica** | [http://localhost:3000/work/saas/weldica](http://localhost:3000/work/saas/weldica) | Industrial SaaS platform walkthrough and dark/light mode designs. |
| **Nexscale** | [http://localhost:3000/work/website/nexscale-website](http://localhost:3000/work/website/nexscale-website) | Marketing website design with interactive 3D mockups. |

---

## 📁 Project Architecture

```
Poulo/
├── public/                       # Complete static asset repository
│   ├── index.html                # Pre-rendered home page with full DOM
│   ├── work/                     # Case studies & 90+ high-res webp images
│   │   ├── ai-agentic/           # Billdr, Chloe, Otera case study pages
│   │   ├── saas/                 # QPage, Weldica case study pages
│   │   └── website/              # Nexscale website case study page
│   ├── _next/                    # Next.js Turbopack client bundles & styles
│   │   ├── static/chunks/        # Hydration scripts, framer-motion, themes
│   │   ├── static/media/         # 17 WOFF2 font files
│   │   └── image_cache/          # Responsive image optimizations
│   ├── videos/                   # MP4 video walkthroughs & posters
│   ├── stack/                    # 60+ tool & technology SVGs (color & mono)
│   ├── logos/                    # Client & company logos
│   ├── work-gallery/             # Showcase & gallery assets
│   ├── og/                       # Open Graph share images
│   ├── favicon.ico
│   └── icon.png
├── rsc_data/                     # Next.js App Router Flight payloads (.rsc)
│   ├── index.rsc
│   ├── work_ai-agentic_billdr.rsc
│   ├── work_ai-agentic_chloe.rsc
│   ├── work_ai-agentic_otera.rsc
│   ├── work_saas_qpage.rsc
│   ├── work_saas_weldica.rsc
│   └── work_website_nexscale-website.rsc
├── server.js                     # Local HTTP server with RSC, Next image, and streaming chat support
├── open-all.js                   # Utility script to launch all pages in default browser
├── scrape.js                     # Reusable Puppeteer asset capture pipeline
├── package.json
└── README.md
```

---

## ✨ Features Implemented

1. **Client-Side Next.js Navigation**: When clicking case study links, the server serves captured React Server Component payloads (`?_rsc=...`), giving instant, smooth client transitions.
2. **Direct URL / Refresh Support**: Refreshing any route serves the complete pre-rendered HTML DOM.
3. **Animations & Micro-interactions**:
   - Interactive Hairline Keyboard loader
   - Framer Motion page entrance transitions
   - Category filters (Show all, AI & Agentics, Websites, SaaS, MobileApp, Design System)
   - Press-and-hold "About me" interactive drawer
   - Theme toggle (System / Dark / Light)
4. **Video Streaming Support**: Byte-range requests (`HTTP 206 Partial Content`) for fluid scrubbing of MP4 case study demo videos in all browsers.
5. **Interactive Portfolio Chat**: Local mock streaming API at `/api/chat` enabling the interactive chat widget to respond in real-time.
