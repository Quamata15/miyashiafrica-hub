// Smart filter: silently blocks contact sharing while showing friendly, benefit-focused messages
// The user sees helpful suggestions instead of strict "forbidden" warnings

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
  /@[a-zA-Z0-9_]{2,}/g,
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

// Friendly, benefit-focused messages instead of harsh warnings
const FRIENDLY_MESSAGES = {
  phone: "💡 Astuce : en restant sur le chat MIYASHI, vous bénéficiez de la protection acheteur, du suivi de commande et de la résolution de litiges. Votre message n'a pas pu être envoyé.",
  email: "💡 Bonne nouvelle : le chat MIYASHI est plus rapide qu'un email ! Vous profitez aussi de la protection acheteur et du support en cas de souci. Votre message n'a pas pu être envoyé.",
  url: "💡 Pour votre sécurité, les transactions via MIYASHI incluent la garantie acheteur et le paiement sécurisé. Continuez la discussion ici ! Votre message n'a pas pu être envoyé.",
  social: "💡 Le chat MIYASHI est conçu pour faciliter vos échanges avec les vendeurs. En bonus : protection acheteur, historique des conversations et support dédié ! Votre message n'a pas pu être envoyé.",
  contact: "💡 Saviez-vous qu'en achetant via MIYASHI, vos fonds sont protégés en séquestre jusqu'à réception ? Vous gagnez aussi des points fidélité à chaque achat ! Votre message n'a pas pu être envoyé.",
  address: "💡 Le système de livraison MIYASHI gère les adresses automatiquement. Le livreur reçoit les infos nécessaires de manière sécurisée. Votre message n'a pas pu être envoyé.",
};

export interface FilterResult {
  blocked: boolean;
  reason?: string;
  sanitized?: string;
}

export const filterMessage = (message: string): FilterResult => {
  // Check emails
  if (EMAIL_PATTERN.test(message)) {
    EMAIL_PATTERN.lastIndex = 0;
    return { blocked: true, reason: FRIENDLY_MESSAGES.email };
  }

  // Check URLs
  for (const pattern of URL_PATTERNS) {
    if (pattern.test(message)) {
      pattern.lastIndex = 0;
      return { blocked: true, reason: FRIENDLY_MESSAGES.url };
    }
  }

  // Check social media
  for (const pattern of SOCIAL_KEYWORDS) {
    if (pattern.test(message)) {
      pattern.lastIndex = 0;
      return { blocked: true, reason: FRIENDLY_MESSAGES.social };
    }
  }

  // Check contact intent
  for (const pattern of CONTACT_INTENT) {
    if (pattern.test(message)) {
      pattern.lastIndex = 0;
      return { blocked: true, reason: FRIENDLY_MESSAGES.contact };
    }
  }

  // Check physical addresses
  for (const pattern of ADDRESS_PATTERNS) {
    if (pattern.test(message)) {
      pattern.lastIndex = 0;
      return { blocked: true, reason: FRIENDLY_MESSAGES.address };
    }
  }

  // Check phone numbers
  for (const pattern of PHONE_PATTERNS) {
    const matches = message.match(pattern);
    if (matches) {
      for (const match of matches) {
        const digits = match.replace(/\D/g, "");
        if (digits.length >= 8 && digits.length <= 15) {
          return { blocked: true, reason: FRIENDLY_MESSAGES.phone };
        }
      }
    }
  }

  return { blocked: false };
};
