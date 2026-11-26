import PageShell from "@/components/layout/PageShell";
import { AddressBook } from "@/components/commerce/AddressBook";

export default function Addresses() {
  return (
    <PageShell title="Mes adresses" description="Avec un point de repère et votre position GPS, le livreur vous trouve du premier coup.">
      <AddressBook />
    </PageShell>
  );
}
