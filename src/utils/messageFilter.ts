// Firewall: blocks attempts to share contact information in messages
const PHONE_PATTERNS = [
  /(\+?\d{1,4}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4})/g,
  /\b\d{8,15}\b/g,
  /(\d{2}[\s.-]){3,}\d{2}/g,
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

const SOCIAL_KEYWORDS = [
  /whatsapp/gi, /telegram/gi, /signal/gi,
  /facebook/gi, /instagram/gi, /snapchat/gi, /tiktok/gi,
  /twitter/gi, /linkedin/gi, /viber/gi,
  /@[a-zA-Z0-9_]{2,}/g, // social handles
];

const CONTACT_INTENT = [
  /appel(le|ez)?[\s-]?moi/gi,
  /mon\s+(num[eé]ro|tel|t[eé]l[eé]phone|mail|email)/gi,
  /contacte[rz]?[\s-]?moi/gi,
  /[eé]cris?[\s-]?moi\s+(sur|via)/gi,
  /rejoins?[\s-]?moi\s+(sur|via)/gi,
  /num[eé]ro\s*:\s*/gi,
  /hors\s+(de\s+)?la\s+plateforme/gi,
  /en\s+dehors/gi,
  /en\s+priv[eé]/gi,
];

export interface FilterResult {
  blocked: boolean;
  reason?: string;
  sanitized?: string;
}

export const filterMessage = (message: string): FilterResult => {
  // Check emails
  if (EMAIL_PATTERN.test(message)) {
    return { blocked: true, reason: "Le partage d'adresses email n'est pas autorisé pour votre sécurité." };
  }

  // Check social media
  for (const pattern of SOCIAL_KEYWORDS) {
    if (pattern.test(message)) {
      pattern.lastIndex = 0;
      return { blocked: true, reason: "Le partage de coordonnées de réseaux sociaux n'est pas autorisé." };
    }
  }

  // Check contact intent
  for (const pattern of CONTACT_INTENT) {
    if (pattern.test(message)) {
      pattern.lastIndex = 0;
      return { blocked: true, reason: "Les échanges de coordonnées personnelles ne sont pas autorisés sur la plateforme." };
    }
  }

  // Check phone numbers (more permissive - only block obvious phone numbers)
  for (const pattern of PHONE_PATTERNS) {
    const matches = message.match(pattern);
    if (matches) {
      for (const match of matches) {
        const digits = match.replace(/\D/g, "");
        if (digits.length >= 8 && digits.length <= 15) {
          return { blocked: true, reason: "Le partage de numéros de téléphone n'est pas autorisé pour votre sécurité." };
        }
      }
    }
  }

  return { blocked: false };
};
