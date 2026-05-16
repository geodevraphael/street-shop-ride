import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LipaProviderPicker } from "./LipaProviderPicker";
import {
  ACCOUNT_TYPE_LABELS,
  getProvider,
  type AccountType,
  type PaymentProvider,
} from "@/lib/payment-providers";
import { uploadFile } from "@/lib/upload";
import { Loader2, Upload } from "lucide-react";

export type LipaFormValue = {
  provider: string;
  account_type: AccountType;
  number: string;
  account_name: string;
  instructions: string;
  qr_code_url: string | null;
  is_default: boolean;
  active: boolean;
};

export const EMPTY_LIPA: LipaFormValue = {
  provider: "",
  account_type: "wallet",
  number: "",
  account_name: "",
  instructions: "",
  qr_code_url: null,
  is_default: false,
  active: true,
};

export function LipaNumberForm({
  value,
  onChange,
  userId,
  onSubmit,
  submitLabel = "Hifadhi",
  busy = false,
}: {
  value: LipaFormValue;
  onChange: (v: LipaFormValue) => void;
  userId: string;
  onSubmit?: () => void;
  submitLabel?: string;
  busy?: boolean;
}) {
  const provider: PaymentProvider | null = value.provider ? getProvider(value.provider) : null;
  const [uploading, setUploading] = useState(false);

  const pickProvider = (p: PaymentProvider) => {
    onChange({
      ...value,
      provider: p.key,
      account_type: p.accountTypes[0],
    });
  };

  const pickFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    const url = await uploadFile("qr-codes", userId, file, "qr");
    setUploading(false);
    if (url) onChange({ ...value, qr_code_url: url });
  };

  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-2 block">Chagua mtoa-huduma</Label>
        <LipaProviderPicker value={value.provider || null} onChange={pickProvider} />
      </div>

      {provider && (
        <div className="space-y-3 rounded-xl border p-4">
          <div
            className="-m-4 mb-2 rounded-t-xl px-4 py-2 text-sm font-semibold"
            style={{ background: provider.bg, color: provider.fg }}
          >
            {provider.name}
          </div>

          {provider.accountTypes.length > 1 && (
            <div>
              <Label>Aina ya akaunti</Label>
              <Select value={value.account_type} onValueChange={(v: any) => onChange({ ...value, account_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {provider.accountTypes.map((t) => (
                    <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>{provider.numberLabel}</Label>
            <Input
              value={value.number}
              onChange={(e) => onChange({ ...value, number: e.target.value })}
              placeholder={provider.numberPlaceholder}
              maxLength={32}
            />
          </div>

          <div>
            <Label>Jina la mpokeaji (kama linavyoonekana kwenye M-Pesa/Benki)</Label>
            <Input
              value={value.account_name}
              onChange={(e) => onChange({ ...value, account_name: e.target.value })}
              placeholder="mfano: ASHA J MWANGI"
              maxLength={120}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Hii itaonekana kwa mteja akilipa. Saidia kujenga imani.
            </p>
          </div>

          <div>
            <Label>Maelekezo ya ziada (hiari)</Label>
            <Textarea
              rows={2}
              value={value.instructions}
              onChange={(e) => onChange({ ...value, instructions: e.target.value })}
              placeholder="mfano: Andika jina la duka kwenye reference"
              maxLength={240}
            />
          </div>

          <div>
            <Label>Picha ya QR (hiari)</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            {value.qr_code_url && (
              <img src={value.qr_code_url} alt="QR" className="mt-2 h-24 w-24 rounded border object-contain" />
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={value.is_default}
              onCheckedChange={(c) => onChange({ ...value, is_default: !!c })}
            />
            <span>Weka kama njia chaguo-msingi</span>
          </label>

          {onSubmit && (
            <Button onClick={onSubmit} disabled={busy || !value.number.trim()} className="w-full gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {submitLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
