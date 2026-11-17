# TrustiFlow – Gemini API setup

1. In the project root (same folder as package.json), create `.env.local`.
2. Add `GEMINI_API_KEY=your_key` and optionally `GEMINI_MODEL=gemini-2.5-flash`.
3. Install the SDK with `npm install`.
4. Restart the dev server (`Ctrl+C`, then `npm run dev`).
5. Open `/api/health`; `aiConfigured` should be `true`.

The API key is read only by the server route. Never use a `NEXT_PUBLIC_` prefix.

Preview file support in this patch: PDF, PNG, JPG, WEBP, TXT, MD and CSV, up to 4 files and 3 MB combined. DOC/DOCX/XLS/XLSX are deliberately rejected until a dedicated extraction pipeline is added. Do not upload sensitive customer documents to a free-tier AI service without checking the provider's current data-use terms.
