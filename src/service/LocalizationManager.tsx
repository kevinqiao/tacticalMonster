import { useConvex } from "convex/react";
import React, { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { api } from "../convex/_generated/api";
const locales = [
  {
    locale: "en-US",
    eles: ["en-US", "en_US", "en", "en-us", "en-"],
  },
  {
    locale: "zh-CN",
    eles: ["zh-CN", "zh_CN", "zh", "zh-cn", "zh-"],
  },
  {
    locale: "zh-TW",
    eles: ["zh-TW", "zh_TW", "zh-tw", "tw"],
  },
];
interface IResourceContext {
  locale: string;
  resources: { [k: string]: { [k: string]: string } };
}
const ResourceContext = createContext<IResourceContext>({
  locale: "en-US",
  resources: {},
});

export const LocalizationProvider = ({ children }: { children: ReactNode }) => {
  const [resources, setResources] = useState<{ [k: string]: { [k: string]: string } }>({});
  const convex = useConvex();
  const [locale, setLocale] = useState<string>("en-US");
  console.log("locale provider");
  useEffect(() => {
    const handleLanguageChange = () => {
      const lan = navigator.language;
      const loc = locales.find((loc) => {
        if (loc.eles.includes(lan)) return true;
        else return false;
      });
      if (loc && loc.locale !== lan) setLocale(loc.locale);
    };
    window.addEventListener("languagechange", handleLanguageChange);
    handleLanguageChange();
    // Cleanup the event listener on component unmount
    return () => window.removeEventListener("languagechange", handleLanguageChange);
  }, []);
  useEffect(() => {
    const fetchResources = async (locale: string) => {
      const result: { [k: string]: { [k: string]: string } } = {};
      const res = await convex.query(api.localization.findByLocale, { locale });
      for (const r of res) {
        result[r.name] = r.data;
      }
      setResources(result);
    };

    if (locale) {
      fetchResources(locale);
    }
  }, [locale]);
  return <ResourceContext.Provider value={{ resources, locale }}> {children} </ResourceContext.Provider>;
};
const useLocalization = () => {
  return useContext(ResourceContext);
};

export default useLocalization;
