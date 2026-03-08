export interface PaymentMethod {
  id: string;
  label: string;
  icon: string;
}

export interface CountryPayments {
  label: string;
  prefix: string;
  methods: PaymentMethod[];
}

export const paymentsByCountry: Record<string, CountryPayments> = {
  togo: {
    label: "🇹🇬 Togo",
    prefix: "+228",
    methods: [
      { id: "tmoney", label: "TMoney (Togocel)", icon: "🟢" },
      { id: "flooz", label: "Moov Money (Flooz)", icon: "🔵" },
      { id: "card", label: "Carte bancaire", icon: "💳" },
    ],
  },
  senegal: {
    label: "🇸🇳 Sénégal",
    prefix: "+221",
    methods: [
      { id: "orange_money", label: "Orange Money", icon: "🟠" },
      { id: "wave", label: "Wave", icon: "🔵" },
      { id: "free_money", label: "Free Money", icon: "🟢" },
      { id: "card", label: "Carte bancaire", icon: "💳" },
    ],
  },
  cote_ivoire: {
    label: "🇨🇮 Côte d'Ivoire",
    prefix: "+225",
    methods: [
      { id: "orange_money", label: "Orange Money", icon: "🟠" },
      { id: "mtn_money", label: "MTN Money", icon: "🟡" },
      { id: "wave", label: "Wave", icon: "🔵" },
      { id: "moov_money", label: "Moov Money", icon: "🔵" },
      { id: "card", label: "Carte bancaire", icon: "💳" },
    ],
  },
  benin: {
    label: "🇧🇯 Bénin",
    prefix: "+229",
    methods: [
      { id: "mtn_money", label: "MTN Money", icon: "🟡" },
      { id: "moov_money", label: "Moov Money", icon: "🔵" },
      { id: "card", label: "Carte bancaire", icon: "💳" },
    ],
  },
  burkina_faso: {
    label: "🇧🇫 Burkina Faso",
    prefix: "+226",
    methods: [
      { id: "orange_money", label: "Orange Money", icon: "🟠" },
      { id: "moov_money", label: "Moov Money", icon: "🔵" },
      { id: "card", label: "Carte bancaire", icon: "💳" },
    ],
  },
  mali: {
    label: "🇲🇱 Mali",
    prefix: "+223",
    methods: [
      { id: "orange_money", label: "Orange Money", icon: "🟠" },
      { id: "moov_money", label: "Moov Money", icon: "🔵" },
      { id: "card", label: "Carte bancaire", icon: "💳" },
    ],
  },
  niger: {
    label: "🇳🇪 Niger",
    prefix: "+227",
    methods: [
      { id: "airtel_money", label: "Airtel Money", icon: "🔴" },
      { id: "moov_money", label: "Moov Money", icon: "🔵" },
      { id: "card", label: "Carte bancaire", icon: "💳" },
    ],
  },
  guinee: {
    label: "🇬🇳 Guinée",
    prefix: "+224",
    methods: [
      { id: "orange_money", label: "Orange Money", icon: "🟠" },
      { id: "mtn_money", label: "MTN Money", icon: "🟡" },
      { id: "card", label: "Carte bancaire", icon: "💳" },
    ],
  },
};

export const getCountryKeys = () => Object.keys(paymentsByCountry);
export const getDefaultCountry = () => "togo";
