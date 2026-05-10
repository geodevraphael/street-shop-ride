// Predefined product categories for Tanzania marketplace.
// Bilingual (English / Swahili). Lucide icons styled with theme primary color.
import {
  Apple, Carrot, Beef, Fish, Milk, Wheat, Coffee, CupSoda, UtensilsCrossed,
  Shirt, Footprints, Watch, Smartphone, Laptop, Headphones, Pill, HeartPulse,
  Sparkles, Scissors, Baby, Home, Sofa, Hammer, Wrench, BookOpen, Gamepad2,
  Bike, Car, Flower2, Dog, Package,
} from "lucide-react";

export type Category = {
  key: string;       // canonical English key, stored in DB
  en: string;        // English label
  sw: string;        // Swahili label
  icon: any;         // Lucide icon
  isFood?: boolean;  // pre-tick "Food" switch
};

export const CATEGORIES: Category[] = [
  { key: "Food",        en: "Food",         sw: "Chakula",     icon: UtensilsCrossed, isFood: true },
  { key: "Fruits",      en: "Fruits",       sw: "Matunda",     icon: Apple,           isFood: true },
  { key: "Vegetables",  en: "Vegetables",   sw: "Mboga",       icon: Carrot,          isFood: true },
  { key: "Meat",        en: "Meat",         sw: "Nyama",       icon: Beef,            isFood: true },
  { key: "Fish",        en: "Fish",         sw: "Samaki",      icon: Fish,            isFood: true },
  { key: "Dairy",       en: "Dairy",        sw: "Maziwa",      icon: Milk,            isFood: true },
  { key: "Grains",      en: "Grains",       sw: "Nafaka",      icon: Wheat,           isFood: true },
  { key: "Drinks",      en: "Drinks",       sw: "Vinywaji",    icon: CupSoda },
  { key: "Coffee & Tea",en: "Coffee & Tea", sw: "Kahawa & Chai", icon: Coffee },
  { key: "Fashion",     en: "Fashion",      sw: "Mavazi",      icon: Shirt },
  { key: "Shoes",       en: "Shoes",        sw: "Viatu",       icon: Footprints },
  { key: "Watches",     en: "Watches",      sw: "Saa",         icon: Watch },
  { key: "Phones",      en: "Phones",       sw: "Simu",        icon: Smartphone },
  { key: "Electronics", en: "Electronics",  sw: "Vifaa vya Umeme", icon: Laptop },
  { key: "Audio",       en: "Audio",        sw: "Sauti",       icon: Headphones },
  { key: "Pharmacy",    en: "Pharmacy",     sw: "Dawa",        icon: Pill },
  { key: "Health",      en: "Health",       sw: "Afya",        icon: HeartPulse },
  { key: "Beauty",      en: "Beauty",       sw: "Urembo",      icon: Sparkles },
  { key: "Salon",       en: "Salon",        sw: "Saluni",      icon: Scissors },
  { key: "Baby",        en: "Baby",         sw: "Mtoto",       icon: Baby },
  { key: "Home",        en: "Home",         sw: "Nyumbani",    icon: Home },
  { key: "Furniture",   en: "Furniture",    sw: "Samani",      icon: Sofa },
  { key: "Hardware",    en: "Hardware",     sw: "Vifaa vya Ujenzi", icon: Hammer },
  { key: "Tools",       en: "Tools",        sw: "Zana",        icon: Wrench },
  { key: "Books",       en: "Books",        sw: "Vitabu",      icon: BookOpen },
  { key: "Toys",        en: "Toys",         sw: "Vitu vya Kuchezea", icon: Gamepad2 },
  { key: "Bikes",       en: "Bikes",        sw: "Baiskeli",    icon: Bike },
  { key: "Auto",        en: "Auto",         sw: "Magari",      icon: Car },
  { key: "Flowers",     en: "Flowers",      sw: "Maua",        icon: Flower2 },
  { key: "Pets",        en: "Pets",         sw: "Wanyama",     icon: Dog },
  { key: "Other",       en: "Other",        sw: "Nyingine",    icon: Package },
];

export const getCategory = (key: string): Category =>
  CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
