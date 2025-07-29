import React from 'react';
import { Icon } from './Icon';

interface EditorPaneProps {
  rawText: string;
  setRawText: (text: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export const EditorPane: React.FC<EditorPaneProps> = ({ rawText, setRawText, onGenerate, isLoading }) => {
  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-700">1. Paste Your Resume Text</h2>
        <p className="text-sm text-slate-500">Enter your existing resume content below.</p>
      </div>
      <div className="flex-grow p-1 min-h-0">
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste your resume details here..."
          className="w-full h-full p-3 resize-none border-0 focus:ring-0 text-sm text-slate-600 bg-slate-50 rounded-md"
        />
      </div>
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 text-white font-semibold rounded-lg shadow-md hover:bg-sky-600 disabled:bg-sky-300 disabled:cursor-not-allowed transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Icon name="generate" className="w-5 h-5" />
              <span>Generate Formatted Resume</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};