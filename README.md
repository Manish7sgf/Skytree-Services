# Skytree Services Portal

## License

This project is proprietary and closed-source. 
Copyright (c) 2026 Manish Varman M and Yaminah A. All rights reserved.

This code is publicly visible for portfolio/demonstration 
purposes only. You may NOT copy, fork, redistribute, 
deploy, or reuse this code or any part of it without 
explicit written permission from the copyright holder. 
See the [LICENSE](./LICENSE) file for full terms.

A feature-rich, high-performance web application designed for digital services hubs, retailers, and distributors. Skytree compiles essential utilities—ranging from a full-fledged passport photo editor to professional document builders, government portal integrations, and a multi-level transaction ledger system—into a unified, responsive client interface.

---

## 🚀 Key Features & Modules

### 1. 📷 Advanced Photo Studio
* **Interactive Image Cropper**: Precise pixel crops with custom aspect ratios (e.g., passport, stamp sizes).
* **Studio-Grade Adjustments**: Fine-tune brightness, contrast, saturation, sharpness, and blur.
* **Smart Background Tools**: Real-time color masking/removal and custom solid backgrounds (white, blue, etc.).
* **Print Layout Manager**: Arrange prints across paper sizes (4x6, 5x7, A4) with custom layouts (2, 4, 8, 12, 16 photos or auto-fit), safe zones, cutting marks, margins, and borders.
* **PDF ID Card Extractor**: Automatically extract front and back card regions from official Aadhaar or PAN card PDFs (supports password-decryption client-side) and format them for quick printing.

### 2. 📝 Resume Builder
* **Multi-Profile Templates**: Standard Professional, First-Year Student, College Fresher, Experienced Professional, and Labour/Union formats.
* **A4 Live Sheet Preview**: Renders in A4 proportions with customizable accents, styles (modern, classic, executive), and font variables.
* **Custom Field Constructor**: Add custom sections, labels, and text/textarea entries on the fly.
* **Direct Export**: Download print-ready PDFs or print directly from the browser viewport.

### 3. 🎓 Certificate Service
* **Utility Forms**: Generate Bonafide, Medical Fitness, Internship, No Dues, and Income Certificates.
* **Validation Engine**: Strictly enforces required fields, 10-digit phone limits, structured email patterns, and historical date boundaries.
* **Exports**: Export editable Microsoft Word files (`.doc`) or print-ready PDFs.

### 4. ⚡ Electricity Board (EB) Utilities
* **Name Transfer Portal**: Service transfers with structural category selectors, aadhar integration, and digital signatures.
* **New Service Connection**: Specialized connection flows for Domestic, Agricultural, Commercial, and Industrial tariffs, with dynamic load selectors.
* **Tariff & Load Migration**: Shift connections between single/three-phase systems, or request category reclassification.

### 5. 🏛️ Regional & Government Integration (Mock)
* **TN Police Center**: Real-time status lookup trackers for FIRs, CSRs, and vehicle clearance.
* **Birth & Death Registry**: Verify register entries and certificate status.
* **TN eDistrict**: Academic and community caste certificate validation forms.

### 6. 💳 Wallet, Payouts & Service Finance
* **Multi-Level Payouts**: Configure pricing structures per service, distributing user fees into administrator margins, employee commissions, and distributor shares.
* **Transaction Ledger**: Track credit/debit transaction history, wallet balances, and user statuses.
* **Razorpay Gateway**: Backend payment processing with local mock/simulation fallback when in demo mode.
* **Role-Based Access**: Granular service permission configurations for Administrators, Distributors, Employees, and Users.

---

## 🛠️ Technology Stack

### Frontend
* **Core**: React 19, TypeScript, HTML5, Vanilla CSS3.
* **Build System**: Vite.
* **Document Rendering**: `html2canvas` and `jspdf` for visual canvas exports.
* **Image Processing**: `react-image-crop` for image crop bounds; native HTML Canvas APIs for image enhancement algorithms.
* **Icons**: Inline raw SVGs optimized for fast rendering and CSS transitions.

### Backend
* **Core**: Express.js, Node.js.
* **Payments**: Razorpay SDK.
* **Security & Configuration**: `dotenv`, `cors`, `crypto`.

---

## 🎨 Architecture & Styling Design System

The project uses a premium, modern design system based on glassmorphism and smooth micro-interactions:
* **Typography**: Outfitted with google font [Outfit](https://fonts.google.com/specimen/Outfit) for a clean, premium typography feel.
* **Color Custom Properties**: Located in [src/index.css](file:///e:/Website/src/index.css). Dynamically supports **Dark Mode (Default)** and **Light Mode** through `data-theme` updates.
* **Responsive Breakpoints**: Tailored screen adapters ranging from mobile viewport optimization (≤767px) with touch-friendly hamburger toggles to 4K desktop scaling.
* **Resizable Sidebar**: Customizable layout width settings that are saved in `localStorage` alongside user preferences.

---

## 📂 Project Structure

```bash
Skytree/
├── public/                 # Static assets
├── server/                 # Express payment server
│   ├── config/             # Config files
│   ├── models/             # Schema definitions
│   └── index.js            # Main entry point for backend APIs
├── src/                    # React frontend application
│   ├── assets/             # Images and visual elements
│   ├── components/         # Reusable modules and widgets
│   │   ├── CertificateServiceModule.tsx    # Academic & utility certificates
│   │   ├── OptimizedFileUpload.tsx         # File compressor & optimizer
│   │   ├── PhotoStudioServiceModule.tsx    # Image editor & grid generator
│   │   └── ResumeServiceModule.tsx         # Resume builder
│   ├── hooks/
│   │   └── useFileOptimizer.ts             # Compression hooks
│   ├── App.css
│   ├── App.tsx             # Central dashboard & auth routers
│   ├── index.css           # Global typography & design variables
│   └── main.tsx            # Root entry point
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Local Development Setup

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18+) and `npm` installed.

### 1. Backend Server Setup
Navigate to the `server` directory, create a `.env` file, and start the local payment server:

```bash
# Clone and navigate to server
cd server

# Install dependencies
npm install

# Start development backend
npm run dev
```

Create a `.env` file inside `server/` with the following variables:
```env
PORT=5000
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```
*Note: If no Razorpay keys are provided, the system automatically runs in **simulation demo mode** to allow local transaction testing without failing.*

### 2. Frontend client Setup
Open a new terminal window, navigate back to the project root, install dependencies, and launch Vite:

```bash
# Install root client dependencies
npm install

# Start Vite client
npm run dev
```

The application will launch on your default browser (usually at `http://localhost:5173`).

### 3. Deploying to GitHub Pages
To compile and deploy the static build package to GitHub Pages:
```bash
npm run deploy
```

---

## 📚 Existing Documentation

For detailed technical references on specific sub-systems, refer to:
* 📘 **[IMPLEMENTATION_DETAILS.md](file:///e:/Website/IMPLEMENTATION_DETAILS.md)**: Breakdowns of variables, theme switching logic, and responsive hooks.
* 📗 **[RESPONSIVE_THEME_GUIDE.md](file:///e:/Website/RESPONSIVE_THEME_GUIDE.md)**: Rules for writing adaptive CSS, accessibilities, and layouts.
* 📙 **[THEME_QUICK_START.md](file:///e:/Website/THEME_QUICK_START.md)**: Quick start testing routines and checklists.
* 📕 **[VISUAL_GUIDE.md](file:///e:/Website/VISUAL_GUIDE.md)**: Visual screenshots reference for components.
