"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Building2, Plus, Check, Loader2 } from "lucide-react";
import { useOrg } from "@/lib/org";

export function OrgSwitcher() {
  const { organization, organizations, switchOrganization, isLoading } = useOrg();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitch = async (orgId: string) => {
    if (orgId === organization?.id) {
      setIsOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await switchOrganization(orgId);
      setIsOpen(false);
      // Refresh the page to reload data with new org context
      router.refresh();
    } catch (err) {
      console.error("Failed to switch organization:", err);
    } finally {
      setSwitching(false);
    }
  };

  // Don't render if not logged in or no orgs
  if (!organization && organizations.length === 0) {
    return null;
  }

  const orgName = organization?.name || "个人工作区";
  const orgInitial = orgName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching || isLoading}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.06] transition-colors group"
      >
        {/* Org Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-orange/80 to-orange/60 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
          {switching || isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            orgInitial
          )}
        </div>

        {/* Org Info */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-white/90 truncate">
            {orgName}
          </p>
          <p className="text-[11px] text-white/40 truncate">
            {organization?.plan_type === "free" ? "免费版" : 
             organization?.plan_type === "basic" ? "基础版" :
             organization?.plan_type === "pro" ? "专业版" : "企业版"}
          </p>
        </div>

        {/* Dropdown Arrow */}
        <ChevronDown
          className={`flex-shrink-0 w-4 h-4 text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              切换组织
            </p>
          </div>

          {/* Org List */}
          <div className="max-h-60 overflow-y-auto py-1">
            {organizations.map((org) => {
              const isActive = org.id === organization?.id;
              return (
                <button
                  key={org.id}
                  onClick={() => handleSwitch(org.id)}
                  disabled={switching}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors ${
                    isActive ? "bg-muted/30" : ""
                  }`}
                >
                  {/* Org Avatar */}
                  <div className="flex-shrink-0 w-7 h-7 rounded-md bg-gradient-to-br from-navy/60 to-navy/40 flex items-center justify-center text-white text-xs font-medium">
                    {org.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Org Name */}
                  <span className={`flex-1 text-left text-sm truncate ${
                    isActive ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}>
                    {org.name}
                  </span>

                  {/* Active Indicator */}
                  {isActive && (
                    <Check className="flex-shrink-0 w-4 h-4 text-orange" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Create New Org */}
          <div className="border-t border-border p-1">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/create-org");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-md border border-dashed border-border flex items-center justify-center">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm">创建新组织</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
