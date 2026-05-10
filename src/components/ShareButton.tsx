import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Share2, Copy, Check, MessageCircle, Facebook, Send, Twitter, Mail } from "lucide-react";
import { toast } from "sonner";

type Props = {
  /** Path on this site, e.g. "/shops/abc" or "/products/xyz". Absolute URL also accepted. */
  url: string;
  title: string;
  text?: string;
  /** Render as an icon-only ghost button. Default: button with label. */
  iconOnly?: boolean;
  label?: string;
};

function absoluteUrl(url: string): string {
  if (typeof window === "undefined") return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function ShareButton({ url, title, text, iconOnly, label = "Shiriki" }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const fullUrl = absoluteUrl(url);
  const shareText = text ?? title;

  const tryNative = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text: shareText, url: fullUrl });
        return true;
      } catch {
        /* user cancelled — fall through to dialog */
      }
    }
    return false;
  };

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    const ok = await tryNative();
    if (!ok) setOpen(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success("Kiungo kimenakiliwa");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Imeshindikana kunakili");
    }
  };

  const enc = encodeURIComponent;
  const channels = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${enc(`${shareText} ${fullUrl}`)}`,
      color: "text-[#25D366]",
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(fullUrl)}`,
      color: "text-[#1877F2]",
    },
    {
      key: "x",
      label: "X / Twitter",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(fullUrl)}`,
      color: "text-foreground",
    },
    {
      key: "telegram",
      label: "Telegram",
      icon: Send,
      href: `https://t.me/share/url?url=${enc(fullUrl)}&text=${enc(shareText)}`,
      color: "text-[#26A5E4]",
    },
    {
      key: "email",
      label: "Email",
      icon: Mail,
      href: `mailto:?subject=${enc(title)}&body=${enc(`${shareText}\n\n${fullUrl}`)}`,
      color: "text-muted-foreground",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button variant="ghost" size="icon" onClick={onClick} aria-label={label}>
            <Share2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onClick}>
            <Share2 className="h-4 w-4" /> {label}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Shiriki · Share</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-2">
          {channels.map((c) => (
            <a
              key={c.key}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 rounded-xl border bg-card p-3 text-[11px] font-medium transition hover:border-primary"
              onClick={() => setOpen(false)}
            >
              <c.icon className={`h-5 w-5 ${c.color}`} />
              {c.label}
            </a>
          ))}
        </div>
        <button
          onClick={copy}
          className="mt-2 flex w-full items-center justify-between rounded-xl border bg-secondary px-3 py-2 text-sm transition hover:border-primary"
        >
          <span className="truncate text-muted-foreground">{fullUrl}</span>
          <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium">
            {copied ? <><Check className="h-3.5 w-3.5 text-success" /> Imenakiliwa</> : <><Copy className="h-3.5 w-3.5" /> Nakili</>}
          </span>
        </button>
      </DialogContent>
    </Dialog>
  );
}
