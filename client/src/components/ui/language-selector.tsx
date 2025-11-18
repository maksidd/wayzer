
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export function LanguageSelector() {
  const [selectedLanguage, setSelectedLanguage] = useState("English");

  const languages = [
    { code: "ru", name: "Russian" },
    { code: "en", name: "English" },
    { code: "fr", name: "Français" },
    { code: "zh", name: "中文" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="default" className="p-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white [&_svg]:!size-5">
          <Globe className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => setSelectedLanguage(language.name)}
            className={selectedLanguage === language.name ? "bg-blue-50 dark:bg-blue-900" : ""}
          >
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
