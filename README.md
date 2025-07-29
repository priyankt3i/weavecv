# WeaveCV: AI-Powered Resume Builder

WeaveCV is an AI Studio application designed to help users generate, preview, review, and export professional resumes. It leverages AI for content generation and provides various export options, including high-fidelity PDF generation via a dedicated backend service.

## Features

*   **AI-Powered Resume Generation**: Generate resume content using AI.
*   **Interactive Preview**: See a live preview of your resume with different templates and fonts.
*   **Review & Score**: Get feedback and a score on your resume.
*   **Flexible Export Options**:
    *   **As Document (PDF)**: Generate high-quality PDFs using a server-side Puppeteer service, ensuring accurate rendering, proper margins, and correct pagination.
    *   **As Image (JPEG)**: Export your resume as a JPEG image.
    *   **As Code (HTML, CSS)**: Download the raw HTML and CSS of your resume.

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

1.  **Set your Gemini API Key:**
    Create a `.env` file in the root directory of the project if it doesn't exist, and add your Gemini API key:
    ```
    VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```
    Replace `YOUR_GEMINI_API_KEY_HERE` with your actual Gemini API key.

### Running the Application

WeaveCV consists of two main parts: the frontend (React app) and a backend server for PDF generation. Both need to be running for full functionality.

1.  **Start the Backend PDF Generation Server:**
    Open a new terminal in the project root (`weavecv/`) and run:
    ```bash
    npm run start:server
    ```
    This will compile and start the server, which listens on `http://localhost:3001`. Keep this terminal open.

2.  **Start the Frontend Application:**
    Open another terminal in the project root (`weavecv/`) and run:
    ```bash
    npm run dev
    ```
    This will start the Vite development server, usually on `http://localhost:5173`.

3.  **Access the Application:**
    Open your web browser and navigate to the address provided by the `npm run dev` command (e.g., `http://localhost:5173`).

You should now be able to use the WeaveCV application, including the "Export" functionality for PDF, JPEG, and HTML/CSS.
