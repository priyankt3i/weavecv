# WeaveCV: AI-Powered Resume Builder

WeaveCV is an AI Studio application designed to help users create, review, design, and export professional resumes. AI is used for content generation and ATS feedback, while template selection is handled locally so users can change designs without triggering new LLM calls.

## Features

*   **Stepped Resume Workflow**: Move through Create, Review, Design, and Download without crowding every tool onto one screen.
*   **AI-Powered Markdown Drafting**: Generate editable resume Markdown from raw resume text, with optional job-description tuning.
*   **Guided Draft Changes**: Ask AI for Markdown edits during Create, with confirmation prompts for changes that may weaken professionalism.
*   **AI Review & Score**: Get ATS feedback and apply suggestions to the Markdown content.
*   **Local Template Rendering**: Pick a predefined or imported HTML/CSS template after content is finalized. Template selection does not call the LLM.
*   **Paginated Preview**: Render the selected resume into paper-sized page images before export, using a configurable layout width so desktop resume designs do not collapse into mobile breakpoints.
*   **Page Setup Controls**: Choose paper size, layout width, and page margins before exporting.
*   **Style Import**: Paste resume HTML/CSS and convert it into a reusable WeaveCV template.
*   **Flexible Export Options**:
    *   **As Document (PDF)**: Generate high-fidelity PDFs from the same page images shown in preview.
    *   **As Code (HTML)**: Download the rendered resume HTML.

## Current Workflow

1.  **Create**: Paste resume text, optionally enable job-description tuning, generate an editable Markdown draft, and ask AI for targeted changes.
2.  **Review**: Edit Markdown directly, run the AI ATS review, and apply or discard suggestions.
3.  **Design**: Select or import a template. The app converts Markdown to HTML locally with no AI call when switching templates.
4.  **Download**: Set a file name and export the selected design as PDF or HTML. PDF export uses the paginated preview renderer, not the browser print dialog.

Imported templates are stored in the browser session.

## Run Locally

To get WeaveCV up and running on your local machine, follow these steps:

### Prerequisites

*   **Node.js**: Ensure you have Node.js installed (version 18 or higher is recommended). You can download it from [nodejs.org](https://nodejs.org/).
*   **npm**: Node Package Manager, which comes bundled with Node.js.

### Installation

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone [repository-url]
    cd weavecv
    ```
    (Note: If you are already in the `weavecv` directory, you can skip this step.)

2.  **Install project dependencies:**
    This command will install all necessary packages for both the frontend and the backend server.
    ```bash
    npm install
    ```

### Configuration

1.  **Set your Gemini API Key (server-only):**
    Create a `.env` file in the root directory of the project if it doesn't exist, and add your Gemini API key:
    ```
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```
    Replace `YOUR_GEMINI_API_KEY_HERE` with your actual Gemini API key.

2.  **Set Upstash Redis credentials for rate limiting:**
    ```
    UPSTASH_REDIS_REST_URL=YOUR_UPSTASH_REDIS_REST_URL
    UPSTASH_REDIS_REST_TOKEN=YOUR_UPSTASH_REDIS_REST_TOKEN
    ```
    These are required in production so rate limiting works across regions.

### Running the Application

Run the app through Vercel's local runtime so the frontend and `/api/*` serverless functions use the same origin:

```bash
vercel dev
```

`npm run dev` also starts `vercel dev`. Use `npm run dev:vite` only when you intentionally want the raw Vite server with mocked API calls.

Open the local URL printed by the command, usually `http://localhost:3000`. If that port is busy, Vercel will choose another port.

You should now be able to use the WeaveCV application, including the "Export" functionality for PDF and HTML/CSS.

### Mocking API Calls (MSW)

For local development with raw Vite, the app can mock `/api/*` calls with MSW. This is enabled by default via `.env.development`.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Generate the service worker file:
   ```bash
   npx msw init public/
   ```

When running `vercel dev`, MSW is disabled and real serverless endpoints are used.
