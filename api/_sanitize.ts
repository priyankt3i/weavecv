export const sanitizeHtml = (html: string): string => {
  let sanitized = html;

  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  sanitized = sanitized.replace(/\son\w+="[^"]*"/gi, "");
  sanitized = sanitized.replace(/\son\w+='[^']*'/gi, "");
  sanitized = sanitized.replace(/\son\w+=\{[^}]*\}/gi, "");
  sanitized = sanitized.replace(
    /(href|src)\s*=\s*["']\s*javascript:[^"']*["']/gi,
    '$1="#"'
  );

  return sanitized;
};
