import { useEffect, useState } from "react";

const ATTR = "data-fosspad-theme";

/** Tracks the light/dark signal published by `applyTheme` in App.tsx. */
export function useMdxDarkMode(): boolean {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute(ATTR) === "dark"
  );

  useEffect(() => {
    const el = document.documentElement;
    const update = () => setDark(el.getAttribute(ATTR) === "dark");
    update();
    const observer = new MutationObserver(update);
    observer.observe(el, { attributes: true, attributeFilter: [ATTR] });
    return () => observer.disconnect();
  }, []);

  return dark;
}
