import { describe, it, expect } from "vitest";
import { filterMessage } from "@/utils/messageFilter";

describe("messageFilter", () => {
  it("should allow normal messages", () => {
    const result = filterMessage("Bonjour, comment allez-vous ?");
    expect(result.blocked).toBe(false);
  });

  it("should allow product discussion", () => {
    const result = filterMessage("Est-ce que le produit est disponible en rouge ?");
    expect(result.blocked).toBe(false);
  });

  it("should block phone numbers to protect platform", () => {
    const result = filterMessage("Appelez-moi au 90 12 34 56");
    expect(result.blocked).toBe(true);
  });

  it("should block email addresses", () => {
    const result = filterMessage("Écrivez-moi à test@gmail.com");
    expect(result.blocked).toBe(true);
  });

  it("should handle empty strings", () => {
    const result = filterMessage("");
    expect(result.blocked).toBe(false);
  });
});
