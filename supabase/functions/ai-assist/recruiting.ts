// Recruiting assistance for MIYASHI recruiters.
//   screen_application  — summary of one application: strengths, gaps, questions to ask
//   screen_job          — same for the job's applications that have no summary yet (15 per call)
//   interview_questions — interview questions for a job (competency, keywords, time per answer)
//   interview_report    — evaluation of a recorded interview, answer by answer, then overall
// Every action works without an AI key (rules on the job criteria and the transcripts) and is
// richer with one. The AI only judges job-related content: never appearance, accent, emotions,
// age, gender or origin. The recruiter always decides.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { aiConfigured, askJSON } from "../_shared/ai.ts";
import { evaluateAnswer } from "./evaluate.ts";

type Db = SupabaseClient;
type Json = Record<string, any>;

const FAIRNESS = `Règles d'équité : juge uniquement les compétences, l'expérience et le contenu des réponses en lien avec le poste.
N'utilise jamais et ne déduis jamais l'âge, le genre, l'origine, la religion, la situation familiale, l'apparence, l'accent, le handicap
ni l'état émotionnel. Ne fais pas d'hypothèse sur ce qui n'est pas écrit. Ton avis aide le recruteur, il ne décide pas à sa place.`;

const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export const RECRUITING_ACTIONS = new Set(["screen_application", "screen_job", "interview_questions", "interview_report"]);

export async function recruiting(db: Db, userId: string, action: string, body: Json, useAI: () => Promise<boolean>) {
  switch (action) {
    case "screen_application": return screenApplication(db, userId, String(body.application_id ?? ""), useAI);
    case "screen_job": return screenJob(db, userId, String(body.job_id ?? ""), useAI);
    case "interview_questions": return interviewQuestions(db, userId, body, useAI);
    case "interview_report": return interviewReport(db, userId, String(body.interview_id ?? ""), useAI);
  }
  throw new Error("Action inconnue");
}

// ---------------------------------------------------------------- screening

async function loadApplication(db: Db, userId: string, id: string) {
  const { data: app } = await db.from("applications")
    .select("id, job_id, freelance_id, cover_letter, proposed_rate, expected_salary, answers, match_score, match_breakdown, knocked_out, stage")
    .eq("id", id).maybeSingle();
  if (!app) throw new Error("Candidature introuvable");
  const { data: job } = await db.from("jobs").select("*").eq("id", app.job_id).maybeSingle();
  if (!job || job.employer_id !== userId) throw new Error("Accès refusé");
  const { data: fp } = await db.from("freelance_profiles")
    .select("title, bio, skills, experience_years, languages, location, education, cv_text, portfolio_urls").eq("user_id", app.freelance_id).maybeSingle();
  return { app, job, fp };
}

function rulesSummary(job: Json, app: Json) {
  const b = app.match_breakdown ?? {};
  const strengths: string[] = [];
  const concerns: string[] = [];
  const matched: string[] = b.skills?.matched ?? [];
  const missing: string[] = b.skills?.missing ?? [];
  if (matched.length) strengths.push(`Compétences demandées présentes : ${matched.join(", ")}`);
  if ((b.nice_to_have?.matched ?? []).length) strengths.push(`Atouts en plus : ${b.nice_to_have.matched.join(", ")}`);
  if (b.experience && b.experience.have >= b.experience.required && b.experience.required > 0) strengths.push(`${b.experience.have} ans d'expérience pour ${b.experience.required} demandés`);
  if (b.languages?.points === b.languages?.max && (b.languages?.required ?? []).length) strengths.push("Parle les langues demandées");
  if (b.location?.points === 10 && job.remote_mode !== "remote" && job.location) strengths.push(`Basé(e) près du lieu de travail (${job.location})`);
  if (missing.length) concerns.push(`Compétences non trouvées dans le profil : ${missing.join(", ")}`);
  if (b.experience && b.experience.have < b.experience.required) concerns.push(`${b.experience.have} an(s) d'expérience pour ${b.experience.required} demandés`);
  for (const f of b.screening?.failed ?? []) concerns.push(`Question éliminatoire « ${f.text} » : répondu « ${f.answer || "—"} », attendu ${f.expected}`);
  if ((b.screening?.unanswered ?? 0) > 0) concerns.push("Questions obligatoires sans réponse");
  if ((app.cover_letter ?? "").length < 120) concerns.push("Message de candidature très court");
  const score = app.match_score ?? 0;
  const recommendation = app.knocked_out ? "pas adapté" : score >= 75 ? "à rencontrer" : score >= 50 ? "à étudier" : "pas adapté";
  const questions = [
    ...missing.slice(0, 3).map((s) => `Avez-vous déjà travaillé avec ${s} ? Donnez un exemple concret.`),
    "Quel projet récent représente le mieux votre travail, et quel était votre rôle exact ?",
    "Quand pourriez-vous commencer, et quelles sont vos attentes ?",
  ].slice(0, 4);
  return {
    summary: `Correspondance ${score}/100 avec l'offre « ${job.title} ».` + (app.knocked_out ? " Une question éliminatoire n'est pas remplie." : ""),
    strengths, concerns, questions, recommendation, fit_score: score, source: "regles",
  };
}

async function screenApplication(db: Db, userId: string, id: string, useAI: () => Promise<boolean>) {
  const { app, job, fp } = await loadApplication(db, userId, id);
  let result: Json = rulesSummary(job, app);
  if (await useAI()) {
    const questions = (job.screening_questions ?? []).map((q: Json) => `- ${q.text} → ${app.answers?.[q.id] ?? "(pas de réponse)"}`).join("\n");
    const ai = await askJSON<Json>(
      `Tu aides un recruteur de MIYASHI (Afrique de l'Ouest) à trier des candidatures. Écris en français clair et concis.
${FAIRNESS}
Donne : un résumé de 2 phrases, 2 à 5 points forts et 0 à 5 points d'attention étayés par le dossier, 3 questions d'entretien ciblées
sur les points à vérifier, une recommandation et une note de correspondance de 0 à 100. Le score calculé par règles est un repère, pas une vérité.`,
      `OFFRE : ${job.title} (${job.contract_type}, ${job.remote_mode}${job.location ? ", " + job.location : ""})
Description : ${(job.description ?? "").slice(0, 3000)}
Compétences demandées : ${(job.skills_required ?? []).join(", ")} — atouts : ${(job.nice_to_have ?? []).join(", ")}
Expérience minimale : ${job.experience_min ?? 0} ans — langues : ${(job.languages ?? []).join(", ")}

CANDIDAT : ${fp?.title ?? "(pas de profil)"} — ${fp?.experience_years ?? 0} ans d'expérience
Compétences : ${(fp?.skills ?? []).join(", ")} — langues : ${(fp?.languages ?? []).join(", ")}
Formation : ${fp?.education ?? "—"}
Présentation : ${(fp?.bio ?? "").slice(0, 1500)}
CV (extrait) : ${(fp?.cv_text ?? "").slice(0, 6000)}
Message de candidature : ${(app.cover_letter ?? "").slice(0, 3000)}
Réponses aux questions :
${questions || "(aucune)"}
Score par règles : ${app.match_score}/100 — détail : ${JSON.stringify(app.match_breakdown).slice(0, 1500)}`,
      {
        type: "object", additionalProperties: false,
        required: ["summary", "strengths", "concerns", "questions", "recommendation", "fit_score"],
        properties: {
          summary: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          concerns: { type: "array", items: { type: "string" } },
          questions: { type: "array", items: { type: "string" } },
          recommendation: { type: "string", enum: ["à rencontrer", "à étudier", "pas adapté"] },
          fit_score: { type: "integer" },
        },
      },
      { effort: "low", maxTokens: 2500 },
    );
    if (ai) result = { ...ai, fit_score: clamp(Math.round(ai.fit_score), 0, 100), source: "ia" };
  }
  result.generated_at = new Date().toISOString();
  await db.from("applications").update({ ai_summary: result }).eq("id", id);
  await db.from("application_events").insert({ application_id: id, actor_id: userId, kind: "ai", internal: true,
    body: `Analyse ${result.source === "ia" ? "IA" : "automatique"} : ${result.recommendation} (${result.fit_score}/100)` });
  return result;
}

async function screenJob(db: Db, userId: string, jobId: string, useAI: () => Promise<boolean>) {
  const { data: job } = await db.from("jobs").select("id, employer_id").eq("id", jobId).maybeSingle();
  if (!job || job.employer_id !== userId) throw new Error("Accès refusé");
  const { data: apps } = await db.from("applications").select("id").eq("job_id", jobId).is("ai_summary", null)
    .not("stage", "in", "(rejected,withdrawn)").order("match_score", { ascending: false }).limit(15);
  let done = 0;
  for (const a of apps ?? []) {
    try { await screenApplication(db, userId, a.id, useAI); done++; } catch (e) { console.error("screen_job", a.id, e); }
  }
  const { count } = await db.from("applications").select("id", { count: "exact", head: true }).eq("job_id", jobId).is("ai_summary", null)
    .not("stage", "in", "(rejected,withdrawn)");
  return { done, remaining: count ?? 0 };
}

// ---------------------------------------------------------------- interview questions

function rulesQuestions(job: Json, count: number) {
  const skills: string[] = (job.skills_required ?? []).slice(0, 4);
  const qs: Json[] = [
    { text: `Présentez-vous et expliquez ce qui vous attire dans ce poste de ${job.title}.`, competency: "Motivation", keywords: ["expérience", "projet", "motivation"], seconds: 120 },
    ...skills.map((s) => ({ text: `Décrivez un travail récent où vous avez utilisé ${s} : le besoin, ce que vous avez fait et le résultat.`, competency: s, keywords: [s, "résultat", "projet"], seconds: 150 })),
    { text: "Racontez une situation difficile avec un client ou un collègue et comment vous l'avez résolue.", competency: "Relationnel", keywords: ["écoute", "solution", "communication"], seconds: 120 },
    { text: "Comment organisez-vous votre travail quand plusieurs tâches urgentes arrivent en même temps ?", competency: "Organisation", keywords: ["priorité", "planning", "délai"], seconds: 120 },
    { text: "Quelles sont vos disponibilités et vos attentes pour ce poste ?", competency: "Disponibilité", keywords: ["disponible", "date", "tarif", "salaire"], seconds: 90 },
  ];
  return qs.slice(0, count).map((q, i) => ({ id: `q${i + 1}`, ...q }));
}

async function interviewQuestions(db: Db, userId: string, body: Json, useAI: () => Promise<boolean>) {
  const count = clamp(Number(body.count ?? 6), 3, 10);
  let job: Json = { title: String(body.title ?? "").slice(0, 120), description: String(body.description ?? "").slice(0, 3000), skills_required: Array.isArray(body.skills) ? body.skills.slice(0, 15) : [] };
  if (body.job_id) {
    const { data } = await db.from("jobs").select("*").eq("id", body.job_id).maybeSingle();
    if (!data || data.employer_id !== userId) throw new Error("Accès refusé");
    job = data;
  }
  if (!job.title) throw new Error("Indiquez l'intitulé du poste");
  if (await useAI()) {
    const ai = await askJSON<{ questions: Json[] }>(
      `Tu prépares un entretien enregistré pour un recruteur de MIYASHI (Afrique de l'Ouest). Écris en français simple, vouvoiement.
${FAIRNESS}
Pose ${count} questions ouvertes, une seule idée par question, qui font raconter des situations vécues (méthode situation, action, résultat)
et vérifient les compétences du poste. Aucune question sur la vie privée, l'âge, la famille, la religion, l'origine ou la santé.
Pour chaque question : la compétence évaluée, 3 à 6 mots-clés attendus dans une bonne réponse, et une durée de réponse entre 60 et 240 secondes.`,
      `Poste : ${job.title}\nDescription : ${job.description ?? ""}\nCompétences : ${(job.skills_required ?? []).join(", ")}\nExpérience minimale : ${job.experience_min ?? 0} ans`,
      {
        type: "object", additionalProperties: false, required: ["questions"],
        properties: { questions: { type: "array", items: { type: "object", additionalProperties: false, required: ["text", "competency", "keywords", "seconds"],
          properties: { text: { type: "string" }, competency: { type: "string" }, keywords: { type: "array", items: { type: "string" } }, seconds: { type: "integer" } } } } },
      },
      { effort: "low", maxTokens: 3000 },
    );
    if (ai?.questions?.length) {
      return { source: "ia", questions: ai.questions.slice(0, count).map((q, i) => ({ id: `q${i + 1}`, text: q.text.slice(0, 500), competency: q.competency.slice(0, 60), keywords: q.keywords.slice(0, 8), seconds: clamp(q.seconds, 60, 240) })) };
    }
  }
  return { source: "regles", questions: rulesQuestions(job, count) };
}

// ---------------------------------------------------------------- interview report

async function interviewReport(db: Db, userId: string, id: string, useAI: () => Promise<boolean>) {
  const { data: iv } = await db.from("interviews").select("*").eq("id", id).maybeSingle();
  if (!iv || (iv.employer_id !== userId && iv.candidate_id !== userId)) throw new Error("Entretien introuvable");
  if (iv.kind !== "ai") throw new Error("Rapport disponible pour les entretiens enregistrés");
  if (iv.status !== "completed") throw new Error("L'entretien n'est pas terminé");
  const { data: answers } = await db.from("interview_answers").select("*").eq("interview_id", id);
  const { data: job } = await db.from("jobs").select("title, description, skills_required").eq("id", iv.job_id).maybeSingle();
  const qs: Json[] = iv.questions ?? [];

  const evals = new Map<string, Json>();
  for (const a of answers ?? []) {
    const q = qs.find((x) => x.id === a.question_id) ?? {};
    evals.set(a.question_id, evaluateAnswer(a.transcript ?? "", q.keywords ?? [], q.seconds ?? 120, { ...a.metrics, duration_s: a.metrics?.speaking_s ?? a.duration_s }));
  }

  let overall: Json | null = null;
  if (await useAI()) {
    const ai = await askJSON<Json>(
      `Tu évalues un entretien enregistré pour un recruteur de MIYASHI. Écris en français, de façon factuelle et bienveillante.
${FAIRNESS}
Les réponses ont été transcrites automatiquement : ignore les fautes de transcription, l'orthographe et les hésitations.
Pour chaque réponse : une note de 0 à 10 sur la pertinence et la précision par rapport à la question, et un retour d'une phrase.
Puis un bilan : note globale de 0 à 100, notes par compétence (0 à 5), 2 à 4 points forts, 0 à 4 points à approfondir, une recommandation.`,
      `Poste : ${job?.title} — compétences : ${(job?.skills_required ?? []).join(", ")}\n\n` +
        qs.map((q) => {
          const a = (answers ?? []).find((x) => x.question_id === q.id);
          return `[${q.id}] (${q.competency || "général"}) ${q.text}\nMots-clés attendus : ${(q.keywords ?? []).join(", ")}\nRéponse : ${(a?.transcript ?? "(pas de réponse)").slice(0, 4000)}`;
        }).join("\n\n"),
      {
        type: "object", additionalProperties: false, required: ["answers", "score", "competencies", "strengths", "concerns", "recommendation", "summary"],
        properties: {
          answers: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "score", "feedback"],
            properties: { id: { type: "string" }, score: { type: "number" }, feedback: { type: "string" } } } },
          score: { type: "integer" },
          competencies: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "score"], properties: { name: { type: "string" }, score: { type: "number" } } } },
          strengths: { type: "array", items: { type: "string" } },
          concerns: { type: "array", items: { type: "string" } },
          recommendation: { type: "string", enum: ["à rencontrer", "à étudier", "pas adapté"] },
          summary: { type: "string" },
        },
      },
      { effort: "medium", maxTokens: 5000 },
    );
    if (ai) {
      for (const a of ai.answers ?? []) {
        const e = evals.get(a.id);
        if (e) evals.set(a.id, { ...e, score: clamp(Math.round(a.score * 10) / 10, 0, 10), feedback: a.feedback, source: "ia" });
      }
      overall = { ...ai, score: clamp(ai.score, 0, 100), source: "ia" };
      delete overall.answers;
    }
  }

  for (const [qid, e] of evals) await db.from("interview_answers").update({ evaluation: e }).eq("interview_id", id).eq("question_id", qid);

  const list = [...evals.values()];
  const avg = list.length ? list.reduce((s, e) => s + e.score, 0) / list.length : 0;
  const answeredRatio = qs.length ? list.length / qs.length : 0;
  if (!overall) {
    const byComp = new Map<string, number[]>();
    qs.forEach((q) => { const e = evals.get(q.id); if (e) byComp.set(q.competency || "Général", [...(byComp.get(q.competency || "Général") ?? []), e.score / 2]); });
    const score = Math.round(avg * 10 * (0.6 + 0.4 * answeredRatio));
    overall = {
      source: "regles", score,
      competencies: [...byComp].map(([name, v]) => ({ name, score: Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 })),
      strengths: list.filter((e) => e.score >= 7).length ? [`${list.filter((e) => e.score >= 7).length} réponse(s) précises et illustrées`] : [],
      concerns: [
        ...(answeredRatio < 1 ? [`${qs.length - list.length} question(s) sans réponse`] : []),
        ...(list.filter((e) => !e.structure.example).length > list.length / 2 ? ["Peu d'exemples concrets"] : []),
      ],
      recommendation: score >= 70 ? "à rencontrer" : score >= 45 ? "à étudier" : "pas adapté",
      summary: `Évaluation automatique sur ${list.length} réponse(s) : moyenne ${Math.round(avg * 10) / 10}/10. À confirmer en écoutant les enregistrements.`,
    };
  }
  const comm = list.map((e) => e.communication);
  const mean = (k: string) => { const v = comm.map((c) => Number(c[k])).filter((x) => Number.isFinite(x) && x > 0); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length * 10) / 10 : null; };
  const report = { ...overall, answered: list.length, questions: qs.length, generated_at: new Date().toISOString(),
    communication: { words_per_minute: mean("words_per_minute"), hesitations: comm.reduce((s, c) => s + (c.hesitations ?? 0), 0), latency_s: mean("latency_s"), speaking_ratio: mean("speaking_ratio") } };
  await db.from("interviews").update({ report }).eq("id", id);
  await db.from("application_events").insert({ application_id: iv.application_id, actor_id: userId, kind: "ai", internal: true,
    body: `Rapport d'entretien : ${report.recommendation} (${report.score}/100)` });
  return iv.employer_id === userId ? report : { ok: true };
}

export { aiConfigured };
