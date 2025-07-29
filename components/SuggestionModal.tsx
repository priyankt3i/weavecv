import React, { useState, useEffect } from 'react';
import type { Suggestion } from '../types';

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (userInput: string) => void;
  suggestion: Suggestion | null;
  isLoading: boolean;
}

export const SuggestionModal: React.FC<SuggestionModalProps> = ({ isOpen, onClose, onApply, suggestion, isLoading }) => {
  const [userInput, setUserInput] = useState('');

  useEffect(() => {
    if (isOpen && suggestion) {
      // Pre-fill the input with the placeholder to reduce user typing.
      setUserInput(suggestion.placeholder || ''); 
    }
  }, [isOpen, suggestion]);

  if (!isOpen || !suggestion) {
    return null;
  }

  const handleApplyClick = () => {
    // For simple corrections, user input is not required.
    if (!suggestion.isCorrection && !userInput.trim()) {
        alert("Please provide some information to apply the suggestion.");
        return;
    }
    onApply(userInput);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-300" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">{suggestion.title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-3xl leading-none">&times;</button>
        </header>
        
        <main className="p-6 overflow-y-auto">
          <div className="space-y-4">
            <div>
                <h3 className="font-semibold text-slate-700 mb-1">AI Suggestion:</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{suggestion.description}</p>
            </div>

            {suggestion.originalText && (
                <div>
                    <h3 className="font-semibold text-slate-700 mb-1">Original Text:</h3>
                    <blockquote className="text-sm text-slate-500 border-l-4 border-slate-200 pl-4 py-2 bg-slate-50 rounded-r-md">
                        {suggestion.originalText}
                    </blockquote>
                </div>
            )}
            
            {!suggestion.isCorrection && (
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">Your Input:</h3>
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    rows={5}
                    className="w-full p-3 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                    placeholder="Provide the details requested by the AI here..."
                  />
                </div>
            )}
          </div>
        </main>
        
        <footer className="flex justify-end items-center gap-3 p-4 bg-slate-50 border-t border-slate-200 rounded-b-lg">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            onClick={handleApplyClick}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-sky-500 rounded-md hover:bg-sky-600 disabled:bg-sky-300 disabled:cursor-not-allowed transition"
            disabled={isLoading}
          >
            {isLoading ? (
                <>
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                    <span>Applying...</span>
                </>
            ) : (
                'Apply Changes'
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};