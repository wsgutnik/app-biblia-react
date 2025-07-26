# Biblia Sagrada - ADBelem

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Getting Started

### Prerequisites

- **Node.js 18 or newer** is required. You can verify your version with `node --version`.

### Supported Node versions

The project relies on Vite 7 which requires **Node 18+**. Using older versions may
lead to build errors.

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

   If the install fails with a Rollup “native” module error, remove `node_modules` and `package-lock.json` and install again with optional dependencies enabled:

   ```bash
   rm -rf node_modules package-lock.json
   npm install --include=optional
   ```

2. Create a `.env` file and set your API key used to translate dictionary entries:

   ```bash
   VITE_GEMINI_API_KEY=your-google-gemini-key
   ```

### Development

- Start the dev server:

  ```bash
  npm run dev
  ```

- Build the project:

  ```bash
  npm run build
  ```

- Preview the production build locally:

  ```bash
  npm run preview
  ```
