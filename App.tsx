
import React from 'react';
import { useResume } from './hooks/useResume';
import { EditorPane } from './components/EditorPane';
import { PreviewPane } from './components/PreviewPane';
import { ReviewPane } from './components/ReviewPane';
import { templates } from './components/templates/templates';
import { SuggestionModal } from './components/SuggestionModal';

export default function App() {
  const {
    rawText,
    setRawText,
    resumeHtml,
    review,
    isLoadingGeneration,
    isLoadingReview,
    handleGenerateResume,
    handleReviewResume,
    activeTemplate,
    handleSelectTemplate,
    activeSuggestion,
    isLoadingApply,
    handleSelectSuggestion,
    handleCloseSuggestionModal,
    handleApplySuggestion,
    handleDiscardSuggestion,
    handleSelectFont,
  } = useResume();

  return (
    <div className="flex flex-col h-screen font-sans bg-slate-50 text-slate-800">
      <header className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/weave.png" alt="WeaveCV Logo" className="w-8 h-8" />
          <h1 className="text-2xl font-bold text-slate-700">WeaveCV</h1>
        </div>
        <button
          onClick={() => {
            sessionStorage.clear();
            window.location.reload();
          }}
          className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Start Over
        </button>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
        <div className="lg:col-span-3 flex flex-col h-full">
          <EditorPane
            rawText={rawText}
            setRawText={setRawText}
            onGenerate={handleGenerateResume}
            isLoading={isLoadingGeneration}
          />
        </div>

        <div className="lg:col-span-6 flex flex-col h-full">
          <PreviewPane
            html={resumeHtml}
            onReview={handleReviewResume}
            isLoadingReview={isLoadingReview}
            isLoadingGeneration={isLoadingGeneration}
            templates={templates}
            activeTemplate={activeTemplate}
            onSelectTemplate={handleSelectTemplate}
            onSelectFont={handleSelectFont}
          />
        </div>

        <div className="lg:col-span-3 flex flex-col h-full">
          <ReviewPane
            review={review}
            isLoading={isLoadingReview}
            onSelectSuggestion={handleSelectSuggestion}
            onDiscardSuggestion={handleDiscardSuggestion}
          />
        </div>
      </main>
      
      {activeSuggestion && (
        <SuggestionModal 
            suggestion={activeSuggestion}
            isOpen={!!activeSuggestion}
            onClose={handleCloseSuggestionModal}
            onApply={handleApplySuggestion}
            isLoading={isLoadingApply}
        />
      )}
    </div>
  );
}
