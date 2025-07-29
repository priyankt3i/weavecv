
import { useState, useCallback } from 'react';
import type { ResumeReview, ResumeTemplate, Suggestion } from '../types';
import { generateResume, reviewResume, applySuggestion } from '../services/geminiService';
import { templates } from '../components/templates/templates';

const initialRawText = `John Doe
Senior Software Engineer
john.doe@email.com | (123) 456-7890 | linkedin.com/in/johndoe | San Francisco, CA

Summary:
Highly skilled Senior Software Engineer with over 10 years of experience in designing, developing, and deploying scalable web applications. Proficient in JavaScript, React, nodejs, and cloud technologies. Proven ability to lead projects and mentor junior developers.

Work Experience:
Tech Solutions Inc. - Senior Software Engineer (Jan 2018 - Present)
- Led the development of a new customer-facing analytics dashboard using React and D3.js, resulting in a 20% increase in user engagement.
- Architected and implemented a microservices-based backend with node.js and Docker, improving system scalability and reducing server costs by 30%.
- Mentored a team of 4 junior engineers, fostering a culture of collaboration and code quality.

Innovate Corp. - Software Engineer (Jun 2014 - Dec 2017)
- Developed and maintained features for a large-scale e-commerce platform using Angular and Java.
- Optimized database queries, reducing page load times by 40%.
- Collaborated with product managers to define project requirements and timelines.

Education:
University of California, Berkeley - M.S. in Computer Science (2012 - 2014)
University of California, Los Angeles - B.S. in Computer Science (2008 - 2012)

Skills:
Languages: JavaScript, TypeScript, Python, Java
Frameworks: React, Node.js, Express, Angular
Databases: Postgresql, MongoDB, Redis
Cloud/DevOps: AWS, Docker, Kubernetes, CI/CD
`;


export const useResume = () => {
  const [rawText, setRawText] = useState<string>(initialRawText);
  const [resumeHtml, setResumeHtml] = useState<string>('');
  const [review, setReview] = useState<ResumeReview | null>(null);
  const [isLoadingGeneration, setIsLoadingGeneration] = useState<boolean>(false);
  const [isLoadingReview, setIsLoadingReview] = useState<boolean>(false);
  const [isLoadingApply, setIsLoadingApply] = useState<boolean>(false);
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<ResumeTemplate>(templates[0]);

  const handleGenerateResume = useCallback(async () => {
    if (!rawText.trim()) {
      alert('Please paste your resume text first.');
      return;
    }
    setIsLoadingGeneration(true);
    setResumeHtml('');
    setReview(null);
    try {
      const generatedHtmlWithPlaceholders = await generateResume(rawText, activeTemplate.layout);
      
      const finalHtml = generatedHtmlWithPlaceholders.replace(
        '/* TEMPLATE_STYLES_HERE */',
        activeTemplate.css
      );

      setResumeHtml(finalHtml);
    } catch (error) {
      console.error('Error generating resume:', error);
      alert('Failed to generate resume. Please check the console for details.');
    } finally {
      setIsLoadingGeneration(false);
    }
  }, [rawText, activeTemplate]);

  const handleReviewResume = useCallback(async () => {
    if (!resumeHtml.trim()) {
      alert('Please generate a resume before requesting a review.');
      return;
    }
    setIsLoadingReview(true);
    setReview(null);
    try {
      const reviewResult = await reviewResume(resumeHtml);
      // Initialize suggestions with a 'pending' status
      const suggestionsWithStatus = reviewResult.suggestions.map(s => ({ ...s, status: 'pending' as const }));
      setReview({ ...reviewResult, suggestions: suggestionsWithStatus });
    } catch (error)
    {
      console.error('Error reviewing resume:', error);
      alert('Failed to review resume. The AI might have returned an unexpected format. Please check the console for details.');
    } finally {
      setIsLoadingReview(false);
    }
  }, [resumeHtml]);

  const handleSelectTemplate = useCallback(async (template: ResumeTemplate) => {
    setActiveTemplate(template);

    // If there's no text to generate from, just set the template for the next generation.
    if (!rawText.trim()) {
        return;
    }

    // To ensure layout and styles are both updated, we always regenerate.
    setIsLoadingGeneration(true);
    setResumeHtml('');
    setReview(null);
    try {
      // Step 1: Generate the HTML with the correct layout from the new template.
      const generatedHtmlWithPlaceholders = await generateResume(rawText, template.layout);
      
      // Step 2: Replace the CSS placeholder in the newly generated HTML with the selected template's CSS.
      const finalHtml = generatedHtmlWithPlaceholders.replace(
        '/* TEMPLATE_STYLES_HERE */',
        template.css
      );

      setResumeHtml(finalHtml);
    } catch (error) {
      console.error('Error applying new template:', error);
      alert('Failed to apply new template. Please try generating the resume again.');
    } finally {
      setIsLoadingGeneration(false);
    }
  }, [rawText]);
  
  const handleSelectFont = useCallback((fontFamily: string) => {
    if (!resumeHtml) {
        alert("Please generate a resume first before selecting a font.");
        return;
    }

    const styleRegex = /(<style id="resume-style">)([\s\S]*?)(<\/style>)/;
    const match = resumeHtml.match(styleRegex);

    if (match && match[2]) {
        let cssContent = match[2];
        const fontFallbacks: { [key: string]: string } = {
            "Times New Roman": "serif",
            "Arial": "sans-serif",
            "Calibri": "sans-serif",
            "Cambria": "serif",
            "Georgia": "serif",
        };
        const fallback = fontFallbacks[fontFamily] || 'sans-serif';
        const newFontFamily = `'${fontFamily}', ${fallback}`;

        const fontRegex = /(body\s*\{[\s\S]*?font-family:\s*)[^;]+(;[\s\S]*?\})/;
        
        let newCssContent;
        if (fontRegex.test(cssContent)) {
            // Font-family exists, so replace it
            newCssContent = cssContent.replace(fontRegex, `$1${newFontFamily}$2`);
        } else {
            // Font-family doesn't exist in body rule, so add it
            newCssContent = cssContent.replace(/(body\s*\{)/, `$1\n    font-family: ${newFontFamily};`);
        }
        
        const newHtml = resumeHtml.replace(styleRegex, `$1${newCssContent}$3`);
        setResumeHtml(newHtml);
    } else {
        alert("Could not find the style block in the resume to apply the font change.");
    }
  }, [resumeHtml]);

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    if (suggestion.status === 'pending') {
      setActiveSuggestion(suggestion);
    }
  };

  const handleCloseSuggestionModal = () => {
    setActiveSuggestion(null);
  };

  const handleApplySuggestion = useCallback(async (userInput: string) => {
    if (!activeSuggestion || !resumeHtml) return;

    setIsLoadingApply(true);
    try {
      const updatedHtml = await applySuggestion(resumeHtml, activeSuggestion, userInput);
      setResumeHtml(updatedHtml);
      
      // Mark the suggestion as 'applied'
      setReview(prev => {
        if (!prev) return null;
        const newSuggestions = prev.suggestions.map(s =>
            s.id === activeSuggestion.id ? { ...s, status: 'applied' as const } : s
        );
        return { ...prev, suggestions: newSuggestions };
      });

      setActiveSuggestion(null);
    } catch (error) {
      console.error("Failed to apply suggestion:", error);
      alert("An error occurred while applying the change. Please check the console.");
    } finally {
      setIsLoadingApply(false);
    }
  }, [activeSuggestion, resumeHtml]);

  const handleDiscardSuggestion = useCallback((suggestionId: string) => {
    setReview(prev => {
        if (!prev) return null;
        const newSuggestions = prev.suggestions.map(s => 
            s.id === suggestionId ? { ...s, status: 'discarded' as const } : s
        );
        return { ...prev, suggestions: newSuggestions };
    });
  }, []);


  return {
    rawText,
    setRawText,
    resumeHtml,
    setResumeHtml,
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
  };
};