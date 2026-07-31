import { useEffect, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { useI18nStore, LANGUAGE_LABELS, type Language } from "@/lib/i18n";

const LANGUAGES: Language[] = ["en", "or", "am"];

export function LanguageSwitcher({ align = "right" }: { align?: "left" | "right" }) {
  const language = useI18nStore((s) => s.language);
  const setLanguage = useI18nStore((s) => s.setLanguage);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Change language"
      >
        <Globe className="h-4 w-4" />
        <span className="max-w-28 truncate">{LANGUAGE_LABELS[language]}</span>
      </button>
      {open && (
        <div
          className={`absolute top-full mt-2 w-44 rounded-xl border border-border bg-card py-1 shadow-lg z-50 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => {
                setLanguage(lang);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-4 py-2 text-sm transition-colors hover:bg-accent ${
                lang === language ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {LANGUAGE_LABELS[lang]}
              {lang === language && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
