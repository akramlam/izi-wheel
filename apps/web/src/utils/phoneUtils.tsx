import React from 'react';

/**
 * Simple phone number detection and linking for French numbers
 */
export const detectAndLinkPhoneNumbers = (text: string): React.ReactNode => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Simple regex for French phone numbers
  const phoneRegex = /(\b(?:0[1-9]|[+]33[\s.-]?[1-9])[\s.-]?[0-9]{1,2}[\s.-]?[0-9]{2}[\s.-]?[0-9]{2}[\s.-]?[0-9]{2}[\s.-]?[0-9]{2}\b)/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  // Find all phone numbers
  while ((match = phoneRegex.exec(text)) !== null) {
    const phoneNumber = match[0];
    const matchStart = match.index;
    
    // Add text before phone number
    if (matchStart > lastIndex) {
      parts.push(text.slice(lastIndex, matchStart));
    }

    // Clean phone number for tel: link
    const cleanPhone = phoneNumber.replace(/[\s.-]/g, '');
    
    // Add clickable phone link
    parts.push(
      <a
        key={`phone-${keyIndex++}`}
        href={`tel:${cleanPhone}`}
        className="text-indigo-600 hover:text-pink-500 underline transition-colors"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {phoneNumber}
      </a>
    );

    lastIndex = matchStart + phoneNumber.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
};

/**
 * Check if text contains phone numbers
 */
export const containsPhoneNumber = (text: string): boolean => {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const phoneRegex = /(\b(?:0[1-9]|[+]33[\s.-]?[1-9])[\s.-]?[0-9]{1,2}[\s.-]?[0-9]{2}[\s.-]?[0-9]{2}[\s.-]?[0-9]{2}[\s.-]?[0-9]{2}\b)/g;
  return phoneRegex.test(text);
};