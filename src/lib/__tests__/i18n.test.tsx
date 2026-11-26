import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { I18nProvider, LanguageSwitch, useT } from "@/lib/i18n";

function Probe() {
  const { t } = useT();
  return <p>{t("Accueil")} / {t("Texte sans traduction")}</p>;
}

describe("i18n", () => {
  it("switches between French and English and keeps untranslated text", () => {
    localStorage.setItem("miyashi_ui_lang", "fr");
    render(<I18nProvider><Probe /><LanguageSwitch /></I18nProvider>);
    expect(screen.getByText("Accueil / Texte sans traduction")).toBeTruthy();
    act(() => screen.getByRole("button").click());
    expect(screen.getByText("Home / Texte sans traduction")).toBeTruthy();
    expect(document.documentElement.lang).toBe("en");
  });
});
