
import React from 'react';
import type { ResumeReview, Suggestion } from '../types';
import { Icon } from './Icon';

interface ReviewPaneProps {
  review: ResumeReview | null;
  isLoading: boolean;
  onSelectSuggestion: (suggestion: Suggestion) => void;
  onDiscardSuggestion: (suggestionId: string) => void;
}

const ScoreCircle: React.FC<{ score: number }> = ({ score }) => {
    const circumference = 2 * Math.PI * 45; // 2 * pi * r
    const offset = circumference - (score / 100) * circumference;
    const colorClass = score >= 85 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500';

    return (
        <div className="relative w-32 h-32">
            <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                    className="text-slate-200"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                />
                <circle
                    className={`${colorClass} transition-all duration-1000 ease-out`}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                    transform="rotate(-90 50 50)"
                />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-3xl font-bold ${colorClass}`}>
                {score}
            </span>
        </div>
    );
};


export const ReviewPane: React.FC<ReviewPaneProps> = ({ review, isLoading, onSelectSuggestion, onDiscardSuggestion }) => {
  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-700">3. AI Review & Score</h2>
        <p className="text-sm text-slate-500">ATS compliance and improvement tips.</p>
      </div>
      <div className="flex-grow p-4 overflow-y-auto">
        {isLoading && (
           <div className="flex flex-col items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-t-transparent border-sky-500 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500">Analyzing your resume...</p>
           </div>
        )}
        {!isLoading && !review && (
            <div className="flex items-center justify-center h-full text-center text-slate-500">
                <p>Click "Review & Score" on the preview pane to get AI feedback.</p>
            </div>
        )}
        {review && (
            <div className="flex flex-col items-center gap-6">
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-slate-600">ATS Score</h3>
                    <ScoreCircle score={review.score} />
                </div>
                <div className="w-full">
                    <h3 className="text-lg font-semibold text-slate-600 mb-3">Suggestions for Improvement</h3>
                    <ul className="space-y-2">
                        {review.suggestions.map((suggestion) => {
                          const isPending = suggestion.status === 'pending';
                          const isApplied = suggestion.status === 'applied';
                          const isDiscarded = suggestion.status === 'discarded';
                          
                          const statusIcon = isApplied 
                            ? <Icon name="check" className="w-5 h-5 text-green-500" />
                            : isDiscarded
                            ? <Icon name="discard" className="w-5 h-5 text-red-500" />
                            : <Icon name="sparkle" className="w-5 h-5 text-sky-500" />;

                          return (
                            <li key={suggestion.id} className={`transition-all duration-300 ${isApplied || isDiscarded ? 'opacity-60' : ''}`}>
                                <div className="flex gap-2 items-center">
                                    <button
                                        onClick={() => onSelectSuggestion(suggestion)}
                                        disabled={!isPending}
                                        className="flex-grow flex gap-3 items-start text-left p-3 rounded-lg bg-slate-50 border border-slate-200 transition-all duration-200 disabled:cursor-not-allowed disabled:bg-slate-100 data-[status=pending]:hover:bg-sky-100 data-[status=pending]:hover:border-sky-300"
                                        data-status={suggestion.status}
                                    >
                                        <span className="flex-shrink-0 mt-1">{statusIcon}</span>
                                        <span className={`text-sm font-semibold text-slate-800 ${isDiscarded ? 'line-through' : ''}`}>{suggestion.title}</span>
                                    </button>
                                    {isPending && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDiscardSuggestion(suggestion.id); }}
                                            title="Discard suggestion"
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded-full transition-colors"
                                        >
                                            <Icon name="trash" className="w-5 h-5"/>
                                        </button>
                                    )}
                                </div>
                            </li>
                          )
                        })}
                    </ul>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
