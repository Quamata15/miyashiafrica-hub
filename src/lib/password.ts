// Mirrors the Supabase Auth policy: 8+ characters with lower case, upper case and a digit.
export function passwordProblems(pw: string): string[] {
  const p: string[] = [];
  if (pw.length < 8) p.push("8 caractères minimum");
  if (!/[a-z]/.test(pw)) p.push("une minuscule");
  if (!/[A-Z]/.test(pw)) p.push("une majuscule");
  if (!/[0-9]/.test(pw)) p.push("un chiffre");
  return p;
}
