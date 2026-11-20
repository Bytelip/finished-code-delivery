import { memo, useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Localizes static and generated UI copy while keeping readable English in place
 * until a cached or online translation is available.
 */
export function useLocalizedValue(text: string, fallback?: string) {
  const { language, t, translateAsync } = useLanguage();
  const english = fallback ?? text;
  const immediate = t(text, english);
  const [resolved, setResolved] = useState({
    language: "en",
    source: text,
    value: immediate,
  });

  useEffect(() => {
    let current = true;
    if (language === "en" || immediate !== english) {
      setResolved((prev) => {
        if (prev.language === language && prev.source === text && prev.value === immediate) return prev;
        return { language, source: text, value: immediate };
      });
      return () => {
        current = false;
      };
    }

    translateAsync(english, language).then((value) => {
      if (current) {
        setResolved((prev) => {
          if (prev.language === language && prev.source === text && prev.value === value) return prev;
          return { language, source: text, value };
        });
      }
    });

    return () => {
      current = false;
    };
  }, [english, immediate, language, text, translateAsync]);

  return resolved.language === language && resolved.source === text ? resolved.value : immediate;
}

export const LocalizedText = memo(function LocalizedText({
  text,
  fallback,
}: {
  text: string;
  fallback?: string;
}) {
  return useLocalizedValue(text, fallback);
});
