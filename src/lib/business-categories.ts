// Predefined SHOP / BUSINESS categories typical for Tanzanian local communities.
// Bilingual (English / Swahili). Use these for the shop "what kind of business" field.
import {
  Store, ShoppingBasket, UtensilsCrossed, Coffee, Beef, Fish, Apple, Wheat,
  Milk, CupSoda, Shirt, Footprints, Watch, Smartphone, Laptop, Pill, HeartPulse,
  Sparkles, Scissors, Baby, Sofa, Hammer, Wrench, BookOpen, Bike, Car, Flower2,
  Fuel, Printer, Wifi, Camera, Drum, Wine, Cake, Pizza, Drumstick, Egg, Leaf,
  Gem, Hotel, Truck, Tractor, Briefcase, Package,
} from "lucide-react";

export type BusinessCategory = {
  key: string;
  en: string;
  sw: string;
  icon: any;
  group: "Food & Drinks" | "Groceries" | "Personal" | "Home & Trade" | "Tech & Services" | "Transport" | "Other";
};

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  // Food & Drinks
  { key: "Restaurant",    en: "Restaurant",            sw: "Mgahawa",                icon: UtensilsCrossed, group: "Food & Drinks" },
  { key: "Fast Food",     en: "Fast food / Chips",     sw: "Chipsi & Chakula cha haraka", icon: Pizza,     group: "Food & Drinks" },
  { key: "Mama Lishe",    en: "Mama lishe",            sw: "Mama lishe",             icon: Drumstick,       group: "Food & Drinks" },
  { key: "Bakery",        en: "Bakery",                sw: "Mkate / Keki",           icon: Cake,            group: "Food & Drinks" },
  { key: "Cafe",          en: "Café / Coffee shop",    sw: "Cafe / Kahawa",          icon: Coffee,          group: "Food & Drinks" },
  { key: "Juice Bar",     en: "Juice bar",             sw: "Juisi",                  icon: CupSoda,         group: "Food & Drinks" },
  { key: "Bar",           en: "Bar / Pub",             sw: "Baa / Kilabu",           icon: Wine,            group: "Food & Drinks" },

  // Groceries / market
  { key: "Duka",          en: "Duka (general shop)",   sw: "Duka la jumla",          icon: Store,           group: "Groceries" },
  { key: "Supermarket",   en: "Supermarket",           sw: "Soko kuu",               icon: ShoppingBasket,  group: "Groceries" },
  { key: "Butcher",       en: "Butchery",              sw: "Bucha",                  icon: Beef,            group: "Groceries" },
  { key: "Fishmonger",    en: "Fishmonger",            sw: "Samaki",                 icon: Fish,            group: "Groceries" },
  { key: "Greengrocer",   en: "Fruits & vegetables",   sw: "Matunda & Mboga",        icon: Apple,           group: "Groceries" },
  { key: "Cereals",       en: "Cereals & grains",      sw: "Nafaka",                 icon: Wheat,           group: "Groceries" },
  { key: "Dairy",         en: "Dairy & eggs",          sw: "Maziwa & Mayai",         icon: Milk,            group: "Groceries" },
  { key: "Poultry",       en: "Poultry / Eggs",        sw: "Kuku & Mayai",           icon: Egg,             group: "Groceries" },
  { key: "Farm",          en: "Farm / Mkulima",        sw: "Shamba",                 icon: Leaf,            group: "Groceries" },

  // Personal
  { key: "Fashion",       en: "Clothing & fashion",    sw: "Mavazi",                 icon: Shirt,           group: "Personal" },
  { key: "Shoes",         en: "Shoes",                 sw: "Viatu",                  icon: Footprints,      group: "Personal" },
  { key: "Watches",       en: "Watches & accessories", sw: "Saa & vifaa",            icon: Watch,           group: "Personal" },
  { key: "Jewelry",       en: "Jewelry",               sw: "Mapambo",                icon: Gem,             group: "Personal" },
  { key: "Beauty",        en: "Cosmetics & beauty",    sw: "Urembo",                 icon: Sparkles,        group: "Personal" },
  { key: "Salon",         en: "Salon & barber",        sw: "Saluni & Kinyozi",       icon: Scissors,        group: "Personal" },
  { key: "Pharmacy",      en: "Pharmacy",              sw: "Famasi / Dawa",          icon: Pill,            group: "Personal" },
  { key: "Clinic",        en: "Clinic / Health",       sw: "Kliniki / Afya",         icon: HeartPulse,      group: "Personal" },
  { key: "Baby",          en: "Baby & kids",           sw: "Vitu vya watoto",        icon: Baby,            group: "Personal" },

  // Home & Trade
  { key: "Furniture",     en: "Furniture",             sw: "Samani",                 icon: Sofa,            group: "Home & Trade" },
  { key: "Hardware",      en: "Hardware / Building",   sw: "Vifaa vya ujenzi",       icon: Hammer,          group: "Home & Trade" },
  { key: "Tools",         en: "Tools / Mafundi",       sw: "Zana / Mafundi",         icon: Wrench,          group: "Home & Trade" },
  { key: "Flowers",       en: "Flowers / Plants",      sw: "Maua",                   icon: Flower2,         group: "Home & Trade" },
  { key: "Stationery",    en: "Stationery & books",    sw: "Vitabu & Stationery",    icon: BookOpen,        group: "Home & Trade" },
  { key: "Music",         en: "Music & instruments",   sw: "Muziki",                 icon: Drum,            group: "Home & Trade" },

  // Tech & Services
  { key: "Phones",        en: "Phones & accessories",  sw: "Simu & vifaa",           icon: Smartphone,      group: "Tech & Services" },
  { key: "Electronics",   en: "Electronics",           sw: "Vifaa vya umeme",        icon: Laptop,          group: "Tech & Services" },
  { key: "Photo",         en: "Photo & video studio",  sw: "Studio ya picha",        icon: Camera,          group: "Tech & Services" },
  { key: "Internet",      en: "Internet / M-Pesa",     sw: "Internet / M-Pesa",      icon: Wifi,            group: "Tech & Services" },
  { key: "Print",         en: "Printing / Copy",       sw: "Uchapishaji",            icon: Printer,         group: "Tech & Services" },
  { key: "Services",      en: "Other services",        sw: "Huduma nyingine",        icon: Briefcase,       group: "Tech & Services" },
  { key: "Lodging",       en: "Guest house / Hoteli",  sw: "Guest house / Hoteli",   icon: Hotel,           group: "Tech & Services" },

  // Transport
  { key: "Boda",          en: "Boda boda",             sw: "Boda boda",              icon: Bike,            group: "Transport" },
  { key: "Auto Parts",    en: "Auto parts & garage",   sw: "Vifaa vya magari / Garage", icon: Car,          group: "Transport" },
  { key: "Fuel",          en: "Fuel / Mafuta",         sw: "Mafuta",                 icon: Fuel,            group: "Transport" },
  { key: "Logistics",     en: "Transport / Lori",      sw: "Usafirishaji / Lori",    icon: Truck,           group: "Transport" },
  { key: "Agro",          en: "Agro / Pembejeo",       sw: "Pembejeo za kilimo",     icon: Tractor,         group: "Transport" },

  { key: "Other",         en: "Other",                 sw: "Nyingine",               icon: Package,         group: "Other" },
];

export const BUSINESS_CATEGORY_GROUPS: BusinessCategory["group"][] = [
  "Food & Drinks", "Groceries", "Personal", "Home & Trade", "Tech & Services", "Transport", "Other",
];

export const getBusinessCategory = (key: string | null | undefined): BusinessCategory =>
  BUSINESS_CATEGORIES.find((c) => c.key === key) ??
  BUSINESS_CATEGORIES[BUSINESS_CATEGORIES.length - 1];
