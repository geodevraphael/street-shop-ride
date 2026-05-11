import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function clean(phone?: string | null) {
  if (!phone) return null;
  const p = phone.replace(/[^\d+]/g, "");
  if (!p) return null;
  // Tanzania: 0XXXXXXXXX → 255XXXXXXXXX
  if (p.startsWith("0")) return "255" + p.slice(1);
  if (p.startsWith("+")) return p.slice(1);
  return p;
}

export function ContactActions({ phone, label, message }: { phone?: string | null; label: string; message?: string }) {
  const num = clean(phone);
  if (!num) return null;
  const wa = `https://wa.me/${num}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`tel:+${num}`}>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Phone className="h-4 w-4" /> Piga {label}
        </Button>
      </a>
      <a href={wa} target="_blank" rel="noreferrer">
        <Button size="sm" variant="outline" className="gap-1.5">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </Button>
      </a>
    </div>
  );
}
