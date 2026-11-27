// Default message templates, used until the recruiter saves their own.
export type Template = { id?: string; name: string; kind: "invite" | "reject" | "offer" | "interview" | "custom"; body: string };

export const DEFAULT_TEMPLATES: Template[] = [
  { name: "Présélection", kind: "invite", body: "Bonjour, merci pour votre candidature au poste de {poste}. Votre profil a retenu notre attention : nous revenons vers vous très vite pour la suite." },
  { name: "Invitation à l'entretien", kind: "interview", body: "Bonjour, nous serions ravis d'échanger avec vous pour le poste de {poste}. Vous trouverez l'entretien dans votre espace « Entretiens »." },
  { name: "Proposition", kind: "offer", body: "Bonjour, nous avons le plaisir de vous proposer le poste de {poste}. Nous vous contactons pour convenir des modalités (date de début, conditions)." },
  { name: "Refus bienveillant", kind: "reject", body: "Bonjour, merci pour l'intérêt porté au poste de {poste} et pour le temps consacré à votre candidature. Nous avons choisi de poursuivre avec d'autres profils, plus proches de nos besoins actuels. Nous vous souhaitons pleine réussite." },
];

export const fillTemplate = (body: string, vars: { poste?: string; entreprise?: string }) =>
  body.replace(/\{poste\}/g, vars.poste ?? "ce poste").replace(/\{entreprise\}/g, vars.entreprise ?? "notre entreprise");
