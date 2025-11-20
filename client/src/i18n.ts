import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "@/locales/en/common.json";
import enTrips from "@/locales/en/trips.json";
import enPages from "@/locales/en/pages.json";
import ruCommon from "@/locales/ru/common.json";
import ruTrips from "@/locales/ru/trips.json";
import ruPages from "@/locales/ru/pages.json";

const resources = {
  en: {
    common: enCommon,
    trips: enTrips,
    pages: enPages,
  },
  ru: {
    common: ruCommon,
    trips: ruTrips,
    pages: ruPages,
  },
};

const getInitialLanguage = () => {
  if (typeof window === "undefined") {
    return "en";
  }
  return localStorage.getItem("appLanguage") ?? "en";
};

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: "en",
    supportedLngs: ["en", "ru"],
    interpolation: {
      escapeValue: false,
    },
    defaultNS: "common",
    ns: ["common", "trips", "pages"],
    returnEmptyString: false,
  });

export default i18n;

