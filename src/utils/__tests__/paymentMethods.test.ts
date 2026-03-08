import { describe, it, expect } from "vitest";
import { paymentsByCountry, getCountryKeys, getDefaultCountry } from "@/utils/paymentMethods";

describe("paymentMethods", () => {
  it("should have Togo as default country", () => {
    expect(getDefaultCountry()).toBe("togo");
  });

  it("should return all country keys", () => {
    const keys = getCountryKeys();
    expect(keys).toContain("togo");
    expect(keys).toContain("senegal");
    expect(keys).toContain("cote_ivoire");
    expect(keys.length).toBeGreaterThanOrEqual(8);
  });

  it("should have TMoney for Togo", () => {
    const togo = paymentsByCountry.togo;
    expect(togo.prefix).toBe("+228");
    expect(togo.methods.some(m => m.id === "tmoney")).toBe(true);
  });

  it("should have card payment for every country", () => {
    for (const key of getCountryKeys()) {
      const country = paymentsByCountry[key];
      expect(country.methods.some(m => m.id === "card")).toBe(true);
    }
  });

  it("should have Wave for Senegal", () => {
    expect(paymentsByCountry.senegal.methods.some(m => m.id === "wave")).toBe(true);
  });
});
