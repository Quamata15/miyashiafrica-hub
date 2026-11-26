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
  baobabNdem: {
    id: "photo-1651999739984-0dc2a15dcd66",
    alt: "Grand baobab dans le village de Ndem, au Sénégal",
    author: "E. Diop",
    profile: "https://unsplash.com/@ediop",
  },
  baobabTwin: {
    id: "photo-1671407163747-857d226387ea",
    alt: "Baobabs jumeaux près d'un village sénégalais",
    author: "E. Diop",
    profile: "https://unsplash.com/@ediop",
  },
  baobabSunset: {
    id: "photo-1629042976993-95f6a04cf3af",
    alt: "Silhouettes de baobabs au coucher du soleil",
    author: "Awa Aidara",
    profile: "https://unsplash.com/@awaaidara98",
  },
  pepperSeller: {
    id: "photo-1575303093127-18b3c4ef8c41",
    alt: "Vendeuse de piments et de tomates au marché, Lagos",
    author: "Omotayo Tajudeen",
    profile: "https://unsplash.com/@omotayo_ty",
  },
  grainsSeller: {
    id: "photo-1793146689426-7df363e45ec7",
    alt: "Commerçante qui sert des céréales sur son étal",
    author: "Nasiru Othman",
    profile: "https://unsplash.com/@othmanspixel",
  },
  spiceSeller: {
    id: "photo-1793494737781-f07a87dd365a",
    alt: "Commerçant près de ses paniers d'épices et d'ail",
    author: "Nasiru Othman",
    profile: "https://unsplash.com/@othmanspixel",
  },
  cassavaFarmers: {
    id: "photo-1509099381441-ea3c0cf98b94",
    alt: "Agricultrices plantant du manioc en Sierra Leone",
    author: "Annie Spratt",
    profile: "https://unsplash.com/@anniespratt",
  },
  riceHands: {
    id: "photo-1710149468014-3d0eb40caaeb",
    alt: "Mains versant du riz fraîchement récolté",
    author: "Ali Mkumbwa",
    profile: "https://unsplash.com/@mkumbwajr",
  },
  phoneRepair: {
    id: "photo-1611396000732-f8c9a933424f",
    alt: "Réparation d'un smartphone sur l'établi",
    author: "insung yoon",
    profile: "https://unsplash.com/@insungpandora",
  },
  sheaWomen: {
    id: "photo-1658092967527-4e140d9bdaea",
    alt: "Femmes ghanéennes souriantes, produits de beauté au karité",
    author: "Kaeme",
    profile: "https://unsplash.com/@hellokaeme",
  },
  woodMask: {
    id: "photo-1621419203897-20b66b98d495",
    alt: "Masque africain sculpté en bois sur un tissu bleu",
    author: "Mario La Pergola",
    profile: "https://unsplash.com/@mlapergolaphoto",
  },
  schoolGirl: {
    id: "photo-1744809495173-217ca4faa8bc",
    alt: "Écolière ghanéenne qui trace des lignes à la règle",
    author: "David Geneugelijk",
    profile: "https://unsplash.com/@davidgeneugelijk",
  },
  kenteHeadwrap: {
    id: "photo-1725114077712-a0ab079b1a8d",
    alt: "Femme au foulard coloré, Accra",
    author: "Kingsley Hemans",
    profile: "https://unsplash.com/@hemansjr",
  },
  lagosFruit: {
    id: "photo-1579998120708-682dd8a5624f",
    alt: "Petit commerce de fruits dans une rue de Lagos",
    author: "Mary",
    profile: "https://unsplash.com/@magbe",
  },
  parcels: {
    id: "photo-1587293852726-70cdb56c2866",
    alt: "Colis rangés sur des étagères de stockage",
    author: "CHUTTERSNAP",
    profile: "https://unsplash.com/@chuttersnap",
  },
} satisfies Record<string, Photo>;
