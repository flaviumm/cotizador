# Cotizador Bizon

Cotizador de presupuestos industriales (Vite + React) con análisis de planos por AI.

## Desarrollo

Dos terminales:

    npm run dev:api   # función AI local en :3001 (lee OPENAI_API_KEY de .env.local)
    npm run dev       # front en Vite; /api se proxea a :3001

## Deploy en Vercel

1. Subir el repo a GitHub e importarlo en vercel.com (framework: Vite, sin config extra —
   `api/analyze.js` se convierte en función serverless automáticamente).
2. En Settings → Environment Variables agregar `OPENAI_API_KEY` (Production + Preview).
3. Deploy. El análisis de planos cuesta centavos de USD por consulta (GPT-4o).

`.env.local` (local, no se commitea):

    OPENAI_API_KEY=sk-...
