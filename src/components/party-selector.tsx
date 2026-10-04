"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

// Domain types
import type { Party } from "@/lib/domain";

/** Raw DB record from company_profiles */
interface CompanyProfileRecord {
  id: string;
  company_name: string | null;
  company_name_en: string | null;
  social_credit_code: string | null;
  legal_person: string | null;
  contact: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  country: string | null;
  country_code: string | null;
  key_no: string | null;
  address: string | null;
  address_en: string | null;
  is_default: boolean;
}

/** Convert a DB company_profiles record to domain Party */
export function companyProfileToParty(record: CompanyProfileRecord): Party {
  return {
    id: record.id,
    name: record.company_name || "",
    nameEn: record.company_name_en || undefined,
    code: record.social_credit_code || undefined,
    contact: record.contact || record.legal_person || undefined,
    phone: record.contact_phone || undefined,
    email: record.contact_email || undefined,
    address: record.address || undefined,
    addressEn: record.address_en || undefined,
    country: record.country || undefined,
    countryCode: record.country_code || undefined,
    keyNo: record.key_no || undefined,
  };
}

export interface PartySelectorProps {
  /** Label for the selector */
  label?: string;
  /** Placeholder text when nothing selected */
  placeholder?: string;
  /** Currently selected Party */
  value?: Party | null;
  /** Called when a Party is selected */
  onChange: (party: Party | null) => void;
  /** Optional CSS class */
  className?: string;
  /** Show "Add Company" link */
  showAddLink?: boolean;
}

export function PartySelector({
  label = "选择企业",
  placeholder = "搜索或选择企业档案...",
  value,
  onChange,
  className,
  showAddLink = true,
}: PartySelectorProps) {
  const { user, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<CompanyProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfiles = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await fetch("/api/company-profiles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        setProfiles(data || []);
      }
    } catch (error) {
      console.error("Failed to load company profiles:", error);
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const selectedLabel = value
    ? value.name || value.nameEn || "未命名企业"
    : placeholder;

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium">{label}</span>
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10 font-normal"
          >
            <span className={cn(value ? "" : "text-muted-foreground", "truncate")}>
              {value ? (
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{selectedLabel}</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0" />
                  {selectedLabel}
                </span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="搜索企业..." />
            <CommandList>
              <CommandEmpty>
                {loading ? "加载中..." : "未找到企业档案"}
              </CommandEmpty>
              <CommandGroup>
                {profiles.map((profile) => (
                  <CommandItem
                    key={profile.id}
                    value={profile.company_name || ""}
                    onSelect={() => {
                      onChange(companyProfileToParty(profile));
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === profile.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm">{profile.company_name || "未命名企业"}</span>
                      {profile.company_name_en && (
                        <span className="text-xs text-muted-foreground">{profile.company_name_en}</span>
                      )}
                    </div>
                    {profile.is_default && (
                      <span className="ml-auto text-xs text-muted-foreground">默认</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              {showAddLink && (
                <CommandGroup>
                  <CommandItem asChild>
                    <Link
                      href="/user-center?tab=company"
                      className="flex items-center gap-2 cursor-pointer text-muted-foreground"
                    >
                      <Plus className="h-4 w-4" />
                      添加新企业
                    </Link>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5">
          {value.code && <p>信用代码: {value.code}</p>}
          {value.keyNo && <p>电子钥匙: {value.keyNo}</p>}
          {value.address && <p className="truncate">{value.address}</p>}
        </div>
      )}
    </div>
  );
}