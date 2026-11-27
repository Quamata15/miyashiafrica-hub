// Content of the "Devenir point relais" page: who can apply, conditions, documents,
// verification steps, obligations and FAQ. Amounts come from Admin → Livraison (site_content.pickup_program).
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { fcfa } from "@/lib/prefs";
import { PHOTOS, photoUrl } from "@/lib/photos";
import {
  Ban, BadgeCheck, Building2, Camera, CheckCircle2, ClipboardCheck, Clock, FileCheck2, FileText, GraduationCap, HandCoins,
  Home, IdCard, KeyRound, Landmark, Lock, MapPin, PackageCheck, Phone, ReceiptText, ShieldCheck, Smartphone, Store, Truck, Users, Wallet,
} from "lucide-react";

export type Program = {
  fee_per_parcel: number; fee_per_cod_parcel: number; fee_per_return: number; payout_frequency: string;
  max_storage_days: number; review_days: number; min_storage_m2: number; min_days_open: number;
};
export const DEFAULT_PROGRAM: Program = {
  fee_per_parcel: 200, fee_per_cod_parcel: 300, fee_per_return: 100, payout_frequency: "chaque semaine",
  max_storage_days: 7, review_days: 5, min_storage_m2: 4, min_days_open: 5,
};

export const REQUIRED_DOCS: { key: string; label: string; detail: string; icon: typeof FileText; optional?: boolean }[] = [
  { key: "rccm", label: "Extrait RCCM", detail: "Registre du commerce de moins de 3 mois (ou carte de commerçant).", icon: Landmark },
  { key: "nif", label: "Attestation d'identification fiscale (NIF)", detail: "Délivrée par l'administration fiscale de votre pays.", icon: ReceiptText },
  { key: "id_front", label: "Pièce d'identité du responsable (recto)", detail: "CNI, passeport ou carte consulaire en cours de validité.", icon: IdCard },
  { key: "id_back", label: "Pièce d'identité du responsable (verso)", detail: "Les quatre coins visibles, sans reflet.", icon: IdCard },
  { key: "proof_address", label: "Justificatif d'adresse du local", detail: "Facture d'eau ou d'électricité de moins de 3 mois.", icon: Home },
  { key: "premises_title", label: "Bail ou titre de propriété du local", detail: "Contrat de location en cours ou attestation de propriété.", icon: FileCheck2 },
  { key: "storefront_photo", label: "Photo de la devanture", detail: "Enseigne et entrée visibles, de jour.", icon: Camera },
  { key: "storage_photo", label: "Photo de l'espace de stockage", detail: "Étagères ou armoire fermant à clé, où les colis seront rangés.", icon: Lock },
  { key: "insurance", label: "Attestation d'assurance multirisque", detail: "Recommandée : couvre vol et incendie des colis confiés.", icon: ShieldCheck, optional: true },
  { key: "payout_proof", label: "Justificatif du compte de paiement", detail: "Relevé mobile money ou RIB au nom de l'entreprise ou du responsable.", icon: Wallet, optional: true },
];

export default function PickupProgramInfo({ program }: { program: Program }) {
  const p = { ...DEFAULT_PROGRAM, ...program };
  const benefits = [
    { icon: HandCoins, title: `${fcfa(p.fee_per_parcel)} par colis remis`, text: `${fcfa(p.fee_per_cod_parcel)} quand vous encaissez un paiement à la livraison, ${fcfa(p.fee_per_return)} par retour traité. Versé ${p.payout_frequency} sur votre portefeuille MIYASHI.` },
    { icon: Users, title: "Des clients dans votre boutique", text: "Chaque retrait est une visite : vos voisins découvrent votre commerce et achètent sur place." },
    { icon: Smartphone, title: "Un outil simple", text: "La page « Point relais » liste les colis attendus ; vous validez la remise avec le code à 6 chiffres du client." },
    { icon: ShieldCheck, title: "Vous êtes protégé", text: "Chaque remise est tracée (code, heure, photo). Un litige n'est jamais tranché sans ces preuves." },
  ];
  const who = [
    { icon: Store, label: "Boutiques et supérettes" }, { icon: Truck, label: "Agences de transport et de logistique" },
    { icon: Building2, label: "Stations-service" }, { icon: PackageCheck, label: "Points de transfert d'argent" },
    { icon: Phone, label: "Boutiques de téléphonie" }, { icon: Landmark, label: "Pharmacies et librairies" },
  ];
  const conditions = [
    { icon: Landmark, text: "Entreprise ou commerce déclaré : RCCM (ou carte de commerçant) et numéro fiscal (NIF)." },
    { icon: MapPin, text: "Local commercial fixe, en rez-de-chaussée, facile à trouver, avec une enseigne visible." },
    { icon: Lock, text: `Espace de stockage d'au moins ${p.min_storage_m2} m², à l'abri de la pluie et fermant à clé, hors de portée du public.` },
    { icon: Clock, text: `Ouvert au moins ${p.min_days_open} jours sur 7, idéalement de 8 h à 19 h, y compris le samedi.` },
    { icon: Smartphone, text: "Un smartphone avec internet au comptoir, et un numéro joignable pendant les heures d'ouverture." },
    { icon: Users, text: "Au moins une personne formée à la remise des colis présente pendant les heures d'ouverture." },
    { icon: ShieldCheck, text: "Extincteur, éclairage et, de préférence, caméra et assurance multirisque." },
    { icon: BadgeCheck, text: "Responsable majeur, sans fraude connue sur MIYASHI, qui accepte la vérification de son identité." },
  ];
  const steps = [
    { icon: FileText, title: "Candidature en ligne", time: "15 min", text: "Vous remplissez le dossier et déposez vos pièces depuis votre téléphone. Vous pouvez enregistrer et reprendre plus tard." },
    { icon: FileCheck2, title: "Vérification des pièces", time: `sous ${p.review_days} jours ouvrés`, text: "Nous contrôlons RCCM, NIF, identité (y compris auprès des registres quand c'est possible) et cohérence des adresses." },
    { icon: Phone, title: "Appel de qualification", time: "15 min", text: "Un conseiller vous appelle pour confirmer vos coordonnées, vos horaires et votre capacité." },
    { icon: MapPin, title: "Visite du local", time: "sur rendez-vous", text: "Un agent vérifie sur place l'adresse, la position GPS, l'espace de stockage et la sécurité, avec photos. Gardez les originaux de vos pièces." },
    { icon: GraduationCap, title: "Formation", time: "1 h", text: "Réception des colis, contrôle du code de remise, encaissement du paiement à la livraison, gestion des retours et des litiges." },
    { icon: ClipboardCheck, title: "Contrat et activation", time: "le jour même", text: "Vous signez la convention de partenariat ; votre point relais apparaît aussitôt au moment du paiement des acheteurs." },
  ];
  const duties = [
    `Ranger chaque colis dès réception dans l'espace fermé, et le garder ${p.max_storage_days} jours maximum avant retour.`,
    "Ne remettre un colis qu'au client qui donne le bon code à 6 chiffres, sans exception.",
    "Ne jamais ouvrir un colis. Signaler tout colis abîmé à la réception, photo à l'appui.",
    "Pour un paiement à la livraison : encaisser le montant exact affiché, puis valider dans l'application.",
    "Respecter les horaires publiés et prévenir MIYASHI de toute fermeture exceptionnelle 48 h à l'avance.",
    "Garder confidentielles les informations des clients (noms, numéros, adresses).",
  ];
  const banned = ["Armes et munitions", "Drogues et médicaments sans ordonnance", "Produits inflammables ou dangereux", "Animaux vivants", "Espèces protégées", "Fausse monnaie et contrefaçons", "Denrées périssables non emballées"];
  const faq = [
    { q: "Combien de colis vais-je recevoir ?", a: "Cela dépend de votre quartier et de la densité de vendeurs. Vous fixez vous-même votre capacité maximale ; nous ne la dépassons jamais." },
    { q: "Qui est responsable si un colis est volé ou perdu ?", a: "Le point relais est responsable des colis entre la réception et la remise. C'est pourquoi l'espace fermé à clé est obligatoire et l'assurance recommandée. Chaque étape étant tracée, les responsabilités sont établies sur preuves." },
    { q: "Que se passe-t-il si un client ne vient pas ?", a: `Le client est relancé automatiquement. Après ${p.max_storage_days} jours, le colis repart chez le vendeur et vous êtes rémunéré pour le retour.` },
    { q: "Comment suis-je payé ?", a: `Vos rémunérations sont créditées ${p.payout_frequency} sur votre portefeuille MIYASHI, puis retirables vers votre mobile money ou votre compte bancaire.` },
    { q: "Ma candidature peut-elle être refusée ?", a: "Oui, si une pièce est invalide, si le local ne remplit pas les conditions de sécurité, ou s'il existe déjà assez de points relais très proches. Le motif vous est toujours indiqué." },
    { q: "Puis-je arrêter ?", a: "Oui, avec un préavis de 15 jours, le temps de remettre ou retourner les colis en cours." },
  ];

  return (
    <div className="space-y-10">
      <section aria-labelledby="pp-why">
        <h2 id="pp-why" className="text-2xl md:text-3xl font-display font-bold mb-6">Pourquoi devenir point relais</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {benefits.map((b) => (
            <div key={b.title} className="glass rounded-2xl p-5">
              <b.icon className="w-6 h-6 text-primary mb-3" />
              <p className="font-semibold mb-1">{b.title}</p>
              <p className="text-sm text-muted-foreground">{b.text}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">Rémunérations indicatives du programme, confirmées dans la convention de partenariat.</p>
      </section>

      <section aria-labelledby="pp-who" className="grid lg:grid-cols-2 gap-6 items-center">
        <div>
          <h2 id="pp-who" className="text-2xl md:text-3xl font-display font-bold mb-4">Qui peut candidater</h2>
          <p className="text-muted-foreground mb-5">Toute entreprise disposant d'un local ouvert au public, en particulier :</p>
          <div className="grid grid-cols-2 gap-3">
            {who.map((w) => <div key={w.label} className="flex items-center gap-2 rounded-xl border border-foreground/10 p-3 text-sm"><w.icon className="w-4 h-4 text-primary shrink-0" />{w.label}</div>)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3" aria-hidden>
          <img src={photoUrl(PHOTOS.lagosFruit, 600, 760)} alt="" loading="lazy" className="rounded-2xl aspect-[4/3] object-cover w-full" />
          <img src={photoUrl(PHOTOS.parcels, 600, 760)} alt="" loading="lazy" className="rounded-2xl aspect-[4/3] object-cover w-full" />
        </div>
      </section>

      <section aria-labelledby="pp-cond">
        <h2 id="pp-cond" className="text-2xl md:text-3xl font-display font-bold mb-6">Conditions à remplir</h2>
        <ul className="grid md:grid-cols-2 gap-3">
          {conditions.map((c) => <li key={c.text} className="flex gap-3 rounded-xl border border-foreground/10 p-4"><c.icon className="w-5 h-5 text-accent shrink-0 mt-0.5" /><span className="text-sm">{c.text}</span></li>)}
        </ul>
      </section>

      <section aria-labelledby="pp-docs">
        <h2 id="pp-docs" className="text-2xl md:text-3xl font-display font-bold mb-2">Pièces à fournir</h2>
        <p className="text-muted-foreground mb-6">Photos nettes ou PDF, 10 Mo maximum par fichier. Les documents sont stockés de façon privée : seule l'équipe de vérification y a accès.</p>
        <div className="overflow-x-auto rounded-2xl border border-foreground/10">
          <table className="w-full text-sm min-w-[560px]">
            <thead><tr className="text-left text-muted-foreground"><th className="p-3">Document</th><th className="p-3">Précisions</th><th className="p-3 w-28">Statut</th></tr></thead>
            <tbody>{REQUIRED_DOCS.map((d) => (
              <tr key={d.key} className="border-t border-foreground/10">
                <td className="p-3 font-medium"><span className="flex items-center gap-2"><d.icon className="w-4 h-4 text-primary" />{d.label}</span></td>
                <td className="p-3 text-muted-foreground">{d.detail}</td>
                <td className="p-3">{d.optional ? <span className="text-muted-foreground">Recommandé</span> : <span className="text-primary font-medium">Obligatoire</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="pp-steps">
        <h2 id="pp-steps" className="text-2xl md:text-3xl font-display font-bold mb-6">Les vérifications, étape par étape</h2>
        <ol className="relative grid md:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <li key={s.title} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-9 h-9 rounded-xl bg-primary text-primary-foreground font-display font-bold flex items-center justify-center">{i + 1}</span>
                <s.icon className="w-5 h-5 text-primary" />
                <span className="ml-auto text-xs text-muted-foreground">{s.time}</span>
              </div>
              <p className="font-semibold mb-1">{s.title}</p>
              <p className="text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="pp-duties" className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-foreground/10 p-6">
          <h2 id="pp-duties" className="text-xl font-display font-bold mb-4 flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" />Vos engagements</h2>
          <ul className="space-y-2">{duties.map((d) => <li key={d} className="flex gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />{d}</li>)}</ul>
        </div>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.04] p-6">
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2"><Ban className="w-5 h-5 text-destructive" />Colis refusés</h2>
          <p className="text-sm text-muted-foreground mb-3">Vous devez refuser et signaler tout colis qui contient ou semble contenir :</p>
          <ul className="grid sm:grid-cols-2 gap-2">{banned.map((b) => <li key={b} className="text-sm flex gap-2"><Ban className="w-3.5 h-3.5 text-destructive shrink-0 mt-1" />{b}</li>)}</ul>
        </div>
      </section>

      <section aria-labelledby="pp-faq">
        <h2 id="pp-faq" className="text-2xl md:text-3xl font-display font-bold mb-4">Questions fréquentes</h2>
        <Accordion type="single" collapsible className="rounded-2xl border border-foreground/10 px-4">
          {faq.map((f, i) => (
            <AccordionItem key={f.q} value={`f${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
