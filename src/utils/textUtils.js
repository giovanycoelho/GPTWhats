export function extractLinksAndPhones(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  
  // More specific phone regex that looks for standalone phone numbers
  const phoneRegex = /(?:^|\s|:)\s*(\+?(?:55\s?)?[\(\s]*(?:\d{2})\s*[\)\s]*\s*\d{4,5}[\s\-]?\d{4})(?:\s|$)/gi;

  const links = [];
  const phones = [];
  
  let cleanText = text;

  // Extract URLs
  const urlMatches = text.match(urlRegex);
  if (urlMatches) {
    urlMatches.forEach(url => {
      links.push(url.trim());
      cleanText = cleanText.replace(url, '').trim();
    });
  }

  // Extract emails
  const emailMatches = text.match(emailRegex);
  if (emailMatches) {
    emailMatches.forEach(email => {
      links.push(email.trim());
      cleanText = cleanText.replace(email, '').trim();
    });
  }

  // Extract phone numbers only if they appear to be standalone contact info
  // Don't extract if the text suggests it's already being presented as contact info
  const hasContactKeywords = /(?:contato|telefone|fone|número|whatsapp|wa\.me)/i.test(text);
  
  if (!hasContactKeywords) {
    const phoneMatches = text.match(phoneRegex);
    if (phoneMatches) {
      phoneMatches.forEach(match => {
        const phone = match.trim().replace(/^[:,\s]+|[:,\s]+$/g, ''); // Clean leading/trailing punctuation
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length >= 10 && cleanPhone.length <= 15) {
          phones.push(phone);
          cleanText = cleanText.replace(match, '').trim();
        }
      });
    }
  }

  // Clean up extra whitespace
  cleanText = cleanText.replace(/\s+/g, ' ').trim();

  return {
    text: cleanText,
    links,
    phones
  };
}

export function sanitizeText(text) {
  // Remove potential harmful characters
  return text
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .trim();
}

export function formatPhoneNumber(phone) {
  // Remove WhatsApp suffixes like @s.whatsapp.net
  const cleanPhone = phone.replace(/@.*$/, '');
  
  // Format Brazilian phone numbers
  if (cleanPhone.startsWith('55') && cleanPhone.length === 13) {
    return `+${cleanPhone.slice(0, 2)} (${cleanPhone.slice(2, 4)}) ${cleanPhone.slice(4, 9)}-${cleanPhone.slice(9)}`;
  }
  
  // Return as is for other formats
  return cleanPhone;
}

export function truncateText(text, maxLength = 200) {
  if (text.length <= maxLength) {
    return text;
  }
  
  // Try to truncate at word boundary
  const truncated = text.slice(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > maxLength * 0.8) {
    return truncated.slice(0, lastSpaceIndex) + '...';
  }
  
  return truncated + '...';
}

export function detectLanguage(text) {
  // Simple language detection (could be enhanced)
  const portugueseWords = ['que', 'para', 'com', 'uma', 'por', 'não', 'são', 'foi', 'mais', 'tem'];
  const englishWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had'];
  
  const words = text.toLowerCase().split(/\s+/);
  
  let ptCount = 0;
  let enCount = 0;
  
  words.forEach(word => {
    if (portugueseWords.includes(word)) ptCount++;
    if (englishWords.includes(word)) enCount++;
  });
  
  if (ptCount > enCount) return 'pt';
  if (enCount > ptCount) return 'en';
  return 'pt'; // Default to Portuguese
}

export function cleanWhatsAppFormatting(text) {
  // Remove WhatsApp formatting characters
  return text
    .replace(/\*([^*]+)\*/g, '$1') // Remove bold formatting
    .replace(/_([^_]+)_/g, '$1')   // Remove italic formatting
    .replace(/~([^~]+)~/g, '$1')   // Remove strikethrough formatting
    .replace(/```([^`]+)```/g, '$1') // Remove code blocks
    .trim();
}

export function addNaturalDelay(text) {
  // Calculate natural typing delay based on text length
  const baseDelay = 1000; // 1 second base
  const charDelay = 30; // 30ms per character
  const maxDelay = 5000; // 5 seconds max
  
  const calculatedDelay = Math.min(baseDelay + (text.length * charDelay), maxDelay);
  return calculatedDelay;
}

export function isSpamMessage(text, previousMessages = []) {
  // Check for repeated messages
  const recentMessages = previousMessages.slice(-5);
  const duplicates = recentMessages.filter(msg => msg.toLowerCase() === text.toLowerCase()).length;
  
  if (duplicates >= 2) return true;
  
  // Check for spam patterns
  const spamPatterns = [
    /promo[çc][aã]o/i,
    /desconto/i,
    /oferta/i,
    /clique aqui/i,
    /acesse agora/i,
    /ganhe dinheiro/i,
    /trabalhe em casa/i
  ];
  
  return spamPatterns.some(pattern => pattern.test(text));
}

export function splitMessageIntoChunks(text, maxLength = 4000) {
  if (text.length <= maxLength) {
    return [text];
  }
  
  const chunks = [];
  let currentChunk = '';
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = sentence;
      
      // If single sentence is too long, split by words
      if (currentChunk.length > maxLength) {
        const words = currentChunk.split(' ');
        currentChunk = '';
        
        for (const word of words) {
          if ((currentChunk + word).length <= maxLength) {
            currentChunk += (currentChunk ? ' ' : '') + word;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
            }
            currentChunk = word;
          }
        }
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}