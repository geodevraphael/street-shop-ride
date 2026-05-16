// Per-category extra fields collected by the seller wizard and shown to buyers.
// Stored on products.attributes (jsonb). Buyer selections are stored on
// order_items.selected_attributes (jsonb) so the seller knows exactly what to pack.

export type FieldType = "text" | "number" | "select" | "multiselect" | "tags";

export type AttributeField = {
  key: string;
  label: string;   // Swahili · English
  type: FieldType;
  options?: string[];   // for select / multiselect
  required?: boolean;
  unit?: string;        // e.g. "km", "GB"
  /** When true, the buyer must pick one of these values before adding to cart. */
  buyerPick?: boolean;
};

// Reusable option sets
const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const SHOE_SIZES_EU = ["36","37","38","39","40","41","42","43","44","45","46"];
const COMMON_COLORS = [
  "Black","White","Grey","Red","Blue","Navy","Green","Yellow","Orange",
  "Pink","Purple","Brown","Beige","Gold","Silver","Multicolor",
];
const PHONE_STORAGE = ["16GB","32GB","64GB","128GB","256GB","512GB","1TB"];
const PHONE_RAM = ["2GB","3GB","4GB","6GB","8GB","12GB","16GB"];
const FUEL_TYPES = ["Petrol","Diesel","Hybrid","Electric","Gas (CNG/LPG)"];
const TRANSMISSION = ["Manual","Automatic","CVT"];
const CONDITION = ["Brand new","Like new","Used - good","Used - fair","For parts"];

export const ATTRIBUTE_SCHEMAS: Record<string, AttributeField[]> = {
  Fashion: [
    { key: "sizes",    label: "Saizi · Sizes",    type: "multiselect", options: CLOTHING_SIZES, buyerPick: true, required: true },
    { key: "colors",   label: "Rangi · Colors",   type: "multiselect", options: COMMON_COLORS,  buyerPick: true },
    { key: "material", label: "Material",         type: "text" },
    { key: "gender",   label: "Jinsia · For",     type: "select", options: ["Men","Women","Unisex","Kids"] },
    { key: "brand",    label: "Brand",            type: "text" },
  ],
  Shoes: [
    { key: "sizes",   label: "Saizi (EU)",     type: "multiselect", options: SHOE_SIZES_EU, buyerPick: true, required: true },
    { key: "colors",  label: "Rangi · Colors", type: "multiselect", options: COMMON_COLORS, buyerPick: true },
    { key: "gender",  label: "Jinsia · For",   type: "select", options: ["Men","Women","Unisex","Kids"] },
    { key: "brand",   label: "Brand",          type: "text" },
  ],
  Watches: [
    { key: "colors",   label: "Rangi · Colors", type: "multiselect", options: COMMON_COLORS, buyerPick: true },
    { key: "brand",    label: "Brand",          type: "text" },
    { key: "movement", label: "Movement",       type: "select", options: ["Quartz","Automatic","Mechanical","Smart"] },
    { key: "gender",   label: "Jinsia · For",   type: "select", options: ["Men","Women","Unisex"] },
  ],
  Phones: [
    { key: "brand",     label: "Brand",     type: "text", required: true },
    { key: "model",     label: "Model",     type: "text" },
    { key: "storage",   label: "Hifadhi · Storage", type: "select", options: PHONE_STORAGE, buyerPick: true },
    { key: "ram",       label: "RAM",       type: "select", options: PHONE_RAM },
    { key: "colors",    label: "Rangi · Colors", type: "multiselect", options: COMMON_COLORS, buyerPick: true },
    { key: "condition", label: "Hali · Condition", type: "select", options: CONDITION },
    { key: "warranty",  label: "Warranty (months)", type: "number", unit: "months" },
  ],
  Electronics: [
    { key: "brand",     label: "Brand",     type: "text" },
    { key: "model",     label: "Model",     type: "text" },
    { key: "colors",    label: "Rangi · Colors", type: "multiselect", options: COMMON_COLORS, buyerPick: true },
    { key: "condition", label: "Hali · Condition", type: "select", options: CONDITION },
    { key: "warranty",  label: "Warranty (months)", type: "number", unit: "months" },
  ],
  Audio: [
    { key: "brand",  label: "Brand",  type: "text" },
    { key: "colors", label: "Rangi · Colors", type: "multiselect", options: COMMON_COLORS, buyerPick: true },
    { key: "type",   label: "Aina · Type", type: "select", options: ["Earbuds","Headphones","Speaker","Soundbar","Hi-Fi"] },
  ],
  Auto: [
    { key: "make",         label: "Make",          type: "text", required: true },
    { key: "model",        label: "Model",         type: "text", required: true },
    { key: "year",         label: "Mwaka · Year",  type: "number", required: true },
    { key: "mileage_km",   label: "Mileage",       type: "number", unit: "km" },
    { key: "fuel",         label: "Mafuta · Fuel", type: "select", options: FUEL_TYPES },
    { key: "transmission", label: "Transmission",  type: "select", options: TRANSMISSION },
    { key: "engine_cc",    label: "Engine",        type: "number", unit: "cc" },
    { key: "color",        label: "Rangi · Color", type: "select", options: COMMON_COLORS },
    { key: "condition",    label: "Hali · Condition", type: "select", options: CONDITION },
    { key: "vin",          label: "VIN / Chassis", type: "text" },
    { key: "plate",        label: "Namba ya gari · Plate", type: "text" },
  ],
  Bikes: [
    { key: "brand",        label: "Brand",         type: "text" },
    { key: "model",        label: "Model",         type: "text" },
    { key: "year",         label: "Mwaka · Year",  type: "number" },
    { key: "mileage_km",   label: "Mileage",       type: "number", unit: "km" },
    { key: "engine_cc",    label: "Engine",        type: "number", unit: "cc" },
    { key: "color",        label: "Rangi · Color", type: "select", options: COMMON_COLORS },
    { key: "condition",    label: "Hali · Condition", type: "select", options: CONDITION },
  ],
  Furniture: [
    { key: "material",   label: "Material",       type: "text" },
    { key: "colors",     label: "Rangi · Colors", type: "multiselect", options: COMMON_COLORS, buyerPick: true },
    { key: "dimensions", label: "Vipimo · Dimensions (LxWxH cm)", type: "text" },
  ],
  Hardware: [
    { key: "brand", label: "Brand", type: "text" },
    { key: "size",  label: "Ukubwa · Size", type: "text", buyerPick: true },
  ],
  Tools: [
    { key: "brand",      label: "Brand", type: "text" },
    { key: "power",      label: "Power", type: "text" },
    { key: "warranty",   label: "Warranty (months)", type: "number", unit: "months" },
  ],
  Baby: [
    { key: "age_range", label: "Umri · Age range", type: "select",
      options: ["0–3 m","3–6 m","6–12 m","1–2 y","2–4 y","4–6 y"], buyerPick: true },
    { key: "colors",    label: "Rangi · Colors", type: "multiselect", options: COMMON_COLORS, buyerPick: true },
  ],
  Pharmacy: [
    { key: "brand",      label: "Brand",       type: "text" },
    { key: "dosage",     label: "Dosage",      type: "text" },
    { key: "prescription_required", label: "Prescription required?", type: "select", options: ["No","Yes"] },
  ],
  Beauty: [
    { key: "brand",   label: "Brand",  type: "text" },
    { key: "shade",   label: "Shade",  type: "text", buyerPick: true },
    { key: "volume",  label: "Volume", type: "text" },
  ],
  Food: [
    { key: "weight",     label: "Uzito · Weight", type: "text" },
    { key: "ingredients",label: "Viungo · Ingredients", type: "text" },
    { key: "spice_level",label: "Ukali · Spice", type: "select",
      options: ["None","Mild","Medium","Hot","Extra hot"], buyerPick: true },
  ],
  Drinks: [
    { key: "volume",  label: "Volume", type: "text", buyerPick: true },
    { key: "alcohol", label: "Alcohol %", type: "number" },
  ],
  Books: [
    { key: "author",   label: "Mwandishi · Author", type: "text" },
    { key: "language", label: "Lugha · Language", type: "text" },
    { key: "format",   label: "Format", type: "select", options: ["Paperback","Hardcover","eBook","Audiobook"], buyerPick: true },
  ],
};

export function getAttributeSchema(category?: string | null): AttributeField[] {
  if (!category) return [];
  return ATTRIBUTE_SCHEMAS[category] ?? [];
}

/** Fields the buyer needs to pick at order time (size/color/storage etc.). */
export function getBuyerPickFields(category?: string | null, attrs?: Record<string, any>): AttributeField[] {
  return getAttributeSchema(category).filter((f) => {
    if (!f.buyerPick) return false;
    if (!attrs) return true;
    const v = attrs[f.key];
    if (Array.isArray(v)) return v.length > 0;
    return v != null && v !== "";
  });
}
