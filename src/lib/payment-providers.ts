// Tanzania payment providers — brand colors & metadata for branded payment UI.
// Hex colors are used inline (outside Tailwind tokens) because they must match
// each provider's official brand identity to build buyer trust.

export type AccountType = "wallet" | "till" | "paybill" | "bank_account";

export type PaymentProvider = {
  key: string;
  name: string;
  shortName: string;
  category: "mobile" | "bank" | "aggregator";
  bg: string;        // brand background
  fg: string;        // brand foreground (text on bg)
  accent: string;    // secondary brand colour for chips
  accountTypes: AccountType[];
  numberLabel: string;        // sw label for the number field
  numberPlaceholder: string;
  ussd?: string;              // USSD code to dial
  steps?: string[];           // Swahili pay instructions
  monogram: string;           // short text mark we render
};

export const PAYMENT_PROVIDERS: PaymentProvider[] = [
  // ===== Mobile money =====
  {
    key: "mpesa",
    name: "M-Pesa (Vodacom)",
    shortName: "M-Pesa",
    category: "mobile",
    bg: "#E60000",
    fg: "#FFFFFF",
    accent: "#9B0000",
    accountTypes: ["wallet", "till", "paybill"],
    numberLabel: "Namba ya M-Pesa / Lipa",
    numberPlaceholder: "mfano: 0754 123 456 au Lipa 5012345",
    ussd: "*150*00#",
    steps: [
      "Piga *150*00# → 4. Lipa kwa M-Pesa",
      "Chagua Lipa Namba / Tuma kwa Namba",
      "Weka namba uliyopewa hapo juu",
      "Weka kiasi → thibitisha kwa PIN",
    ],
    monogram: "M",
  },
  {
    key: "mixx",
    name: "Mixx by Yas (Tigo Pesa)",
    shortName: "Mixx by Yas",
    category: "mobile",
    bg: "#0033A0",
    fg: "#FFFFFF",
    accent: "#00B5E2",
    accountTypes: ["wallet", "till", "paybill"],
    numberLabel: "Namba ya Mixx / Tigo Pesa",
    numberPlaceholder: "mfano: 0712 345 678",
    ussd: "*150*01#",
    steps: [
      "Piga *150*01# → 4. Lipa Bili / Tuma Pesa",
      "Weka namba uliyopewa",
      "Weka kiasi → thibitisha kwa PIN",
    ],
    monogram: "Y",
  },
  {
    key: "airtel",
    name: "Airtel Money",
    shortName: "Airtel Money",
    category: "mobile",
    bg: "#E40000",
    fg: "#FFFFFF",
    accent: "#1A1A1A",
    accountTypes: ["wallet", "till", "paybill"],
    numberLabel: "Namba ya Airtel Money",
    numberPlaceholder: "mfano: 0688 123 456",
    ussd: "*150*60#",
    steps: [
      "Piga *150*60# → Lipa Bili / Tuma Pesa",
      "Weka namba uliyopewa",
      "Weka kiasi → thibitisha kwa PIN",
    ],
    monogram: "A",
  },
  {
    key: "halopesa",
    name: "HaloPesa (Halotel)",
    shortName: "HaloPesa",
    category: "mobile",
    bg: "#F7941D",
    fg: "#FFFFFF",
    accent: "#0066B3",
    accountTypes: ["wallet", "till"],
    numberLabel: "Namba ya HaloPesa",
    numberPlaceholder: "mfano: 0628 123 456",
    ussd: "*150*88#",
    steps: [
      "Piga *150*88# → Tuma Pesa / Lipa",
      "Weka namba uliyopewa",
      "Thibitisha kwa PIN",
    ],
    monogram: "H",
  },
  {
    key: "ttcl_pesa",
    name: "TTCL Pesa",
    shortName: "TTCL Pesa",
    category: "mobile",
    bg: "#005BAC",
    fg: "#FFFFFF",
    accent: "#F4B400",
    accountTypes: ["wallet"],
    numberLabel: "Namba ya TTCL Pesa",
    numberPlaceholder: "mfano: 0738 123 456",
    ussd: "*150*71#",
    monogram: "T",
  },
  {
    key: "azampesa",
    name: "Azam Pesa",
    shortName: "Azam Pesa",
    category: "mobile",
    bg: "#0E4D2E",
    fg: "#FFFFFF",
    accent: "#F7C518",
    accountTypes: ["wallet"],
    numberLabel: "Namba ya Azam Pesa",
    numberPlaceholder: "mfano: 0735 123 456",
    monogram: "Az",
  },

  // ===== Banks =====
  {
    key: "nmb",
    name: "NMB Bank",
    shortName: "NMB",
    category: "bank",
    bg: "#005BAC",
    fg: "#FFFFFF",
    accent: "#F0B323",
    accountTypes: ["bank_account", "paybill"],
    numberLabel: "Namba ya akaunti / NMB Mkononi",
    numberPlaceholder: "mfano: 4012 3456 7890",
    ussd: "*150*66#",
    steps: [
      "Piga *150*66# → Tuma Pesa / NMB to NMB",
      "Weka namba ya akaunti uliyopewa",
      "Thibitisha kwa PIN",
    ],
    monogram: "N",
  },
  {
    key: "crdb",
    name: "CRDB Bank",
    shortName: "CRDB",
    category: "bank",
    bg: "#007A33",
    fg: "#FFFFFF",
    accent: "#FFD200",
    accountTypes: ["bank_account", "paybill"],
    numberLabel: "Namba ya CRDB / SimBanking",
    numberPlaceholder: "mfano: 0150 1234 5678",
    ussd: "*150*03#",
    monogram: "C",
  },
  {
    key: "nbc",
    name: "NBC Bank",
    shortName: "NBC",
    category: "bank",
    bg: "#00529B",
    fg: "#FFFFFF",
    accent: "#E4002B",
    accountTypes: ["bank_account"],
    numberLabel: "Namba ya NBC",
    numberPlaceholder: "mfano: 011 1234 5678",
    monogram: "NBC",
  },
  {
    key: "stanbic",
    name: "Stanbic Bank",
    shortName: "Stanbic",
    category: "bank",
    bg: "#0033A0",
    fg: "#FFFFFF",
    accent: "#00A9E0",
    accountTypes: ["bank_account"],
    numberLabel: "Namba ya Stanbic",
    numberPlaceholder: "mfano: 9120 1234 5678",
    monogram: "S",
  },
  {
    key: "equity",
    name: "Equity Bank",
    shortName: "Equity",
    category: "bank",
    bg: "#A6192E",
    fg: "#FFFFFF",
    accent: "#1A1A1A",
    accountTypes: ["bank_account"],
    numberLabel: "Namba ya Equity",
    numberPlaceholder: "mfano: 1000 1234 5678",
    monogram: "E",
  },
  {
    key: "exim",
    name: "Exim Bank",
    shortName: "Exim",
    category: "bank",
    bg: "#003B7A",
    fg: "#FFFFFF",
    accent: "#E31837",
    accountTypes: ["bank_account"],
    numberLabel: "Namba ya Exim",
    numberPlaceholder: "mfano: 0200 1234 5678",
    monogram: "X",
  },
  {
    key: "dtb",
    name: "DTB",
    shortName: "DTB",
    category: "bank",
    bg: "#003366",
    fg: "#FFFFFF",
    accent: "#F0B323",
    accountTypes: ["bank_account"],
    numberLabel: "Namba ya DTB",
    numberPlaceholder: "mfano: 0210 1234 5678",
    monogram: "D",
  },

  // ===== Aggregators =====
  {
    key: "selcom",
    name: "Selcom Pay",
    shortName: "Selcom",
    category: "aggregator",
    bg: "#0A2240",
    fg: "#FFFFFF",
    accent: "#F58220",
    accountTypes: ["paybill", "wallet"],
    numberLabel: "Selcom Pay Number / Paybill",
    numberPlaceholder: "mfano: 999123",
    steps: [
      "Fungua app yako (M-Pesa, Mixx, Airtel, NMB n.k.)",
      "Chagua Lipa Bili → Selcom",
      "Weka Selcom Paybill uliyopewa",
      "Weka kiasi → thibitisha",
    ],
    monogram: "Sx",
  },
  {
    key: "other",
    name: "Nyingine",
    shortName: "Other",
    category: "aggregator",
    bg: "#1f2937",
    fg: "#FFFFFF",
    accent: "#9ca3af",
    accountTypes: ["wallet", "till", "paybill", "bank_account"],
    numberLabel: "Namba / Akaunti",
    numberPlaceholder: "Weka namba",
    monogram: "•",
  },
];

export const PROVIDER_BY_KEY: Record<string, PaymentProvider> = Object.fromEntries(
  PAYMENT_PROVIDERS.map((p) => [p.key, p]),
);

export function getProvider(key?: string | null): PaymentProvider {
  if (!key) return PROVIDER_BY_KEY.other;
  return PROVIDER_BY_KEY[key] ?? PROVIDER_BY_KEY.other;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  wallet: "Namba ya simu (wallet)",
  till: "Lipa Namba (Till / Buy Goods)",
  paybill: "Paybill / Lipa Bili",
  bank_account: "Akaunti ya Benki",
};
