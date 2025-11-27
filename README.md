# Supplier Tracker

Supplier Tracker is a web-based platform for managing supplier information, monitoring activity, and supporting accounts payable workflows. It is built as a modern single-page application using Vite and a JavaScript/React-style frontend stack, with Tailwind CSS for styling.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
  - [Building for Production](#building-for-production)
- [Project Structure](#project-structure)
- [Usage](#usage)
- [Development Notes](#development-notes)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Supplier Tracker is designed to help operations, finance, and accounts payable teams keep supplier data organized and accessible in one place. Typical use cases include:

- Maintaining a unified list of suppliers/vendors
- Searching and filtering suppliers quickly
- Tracking key attributes (e.g., internal vs. external, individual vs. company)
- Supporting invoice and payment workflows by keeping supplier metadata consistent

The application is intended to be lightweight, fast, and easily deployable (e.g., via static hosting or GitHub Pages) thanks to the Vite-based build setup.

---

## Features

Current and planned capabilities include:

- **Supplier Directory**
  - Add, view, and update supplier records
  - Capture key supplier details (name, type, notes, etc.)

- **Search & Filter**
  - Quickly locate suppliers by name or other attributes
  - Support for basic filtering logic (e.g., internal vs. external)

- **Category Support (Planned)**
  - Distinguish between:
    - Individuals
    - Companies
    - Internal entities (e.g., records containing “STRATA PLAN”)
  - Future rules/heuristics for auto-categorization

- **Modern UI**
  - Responsive layout suitable for desktop use
  - Tailwind-based styling for consistent design

_(Note: The exact feature set will evolve as the project is developed.)_

---

## Tech Stack

- **Language:** JavaScript
- **Build Tool / Dev Server:** Vite
- **Styling:** Tailwind CSS (configured via `tailwind.config.js` and `postcss.config.js`)
- **Bundler / Tooling:** Vite configuration in `vite.config.js`

---

## Getting Started

### Prerequisites

- **Node.js** (LTS version recommended)
- **npm** (bundled with Node) or **yarn**

Verify your versions:

```bash
node -v
npm -v
```

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/zeyongj/Supplier-Tracker.git
cd Supplier-Tracker
npm install
```

> If you prefer `yarn`, you can run `yarn` instead of `npm install`.

### Running the App

To start the development server:

```bash
npm run dev
```

By default, Vite will start a dev server (commonly on `http://localhost:5173` or similar). The terminal output will show the exact URL.

### Building for Production

To create an optimized production build:

```bash
npm run build
```

To preview the built assets locally:

```bash
npm run preview
```

This runs a local server that serves the production build so you can verify everything works before deployment.

---

## Project Structure

The high-level structure of the repo is:

```text
Supplier-Tracker/
├─ src/
│  ├─ ... (application source code: components, pages, hooks, etc.)
├─ index.html
├─ package.json
├─ postcss.config.js
├─ tailwind.config.js
├─ vite.config.js
└─ README.md
```

Key items:

- `src/` – Main application source code (React-style components and application logic).
- `index.html` – Entry HTML file used by Vite.
- `package.json` – Project metadata, scripts, and dependencies.
- `tailwind.config.js` / `postcss.config.js` – Tailwind and PostCSS configuration.
- `vite.config.js` – Vite build and dev server configuration.
- `README.md` – This documentation file.

As the project evolves, you can expand this section with more detail on the internal structure (e.g., `src/components/`, `src/pages/`, `src/hooks/`, etc.).

---

## Usage

Once the dev server is running:

1. Open the app in your browser (e.g., `http://localhost:5173`).
2. Use the main interface to:
   - Add a new supplier record (e.g., name, type, notes).
   - Browse existing suppliers.
   - Search for suppliers by name or keyword.
3. (Planned) Apply filters or categories to segment suppliers:
   - Individual vs. company
   - Internal entities (e.g., “STRATA PLAN ...”)

You can tailor this section to match the exact flows implemented in the UI (e.g., field names, buttons, table actions).

---

## Development Notes

- The project is scaffolded as a Vite app, so most standard Vite workflows and configuration patterns apply.
- Tailwind utility classes are used for styling; if you modify `tailwind.config.js`, remember to restart the dev server.
- If you add new dependencies, update `package.json` and ensure `npm install` succeeds cleanly.

Potential enhancements you may consider documenting later:

- State management approach (e.g., React hooks, context, etc.).
- API integration or data persistence strategy.
- Authentication/authorization if you later secure the app.

---

## Roadmap

Planned future improvements (suggested):

- Supplier categorization rules (e.g., detect “STRATA PLAN” for internal entities).
- Import/export of supplier lists (CSV/Excel).
- Integration with invoice or AP systems.
- Role-based access (AP, AR, PM, admin).
- Tests (unit and integration) and CI integration.

You can maintain this list via GitHub Issues and link to milestones as the project matures.

---

## Contributing

This is currently a personal/early-stage project. If you have suggestions or identify issues:

1. Open an issue in the GitHub repository.
2. Optionally, fork the repo and submit a pull request with a clear description of your changes.

---

## License

Zeyong Jin All Rights Reserved. 

This repository is provided for reference only; reuse, modification, or redistribution of the code is not permitted without explicit permission from the author.

---
