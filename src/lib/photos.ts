// Photos from Unsplash (free to use under the Unsplash License).
// Hotlinked from images.unsplash.com as Unsplash requires; credits shown in the footer.
export type Photo = { id: string; alt: string; author: string; profile: string };

const base = (id: string) => `https://images.unsplash.com/${id}`;

// Data saver mode (#50) asks for smaller, more compressed images.
const saver = () => typeof document !== "undefined" && document.documentElement.hasAttribute("data-saver");

export const photoUrl = (p: Photo, w: number, h?: number) => {
  const k = saver() ? 0.6 : 1;
  const W = Math.round(w * k), H = h ? Math.round(h * k) : undefined;
  return `${base(p.id)}?auto=format&fit=crop&q=${saver() ? 45 : 75}&w=${W}${H ? `&h=${H}` : ""}`;
};

export const photoSrcSet = (p: Photo, widths: number[], ratio?: number) =>
  widths.map((w) => `${photoUrl(p, w, ratio ? Math.round(w * ratio) : undefined)} ${w}w`).join(", ");

export const PHOTOS = {
  tomatoSeller: {
    id: "photo-1734255026082-82fdc81991f0",
    alt: "Vendeuse de tomates et piments au marché de Bodija, Ibadan",
    author: "Tunde Buremo",
    profile: "https://unsplash.com/@tundeburemo",
  },
  treichville: {
    id: "photo-1734866660928-f7cd6e1b90f9",
    alt: "Étals de fruits et légumes au marché de Treichville, Abidjan",
    author: "Ingeborg Korme",
    profile: "https://unsplash.com/@ingeborgkorme",
  },
  phoneShopper: {
    id: "photo-1739271933163-8dcc7c8e8a3e",
    alt: "Jeune femme souriante qui consulte son téléphone",
    author: "Ninthgrid",
    profile: "https://unsplash.com/@ninthgrid_",
  },
  waxFabrics: {
    id: "photo-1768212565426-58b089b6386d",
    alt: "Tissus wax colorés exposés à la vente",
    author: "WyteShot",
    profile: "https://unsplash.com/@wyteshot",
  },
  senegalMarket: {
    id: "photo-1625989744655-9bff7a23dac4",
    alt: "Femmes faisant leurs courses dans un marché au Sénégal",
    author: "Jean Papillon",
    profile: "https://unsplash.com/@jeanpapillon",
  },
  motoGoods: {
    id: "photo-1761666520153-924596d27762",
    alt: "Moto chargée de marchandises sur la route",
    author: "Random Institute",
    profile: "https://unsplash.com/@randominstitute",
  },
  grains: {
    id: "photo-1552710218-bd32b0c98626",
    alt: "Graines et céréales en vrac sur un étal",
    author: "Eva Blue",
    profile: "https://unsplash.com/@evablue",
  },
  tailors: {
    id: "photo-1637997840862-9aafaf835eed",
    alt: "Couturières au travail dans un atelier de couture",
    author: "Kevin Menya",
    profile: "https://unsplash.com/@kevmenya",
  },
} satisfies Record<string, Photo>;
