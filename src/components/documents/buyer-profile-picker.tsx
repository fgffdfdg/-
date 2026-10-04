"use client";

import { useState, useCallback, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export interface BuyerProfile {
  id: string;
  buyerName: string;
  buyerNameEn?: string;
  address?: string;
  addressEn?: string;
  country?: string;
  countryEn?: string;
  phone?: string;
  email?: string;
}

interface BuyerProfilePickerProps {
  current: BuyerProfile;
  onPick: (profile: BuyerProfile) => void;
  size?: "sm" | "xs";
  label?: string;
}

export function BuyerProfilePicker({ current, onPick, size = "sm", label }: BuyerProfilePickerProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<BuyerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchProfiles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/buyer-profiles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || []);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open) fetchProfiles();
  }, [open, fetchProfiles]);

  const handleSave = async () => {
    if (!token || !current.buyerName) return;
    setSaving(true);
    try {
      const res = await fetch("/api/buyer-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          buyerName: current.buyerName,
          buyerNameEn: current.buyerNameEn,
          address: current.address,
          addressEn: current.addressEn,
          country: current.country,
          countryEn: current.countryEn,
          phone: current.phone,
          email: current.email,
        }),
      });
      if (res.ok) {
        await fetchProfiles();
      }
    } finally {
      setSaving(false);
    }
  };

  const btnSize = size === "xs" ? "h-7 text-xs px-2" : "h-8 text-sm px-3";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size={size === "xs" ? "sm" : "default"} className={`${btnSize} gap-1.5`}>
          <Building2 className="h-3.5 w-3.5" />
          {label || "买方档案"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium">买方档案</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={handleSave}
            disabled={saving || !current.buyerName}
          >
            <Plus className="h-3 w-3" />
            {saving ? "保存中..." : "保存当前"}
          </Button>
        </div>
        <div className="max-h-56 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground text-center">加载中...</div>
          ) : profiles.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              暂无保存的买方档案
              <br />
              <span className="text-xs">填写后点击"保存当前"</span>
            </div>
          ) : (
            profiles.map((p) => (
              <button
                key={p.id}
                className="w-full text-left px-3 py-2.5 hover:bg-muted/50 flex items-start gap-2 border-b border-border/50 last:border-0"
                onClick={() => {
                  onPick(p);
                  setOpen(false);
                }}
              >
                <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.buyerName}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[p.country, p.phone].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}