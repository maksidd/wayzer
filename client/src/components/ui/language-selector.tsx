
import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

const SUPPORTED_LANGUAGES = [
  { code: "en", labelKey: "language.english" },
  { code: "ru", labelKey: "language.russian" },
];

export function LanguageSelector() {
  const { t, i18n } = useTranslation("common");
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language ?? "en";

  const handleLanguageChange = (code: string) => {
    if (code === currentLanguage) {
      return;
    }
    void i18n.changeLanguage(code);
    if (typeof window !== "undefined") {
      localStorage.setItem("appLanguage", code);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="default"
          aria-label={t("language.change")}
          className="p-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white [&_svg]:!size-5"
        >
          <Globe className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={currentLanguage === language.code ? "bg-blue-50 dark:bg-blue-900" : ""}
          >
            {t(language.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
