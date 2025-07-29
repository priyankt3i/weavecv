
import type { ResumeTemplate } from '../../types';

export const templates: ResumeTemplate[] = [
  {
    id: 'elegant-coral',
    name: 'Elegant Coral',
    thumbnailColor: '#EAA290',
    layout: {
      type: 'two-column',
      primary: ['Header', 'Professional Summary', 'Work Experience', 'Certifications'],
      secondary: ['Contact Information', 'Education', 'Skills', 'Languages'],
    },
    css: `
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&family=Prata&display=swap');
      /* Reset & Base */
      body { font-family: 'Montserrat', sans-serif; line-height: 1.6; color: #5D5D5D; background-color: #fff; margin: 0; padding: 0; }
      h1, h2, h3, p, ul, li { margin: 0; padding: 0; }
      ul { list-style: none; }
      li { padding-left: 1.5em; position: relative; margin-bottom: 0.5em; }
      li::before { content: '•'; color: #8B4513; font-weight: bold; display: inline-block; width: 1em; margin-left: -1em; position: absolute; left: 0; top: 0.1em; }
      section { margin-bottom: 30px; }
      /* Layout */
      .resume-container { display: flex; max-width: 1024px; min-height: 100vh; margin: 0 auto; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
      .left-column { width: 38%; background-color: #FDF4F0; padding: 40px; color: #5D5D5D; }
      .right-column { width: 62%; background-color: #FFFFFF; padding: 40px; }
      /* Left Column Styling */
      .profile-pic { width: 130px; height: 130px; border-radius: 50%; object-fit: cover; margin: 0 auto 30px; display: block; border: 5px solid #fff; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
      .left-column h2 { font-family: 'Montserrat', sans-serif; font-size: 1.1em; color: #8B4513; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #EAD4C7; padding-bottom: 8px; margin-bottom: 20px; font-weight: 700; }
      .contact-info p { margin-bottom: 10px; display: flex; align-items: center; word-break: break-word; }
      .education-item { margin-bottom: 15px; }
      .education-item h3 { font-weight: 700; color: #4a4a4a; }
      .education-item p { margin: 2px 0; font-size: 0.9em; }
      .skills ul li { margin-bottom: 8px; }
      /* Right Column Styling */
      .right-column .main-header { margin-bottom: 30px; }
      .right-column h1 { font-family: 'Prata', serif; font-size: 3.5em; color: #8B4513; font-weight: 400; line-height: 1.1; margin-bottom: 10px; }
      .right-column .main-header h3 { font-family: 'Montserrat', sans-serif; font-size: 1em; color: #333; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; }
      .right-column .summary { font-size: 0.95em; margin-bottom: 35px; }
      .right-column h2 { font-family: 'Montserrat', sans-serif; font-size: 1.1em; color: #8B4513; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #EAD4C7; padding-bottom: 8px; margin-bottom: 20px; font-weight: 700; }
      .job { margin-bottom: 25px; }
      .job .job-header { margin-bottom: 8px; }
      .job .job-header h3 { font-size: 1.1em; font-weight: 700; color: #333; }
      .job .job-header p { font-size: 0.9em; color: #5D5D5D; margin: 0; }
      .certifications-item h3 { font-weight: 700; color: #333; }
      .certifications-item p { margin: 2px 0; font-size: 0.9em; }
    `,
  },
  {
    id: 'classic-onyx',
    name: 'Classic Onyx',
    thumbnailColor: '#343a40',
    layout: {
        type: 'single-column',
        order: ['Header', 'Contact Information', 'Professional Summary', 'Work Experience', 'Education', 'Skills', 'Languages']
    },
    css: `
      body { font-family: 'Georgia', serif; line-height: 1.6; color: #343a40; background-color: #fff; margin: 0; padding: 0; }
      .resume-container { max-width: 800px; margin: auto; padding: 40px; display: block; }
      h1 { font-size: 2.4em; margin-bottom: 0; color: #212529; text-transform: uppercase; letter-spacing: 2px; }
      .main-header p { font-size: 1em; margin-top: 5px; color: #6c757d; }
      h2 { font-size: 1.3em; color: #343a40; border-bottom: 2px solid #343a40; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
      .job { margin-bottom: 20px; }
      .job-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; color: #495057; }
      .job-header h3 { font-size: 1em; }
      .job-header p { font-style: italic; color: #495057; }
      .job ul { list-style-type: none; padding-left: 0; margin-top: 5px; }
      .job ul li { position: relative; padding-left: 20px; margin-bottom: 5px; }
      .job ul li::before { content: '▪'; position: absolute; left: 0; top: 0px; color: #343a40; }
    `,
  },
  {
    id: 'modern-cobalt',
    name: 'Modern Cobalt',
    thumbnailColor: '#0047AB',
    layout: {
        type: 'single-column',
        order: ['Header', 'Contact Information', 'Professional Summary', 'Work Experience', 'Education', 'Skills']
    },
    css: `
      body { font-family: 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; margin: 0; padding: 0; }
      .resume-container { max-width: 800px; margin: auto; padding: 40px; background-color: #fff; box-shadow: 0 0 15px rgba(0,0,0,0.05); display: block; }
      h1 { font-size: 2.8em; margin-bottom: 5px; color: #0047AB; font-weight: 300; }
      .main-header p { font-size: 1em; margin-top: 5px; color: #555; }
      h2 { font-size: 1.5em; color: #0047AB; border-bottom: 2px solid #0047AB; padding-bottom: 8px; margin-top: 30px; margin-bottom: 20px; font-weight: 500; }
      .job { margin-bottom: 25px; }
      .job-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; color: #333; }
      .job-header h3 { font-size: 1em; font-style: normal; font-weight: 500; color: #111; }
      .job ul { list-style-type: '›'; padding-left: 20px; margin-top: 8px; }
      .job ul li { padding-left: 10px; margin-bottom: 5px; }
    `,
  },
  {
    id: 'techy-teal',
    name: 'Techy Teal',
    thumbnailColor: '#008080',
    layout: {
        type: 'single-column',
        order: ['Header', 'Contact Information', 'Professional Summary', 'Skills', 'Work Experience', 'Education']
    },
    css: `
      body { font-family: 'Menlo', 'Courier New', monospace; line-height: 1.5; color: #e0e0e0; background-color: #2d2d2d; margin: 0; padding: 0; }
      .resume-container { max-width: 800px; margin: auto; padding: 40px; display: block; }
      h1 { font-size: 2.2em; margin-bottom: 0; color: #61dafb; }
      .main-header p { font-size: 1em; margin-top: 5px; color: #9a9a9a; }
      h2 { font-size: 1.2em; color: #00c2c7; border-bottom: 1px solid #00c2c7; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; letter-spacing: 1px; }
      .job { margin-bottom: 20px; }
      .job-header { display: flex; justify-content: space-between; font-weight: normal; margin-bottom: 5px; color: #ccc; }
      .job-header h3 { font-size: 1em; font-style: normal; color: #bbb; }
      .job ul { list-style-type: '»'; padding-left: 20px; margin-top: 5px; }
      .job ul li { padding-left: 10px; margin-bottom: 5px; }
    `,
  },
  {
    id: 'elegant-wine',
    name: 'Elegant Wine',
    thumbnailColor: '#800020',
    layout: {
        type: 'single-column',
        order: ['Header', 'Contact Information', 'Professional Summary', 'Work Experience', 'Education', 'Skills']
    },
    css: `
      body { font-family: 'Garamond', serif; line-height: 1.7; color: #404040; background-color: #fff; margin: 0; padding: 0; }
      .resume-container { max-width: 800px; margin: auto; padding: 40px; display: block; }
      h1 { font-size: 2.6em; margin-bottom: 0; color: #800020; font-weight: normal; text-align: center; }
      .main-header p { font-size: 1.1em; margin-top: 5px; color: #555; text-align: center; border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 10px 0; }
      h2 { font-size: 1.4em; color: #800020; border: none; text-align: center; font-variant: small-caps; letter-spacing: 1px; margin-top: 30px; margin-bottom: 20px; }
      .job { margin-bottom: 20px; }
      .job-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; color: #333; }
      .job-header h3 { font-size: 1em; font-style: italic; color: #444; }
      .job ul { list-style-type: '–'; padding-left: 20px; margin-top: 5px; }
      .job ul li { padding-left: 10px; margin-bottom: 5px; }
    `,
  },
    {
    id: 'minimalist-gray',
    name: 'Minimalist Gray',
    thumbnailColor: '#6c757d',
    layout: {
        type: 'single-column',
        order: ['Header', 'Contact Information', 'Professional Summary', 'Work Experience', 'Education', 'Skills']
    },
    css: `
      body { font-family: 'Inter', sans-serif; line-height: 1.5; color: #495057; background-color: #fff; margin: 0; padding: 0; font-weight: 300; }
      .resume-container { max-width: 800px; margin: auto; padding: 40px; display: block; }
      h1 { font-size: 2em; margin-bottom: 0; color: #212529; font-weight: 500; }
      .main-header p { font-size: 0.9em; margin-top: 5px; color: #6c757d; }
      h2 { font-size: 1.1em; color: #6c757d; border-bottom: 1px solid #dee2e6; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 500; }
      .job { margin-bottom: 15px; }
      .job-header { display: flex; justify-content: space-between; font-weight: 500; margin-bottom: 2px; color: #343a40; }
      .job-header h3 { font-size: 1em; font-style: normal; color: #495057; }
      .job ul { list-style-type: none; padding-left: 15px; margin-top: 5px; border-left: 2px solid #e9ecef; }
      .job ul li { padding-left: 10px; margin-bottom: 5px; }
    `,
  },
  {
    id: 'subtle-sage',
    name: 'Subtle Sage',
    thumbnailColor: '#556B2F',
    layout: {
        type: 'single-column',
        order: ['Header', 'Contact Information', 'Professional Summary', 'Work Experience', 'Education', 'Skills']
    },
    css: `
      body { font-family: 'Lora', serif; line-height: 1.6; color: #3d403a; background-color: #fdfdfa; margin: 0; padding: 0; }
      .resume-container { max-width: 800px; margin: auto; padding: 40px; display: block; }
      h1 { font-size: 2.5em; margin-bottom: 0; color: #556B2F; }
      .main-header p { font-size: 1em; margin-top: 5px; color: #5a5e56; }
      h2 { font-size: 1.3em; color: #556B2F; border-bottom: 1px solid #a3b899; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; }
      .job { margin-bottom: 20px; }
      .job-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; color: #4b5320; }
      .job-header h3 { font-size: 1em; font-style: italic; color: #4b5320; }
      .job ul { list-style-type: circle; padding-left: 20px; margin-top: 5px; }
    `,
  },
  {
    id: 'academic-blue',
    name: 'Academic Blue',
    thumbnailColor: '#0d47a1',
    layout: {
        type: 'single-column',
        order: ['Header', 'Contact Information', 'Professional Summary', 'Work Experience', 'Education', 'Skills']
    },
    css: `
      body { font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #212121; background-color: #fff; margin: 0; padding: 0; }
      .resume-container { max-width: 800px; margin: auto; padding: 40px; display: block; }
      h1 { font-size: 2.2em; margin-bottom: 0; color: #0d47a1; }
      .main-header p { font-size: 1em; margin-top: 5px; color: #424242; }
      h2 { font-size: 1.2em; color: #1565c0; border-bottom: 2px solid #1565c0; padding-bottom: 3px; margin-top: 25px; margin-bottom: 15px; font-variant: all-small-caps; }
      .job { margin-bottom: 20px; }
      .job-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; }
      .job-header h3 { font-size: 1em; font-style: italic; }
      .job ul { list-style-type: square; padding-left: 20px; margin-top: 5px; }
    `,
  },
  {
    id: 'warm-sandstone',
    name: 'Warm Sandstone',
    thumbnailColor: '#b8860b',
    layout: {
        type: 'single-column',
        order: ['Header', 'Contact Information', 'Professional Summary', 'Work Experience', 'Education', 'Skills']
    },
    css: `
      body { font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif; line-height: 1.6; color: #5d4037; background-color: #fff; margin: 0; padding: 0; }
      .resume-container { max-width: 800px; margin: auto; padding: 40px; display: block; }
      h1 { font-size: 2.6em; margin-bottom: 0; color: #8d6e63; font-weight: 300; }
      .main-header p { font-size: 1em; margin-top: 5px; color: #795548; }
      h2 { font-size: 1.4em; color: #b8860b; border-bottom: 1px dashed #b8860b; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; }
      .job { margin-bottom: 20px; }
      .job-header { display: flex; justify-content: space-between; font-weight: normal; margin-bottom: 5px; color: #5d4037; }
      .job-header h3 { font-size: 1em; font-style: normal; font-weight: bold; color: #5d4037; }
      .job ul { list-style-type: '•'; padding-left: 20px; margin-top: 5px; }
      .job ul li { padding-left: 10px; margin-bottom: 5px; }
    `,
  },
  {
    id: 'professional-navy',
    name: 'Professional Navy',
    thumbnailColor: '#000080',
    layout: {
        type: 'single-column',
        order: ['Header', 'Contact Information', 'Professional Summary', 'Work Experience', 'Education', 'Skills']
    },
    css: `
      body { font-family: 'Arial', sans-serif; line-height: 1.5; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
      .resume-container { max-width: 800px; margin: auto; padding: 40px; background-color: #fff; border-left: 5px solid #000080; display: block; }
      h1 { font-size: 2.5em; margin-bottom: 0; color: #000080; }
      .main-header p { font-size: 1em; margin-top: 5px; color: #555; }
      h2 { font-size: 1.3em; color: #000080; border: none; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; }
      .job { margin-bottom: 20px; }
      .job-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; }
      .job-header h3 { font-size: 1em; font-style: italic; }
      .job ul { list-style-type: disc; padding-left: 20px; margin-top: 5px; }
    `,
  },
  {
    id: 'creative-coral',
    name: 'Creative Coral',
    thumbnailColor: '#ff7f50',
    layout: {
        type: 'single-column',
        order: ['Header', 'Contact Information', 'Professional Summary', 'Work Experience', 'Education', 'Skills']
    },
    css: `
      body { font-family: 'Verdana', sans-serif; line-height: 1.6; color: #444; background-color: #fff; margin: 0; padding: 0; }
      .resume-container { max-width: 800px; margin: auto; padding: 40px; border-top: 8px solid #ff7f50; display: block; }
      h1 { font-size: 2.8em; margin-bottom: 0; color: #333; }
      .main-header p { font-size: 1.1em; margin-top: 5px; color: #666; }
      h2 { font-size: 1.5em; color: #ff7f50; border: none; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; }
      .job { margin-bottom: 20px; }
      .job-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; }
      .job-header h3 { font-size: 1em; font-style: normal; color: #555; }
      .job ul { list-style-type: '✓'; padding-left: 20px; margin-top: 5px; }
      .job ul li { padding-left: 10px; margin-bottom: 5px; }
    `,
  },
];