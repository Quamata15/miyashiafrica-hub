// Firewall: blocks attempts to share contact information in messages
// Prevents platform disintermediation by filtering phone, email, URLs, addresses

const PHONE_PATTERNS = [
  /(\+?\d{1,4}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4})/g,
  /\b\d{8,15}\b/g,
  /(\d{2}[\s.-]){3,}\d{2}/g,
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

const URL_PATTERNS = [
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /[a-zA-Z0-9-]+\.(com|net|org|fr|tg|ci|bj|sn|ml|bf|ne|gn|ga|cm|cd|cg|rw|ke|tz|ug|gh|ng|biz|info|io|co|shop|store|online)\b/gi,
];

const SOCIAL_KEYWORDS = [
  /whatsapp/gi, /telegram/gi, /signal/gi,
  /facebook/gi, /instagram/gi, /snapchat/gi, /tiktok/gi,
  /twitter/gi, /linkedin/gi, /viber/gi, /imo/gi,
  /messenger/gi, /wechat/gi,
  /@[a-zA-Z0-9_]{2,}/g, // social handles
];

const CONTACT_INTENT = [
  /appel(le|ez)?[\s-]?moi/gi,
  /mon\s+(num[eé]ro|tel|t[eé]l[eé]phone|mail|email|adresse)/gi,
  /contacte[rz]?[\s-]?moi/gi,
  /[eé]cris?[\s-]?moi\s+(sur|via)/gi,
  /rejoins?[\s-]?moi\s+(sur|via)/gi,
  /num[eé]ro\s*:\s*/gi,
  /hors\s+(de\s+)?la\s+plateforme/gi,
  /en\s+dehors/gi,
  /en\s+priv[eé]/gi,
  /viens?\s+(me\s+voir|[àa]\s+(la\s+)?boutique|au\s+magasin|chez\s+moi)/gi,
  /passe[rz]?\s+(me\s+voir|[àa]\s+(la\s+)?boutique|au\s+magasin)/gi,
  /directement\s+(chez|[àa])/gi,
  /sans\s+passer\s+par/gi,
  /pay[eé]?[rz]?\s+(directement|cash|en\s+esp[eè]ces|sur\s+place)/gi,
  /on\s+se\s+(voit|retrouve|rencontre)/gi,
  /ma\s+boutique\s+(est|se\s+trouve)/gi,
  /je\s+suis\s+[àa]\s+/gi,
];

const ADDRESS_PATTERNS = [
  /\b(rue|avenue|boulevard|quartier|lot|parcelle|villa|immeuble|b[aâ]timent)\s+[^\s,]{2,}/gi,
  /\bBP\s*\d+/gi,
  /\b\d{2,5}\s+(rue|av|bd|blvd)/gi,
];

export interface FilterResult {
  blocked: boolean;
  reason?: string;
  sanitized?: string;
}

export const filterMessage = (message: string): FilterResult => {
  // Check emails
  if (EMAIL_PATTERN.test(message)) {
    EMAIL_PATTERN.lastIndex = 0;
    return { blocked: true, reason: "Le partage d'adresses email n'est pas autorisé. Utilisez le chat de la plateforme pour votre sécurité. 🔒" };
  }

  // Check URLs
  for (const pattern of URL_PATTERNS) {
    if (pattern.test(message)) {
      pattern.lastIndex = 0;
      return { blocked: true, reason: "Le partage de liens externes n'est pas autorisé. Toutes les transactions doivent passer par MIYASHI pour votre protection. 🛡️" };
    }
  }

  // Check social media
  for (const pattern of SOCIAL_KEYWORDS) {
    if (pattern.test(message)) {
      pattern.lastIndex = 0;
      return { blocked: true, reason: "Le partage de coordonnées de réseaux sociaux n'est pas autorisé. Restez sur MIYASHI pour bénéficier de la protection acheteur. 🔒" };
    }
  }

  // Check contact intent
  for (const pattern of CONTACT_INTENT) {
    if (pattern.test(message)) {
      pattern.lastIndex = 0;
      return { blocked: true, reason: "Pour votre sécurité, toutes les transactions doivent passer par MIYASHI. Vous bénéficiez ainsi de la garantie acheteur et du système de litiges. 🛡️" };
    }
  }

  // Check physical addresses
  for (const pattern of ADDRESS_PATTERNS) {
    if (pattern.test(message)) {
      pattern.lastIndex = 0;
      return { blocked: true, reason: "Le partage d'adresses physiques n'est pas autorisé dans le chat. Utilisez le système de livraison intégré pour votre sécurité. 📦" };
    }
  }

  // Check phone numbers (more permissive - only block obvious phone numbers)
  for (const pattern of PHONE_PATTERNS) {
    const matches = message.match(pattern);
    if (matches) {
      for (const match of matches) {
        const digits = match.replace(/\D/g, "");
        if (digits.length >= 8 && digits.length <= 15) {
          return { blocked: true, reason: "Le partage de numéros de téléphone n'est pas autorisé. Communiquez via le chat MIYASHI pour bénéficier de la protection plateforme. 🔒" };
        }
      }
    }
  }

  return { blocked: false };
};
