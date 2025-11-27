# Supplier Tracker

Supplier Tracker is a web-based platform for managing supplier information, monitoring activity, and supporting accounts payable workflows. It is built as a modern single-page application using Vite and a JavaScript/React-style frontend stack, with Tailwind CSS for styling. :contentReference[oaicite:0]{index=0}

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

The application is intended to be lightweight, fast, and easily deployable (e.g., via static hosting or GitHub Pages) thanks to the Vite-based build setup. :contentReference[oaicite:1]{index=1}

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

- **Language:** JavaScript :contentReference[oaicite:2]{index=2}  
- **Build Tool / Dev Server:** Vite :contentReference[oaicite:3]{index=3}  
- **Styling:** Tailwind CSS (configured via `tailwind.config.js` and `postcss.config.js`) :contentReference[oaicite:4]{index=4}  
- **Bundler / Tooling:** Vite configuration in `vite.config.js` :contentReference[oaicite:5]{index=5}  

---

## Getting Started

### Prerequisites

- **Node.js** (LTS version recommended)
- **npm** (bundled with Node) or **yarn**

Verify your versions:

```bash
node -v
npm -v
