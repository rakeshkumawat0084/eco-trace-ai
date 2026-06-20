# EcoTrace AI 🌍
### Sustainability Catalyst & Carbon Footprint Analysis Engine

EcoTrace AI is a high-performance, full-stack application designed to help users quantify, analyze, and reduce their environmental impact. By leveraging the **Gemini 1.5 Pro** model, it translates lifestyle data into precise carbon metrics and provides a strategic roadmap for sustainability.

---

## ✨ Key Features

- **AI-Powered Carbon Audit**: Real-time analysis of lifestyle factors (Transport, Diet, Energy) using Gemini AI to calculate monthly CO2 emissions.
- **Hydrological Impact Audit**: A specialized tool to track water consumption, including RO waste and virtual water footprints.
- **Circular Economy Hub**: An E-Waste logistics guide providing actionable disposal plans for mobiles, batteries, and monitors.
- **Green Career Pathfinder**: An industry alignment engine that maps current skills to emerging roles in the sustainability sector.
- **Dynamic Impact Roadmap**: Interactive checklist that demonstrates real-time footprint reduction as users commit to eco-friendly tasks.
- **Visual Analytics**: Interactive history tracking and trend analysis using Chart.js to monitor sustainability progress over time.
- **Eco-Report Export**: Generate professional PDF sustainability reports directly from the dashboard.

## 🛠️ Technical Architecture

### Frontend
- **React 18** with **Vite** for optimized builds.
- **Tailwind CSS** for a bespoke, high-contrast "Slate" visual identity.
- **Framer Motion** for fluid UI transitions and micro-animations.
- **Lucide React** for modern iconography.
- **Chart.js** for performant history and distribution charts.

### Backend
- **Node.js + Express** proxy server for secure Gemini API communication.
- **Google Gemini 1.5 Pro**: Primary LLM for generating contextual roadmap insights.
- **PDF Generation**: Integrated audit documentation export.

## 📊 Calculation Logic (Standardized)

The engine utilizes industry-standard emission factors to ensure accuracy:

- **Energy**: `0.385 kg CO2/kWh` (Average grid factor).
- **Transport**:
  - Petrol: `0.17 kg CO2/km`
  - Diesel: `0.15 kg CO2/km`
  - EV: `0.05 kg CO2/km` (Grid-average charged).
- **Lifestyle (Dietary Base)**:
  - Meat-Heavy: `~250 kg CO2/mo`
  - Vegetarian: `~150 kg CO2/mo`
  - Vegan: `~100 kg CO2/mo`

## 🚀 Getting Started

### Installation
1. **Clone the repository** and install dependencies:
   ```bash
   npm install
   ```
2. **Setup Environment**:
   Define `GEMINI_API_KEY` in your environment settings (managed via the AI Studio sidebar).
3. **Run Development**:
   ```bash
   npm run dev
   ```

## 🎨 Design Philosophy
EcoTrace AI utilizes a **"Cosmic Slate"** theme—emphasizing deep grays, vibrant emerald accents, and generous negative space. The UI features **Dynamic Accent Shifting**, where visual boundaries shift color (Red/Amber/Emerald) based on the current carbon footprint tier.

---
*Developed as a Sustainability Catalyst.*
