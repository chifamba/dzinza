import DOMPurify from "dompurify";

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for use with dangerouslySetInnerHTML
 */
export const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    // Allow common formatting tags but remove scripts and dangerous attributes
    ALLOWED_TAGS: [
      "span",
      "em",
      "strong",
      "b",
      "i",
      "u",
      "mark",
      "small",
      "del",
      "ins",
      "sub",
      "sup",
    ],
    ALLOWED_ATTR: ["class"],
    FORBID_TAGS: ["script", "object", "embed", "link", "style"],
    FORBID_ATTR: [
      "onerror",
      "onclick",
      "onload",
      "onmouseover",
      "onfocus",
      "onblur",
      "href",
      "src",
    ],
  });
};

/**
 * Creates a sanitized HTML object for use with dangerouslySetInnerHTML
 * @param html - The HTML string to sanitize
 * @returns Object with __html property containing sanitized HTML
 */
export const createSanitizedHTML = (html: string) => ({
  __html: sanitizeHTML(html),
});
