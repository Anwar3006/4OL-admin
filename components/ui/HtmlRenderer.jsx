"use client";
import React from "react";

/**
 * HtmlRenderer - Safely renders HTML content from rich text editors
 * 
 * @param {string} htmlContent - The HTML content to render
 * @param {string} className - Additional CSS classes
 * @param {number} maxLength - Maximum character length (for truncation)
 * @param {boolean} showReadMore - Whether to show "Read More" for truncated content
 */
const HtmlRenderer = ({ 
  htmlContent, 
  className = "", 
  maxLength = null, 
  showReadMore = false 
}) => {
  if (!htmlContent) {
    return null;
  }

  // Clean and prepare HTML content
  let content = htmlContent;

  // If maxLength is specified, truncate the text content (not HTML)
  if (maxLength && typeof maxLength === 'number') {
    // Extract text content for length calculation
    const textContent = content.replace(/<[^>]*>/g, '');
    
    if (textContent.length > maxLength) {
      // Find a good place to truncate while preserving HTML structure
      const truncatedText = textContent.substring(0, maxLength);
      const lastSpaceIndex = truncatedText.lastIndexOf(' ');
      const cutPoint = lastSpaceIndex > 0 ? lastSpaceIndex : maxLength;
      
      // Simple truncation - you might want to use a more sophisticated HTML truncation library
      const truncatedContent = textContent.substring(0, cutPoint) + '...';
      content = `<p>${truncatedContent}</p>`;
      
      if (showReadMore) {
        content += ' <span class="text-blue-600 cursor-pointer hover:underline">Read More</span>';
      }
    }
  }

  return (
    <>
      <div 
        className={`html-content ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
        style={{
          // Basic styling for rendered HTML content
          lineHeight: '1.6',
        }}
      />
      <style jsx global>{`
        .html-content {
          line-height: 1.6;
        }
        .html-content p {
          margin: 0;
          padding: 0;
        }
        .html-content strong {
          font-weight: 600;
        }
        .html-content em {
          font-style: italic;
        }
        .html-content u {
          text-decoration: underline;
        }
        .html-content ul {
          margin: 0.5em 0;
          padding-left: 1.5em;
          list-style-type: disc;
          list-style-position: outside;
        }
        .html-content ol {
          margin: 0.5em 0;
          padding-left: 1.5em;
          list-style-type: decimal;
          list-style-position: outside;
        }
        .html-content li {
          margin: 0.25em 0;
          display: list-item;
        }
        .html-content a {
          color: #3b82f6;
          text-decoration: underline;
        }
        .html-content a:hover {
          color: #1d4ed8;
        }
        .html-content.inline {
          display: inline;
        }
        .html-content.inline p {
          display: inline;
        }
        .safe-html-content {
          line-height: 1.6;
        }
        .safe-html-content.inline {
          display: inline;
        }
        .safe-html-content.inline p {
          display: inline;
        }
        .safe-html-content p {
          margin: 0;
          padding: 0;
        }
        .safe-html-content strong {
          font-weight: 600;
        }
        .safe-html-content em {
          font-style: italic;
        }
        .safe-html-content u {
          text-decoration: underline;
        }
        .safe-html-content ul {
          margin: 0.5em 0;
          padding-left: 1.5em;
          list-style-type: disc;
          list-style-position: outside;
        }
        .safe-html-content ol {
          margin: 0.5em 0;
          padding-left: 1.5em;
          list-style-type: decimal;
          list-style-position: outside;
        }
        .safe-html-content li {
          margin: 0.25em 0;
          display: list-item;
        }
        .safe-html-content a {
          color: #3b82f6;
          text-decoration: underline;
        }
        .safe-html-content a:hover {
          color: #1d4ed8;
        }
        
        /* Force list styling - Override Tailwind CSS resets */
        .html-content ul, .safe-html-content ul {
          list-style: disc !important;
          list-style-type: disc !important;
          list-style-position: outside !important;
          padding-left: 1.5em !important;
          margin: 0.5em 0 !important;
        }
        .html-content ol, .safe-html-content ol {
          list-style: decimal !important;
          list-style-type: decimal !important;
          list-style-position: outside !important;
          padding-left: 1.5em !important;
          margin: 0.5em 0 !important;
        }
        .html-content li, .safe-html-content li {
          list-style: inherit !important;
          display: list-item !important;
          margin-left: 0 !important;
          text-indent: 0 !important;
        }
        
        /* Reset any conflicting styles */
        .html-content ul li::before, .safe-html-content ul li::before,
        .html-content ol li::before, .safe-html-content ol li::before {
          content: none !important;
        }
        
        /* Ensure proper spacing in constrained containers */
        td .html-content ul, td .safe-html-content ul,
        td .html-content ol, td .safe-html-content ol {
          margin: 0.5em 0 !important;
          padding-left: 1.5em !important;
        }
        
        /* Handle inline lists */
        .html-content.inline ul, .safe-html-content.inline ul {
          display: inline-block !important;
          margin: 0 0.5em !important;
          vertical-align: top !important;
        }
        .html-content.inline ol, .safe-html-content.inline ol {
          display: inline-block !important;
          margin: 0 0.5em !important;
          vertical-align: top !important;
        }
        
        /* Ensure list markers are visible even in truncated containers */
        .html-content, .safe-html-content {
          overflow: visible !important;
        }
        
        /* Additional specificity for stubborn cases */
        div .html-content ul, div .safe-html-content ul,
        span .html-content ul, span .safe-html-content ul {
          list-style: disc !important;
          padding-left: 1.5em !important;
        }
        div .html-content ol, div .safe-html-content ol,
        span .html-content ol, span .safe-html-content ol {
          list-style: decimal !important;
          padding-left: 1.5em !important;
        }
        div .html-content li, div .safe-html-content li,
        span .html-content li, span .safe-html-content li {
          display: list-item !important;
          list-style: inherit !important;
        }
      `}</style>
    </>
  );
};

// Alternative component for safe HTML rendering with more control
export const SafeHtmlRenderer = ({ 
  htmlContent, 
  className = "", 
  allowedTags = ['p', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'br', 'a'],
  maxLength = null 
}) => {
  if (!htmlContent) {
    return null;
  }

  // Basic HTML sanitization (you might want to use a library like DOMPurify for production)
  const sanitizeHtml = (html) => {
    // This is a basic implementation - consider using DOMPurify for better security
    const allowedTagsRegex = new RegExp(`<(?!\/?(?:${allowedTags.join('|')})\s*\/?>)[^>]+>`, 'gi');
    return html.replace(allowedTagsRegex, '');
  };

  let content = sanitizeHtml(htmlContent);

  // Truncate if needed
  if (maxLength) {
    const textContent = content.replace(/<[^>]*>/g, '');
    if (textContent.length > maxLength) {
      const truncated = textContent.substring(0, maxLength) + '...';
      content = `<p>${truncated}</p>`;
    }
  }

  return (
    <div 
      className={`safe-html-content ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default HtmlRenderer;
