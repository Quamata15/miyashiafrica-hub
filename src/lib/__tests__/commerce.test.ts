import { describe, expect, it } from "vitest";
import { unitPrice, type Tier, type Variant } from "@/components/commerce/ProductExtras";
import { parseCsv } from "@/components/seller/SellerTools";
import { openState } from "@/lib/hours";
import { passwordProblems } from "@/lib/password";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { compareList, COMPARE_MAX, recentlyViewed } from "@/lib/local-lists";

const variant = (price: number | null): Variant => ({ id: "v", label: "Rouge", options: {}, price, stock: 5, is_active: true });

describe("unitPrice (variants and wholesale tiers)", () => {
  const tiers: Tier[] = [{ min_qty: 5, unit_price: 10500 }, { min_qty: 20, unit_price: 9500 }];
  it("uses the base price without variant or tier", () => expect(unitPrice(12000, null, [], 1)).toBe(12000));
  it("uses the variant price when set", () => expect(unitPrice(12000, variant(15000), [], 1)).toBe(15000));
  it("falls back to the base price when the variant has no price", () => expect(unitPrice(12000, variant(null), [], 1)).toBe(12000));
  it("applies the best tier reached", () => {
    expect(unitPrice(12000, null, tiers, 4)).toBe(12000);
    expect(unitPrice(12000, null, tiers, 5)).toBe(10500);
    expect(unitPrice(12000, null, tiers, 25)).toBe(9500);
  });
  it("never raises the price above the list price", () => expect(unitPrice(9000, null, tiers, 25)).toBe(9000));
});

describe("parseCsv (bulk import)", () => {
  it("parses semicolon files with quotes and escaped quotes", () => {
    const rows = parseCsv('title;price;description\n"Pagne ""wax""";12000;"Coton; 6 yards"\nSac;7500;');
    expect(rows).toEqual([["title", "price", "description"], ['Pagne "wax"', "12000", "Coton; 6 yards"], ["Sac", "7500", ""]]);
  });
  it("parses comma files and CRLF line endings, skipping blank lines", () => {
    expect(parseCsv("a,b\r\n1,2\r\n\r\n3,4\r\n")).toEqual([["a", "b"], ["1", "2"], ["3", "4"]]);
  });
});

describe("openState (shop opening hours, GMT)", () => {
  const hours = { mon: [["08:00", "18:00"]] as [string, string][] };
  it("is open during hours", () => expect(openState(hours, new Date("2026-11-30T10:00:00Z"))?.open).toBe(true));   // Monday
  it("is closed after hours", () => expect(openState(hours, new Date("2026-11-30T19:00:00Z"))?.open).toBe(false));
  it("is closed on a day without hours", () => expect(openState(hours, new Date("2026-12-01T10:00:00Z"))).toEqual({ open: false, today: "fermé aujourd'hui" }));
  it("returns null when no hours are set", () => expect(openState({})).toBeNull());
});

describe("passwordProblems (matches the Supabase Auth policy)", () => {
  it("accepts a strong password", () => expect(passwordProblems("Marche2026")).toEqual([]));
  it("lists every missing rule", () => expect(passwordProblems("abc")).toEqual(["8 caractères minimum", "une majuscule", "un chiffre"]));
});

describe("oauthReturnPath (open redirect protection)", () => {
  it("keeps same-site paths", () => expect(oauthReturnPath("/devenir-point-relais?x=1#a")).toBe("/devenir-point-relais?x=1#a"));
  it("rejects other sites and tricks", () => {
    for (const bad of ["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", 42]) expect(oauthReturnPath(bad)).toBe("/");
  });
});

describe("local lists", () => {
  it("limits the comparison tray", () => {
    compareList.clear();
    for (let i = 0; i < COMPARE_MAX; i++) expect(compareList.toggle(`p${i}`)).toBe(true);
    expect(compareList.toggle("extra")).toBeNull();
    expect(compareList.toggle("p0")).toBe(false);
    expect(compareList.list()).toHaveLength(COMPARE_MAX - 1);
  });
  it("keeps recently viewed unique, most recent first", () => {
    recentlyViewed.add("a"); recentlyViewed.add("b"); recentlyViewed.add("a");
    expect(recentlyViewed.list().slice(0, 2)).toEqual(["a", "b"]);
  });
});
