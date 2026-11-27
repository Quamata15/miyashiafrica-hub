import { describe, expect, it } from "vitest";
import { evaluateAnswer } from "../../../supabase/functions/ai-assist/evaluate";

describe("evaluateAnswer (rules used when no AI key is set)", () => {
  const keywords = ["React", "résultat", "client"];

  it("rewards a structured, concrete answer that covers the expected points", () => {
    const good = evaluateAnswer(
      "Quand je travaillais chez une agence à Lomé, un client voulait une application de livraison. J'ai développé l'interface en React " +
      "et organisé les tests avec l'équipe. Le résultat : l'application a été livrée en six semaines et le client a gagné 30 % de commandes en plus.",
      keywords, 120, { duration_s: 50 });
    expect(good.score).toBeGreaterThanOrEqual(8);
    expect(good.structure).toEqual({ context: true, example: true, result: true });
    expect(good.keywords_hit).toEqual(["react", "resultat", "client"]);
  });

  it("scores a short, vague answer low and says why", () => {
    const weak = evaluateAnswer("Euh, je sais faire beaucoup de choses, euh, voilà.", keywords, 120);
    expect(weak.score).toBeLessThan(4);
    expect(weak.feedback).toMatch(/courte/);
    expect(weak.communication.hesitations).toBeGreaterThanOrEqual(2);
  });

  it("returns zero for an empty answer", () => {
    expect(evaluateAnswer("", keywords, 120).score).toBe(0);
  });

  it("gives no speech rate when the text cannot match the recording", () => {
    const long = "mot ".repeat(120);
    expect(evaluateAnswer(long, [], 120, { duration_s: 2 }).communication.words_per_minute).toBeNull();
    expect(evaluateAnswer(long, [], 120, { duration_s: 60, transcript_source: "saisie" }).communication.words_per_minute).toBeNull();
    expect(evaluateAnswer(long, [], 120, { duration_s: 60 }).communication.words_per_minute).toBe(120);
  });

  it("ignores accents and case when matching keywords", () => {
    expect(evaluateAnswer("Le RESULTAT final a plu au Client.", keywords, 60).keywords_hit).toEqual(["resultat", "client"]);
  });
});
