# Environnement de test (staging)

Objectif : tester les changements sur une copie de la base sans toucher aux vraies données.

1. Créez un second projet Supabase gratuit (organisation « jojo tech free », région eu-west-3),
   nommé `miyashi-staging`. Le plan gratuit autorise deux projets actifs.
2. Appliquez les migrations dans l'ordre :
   `supabase link --project-ref <ref-staging> && supabase db push`
   (ou demandez à Claude de les rejouer : cela vérifie aussi qu'une base neuve est identique à la production).
3. Déployez les fonctions : `supabase functions deploy --project-ref <ref-staging>`.
4. Dans Vercel → Settings → Environment Variables, pour l'environnement **Preview** uniquement :
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` du projet de test.
   Les aperçus de branches utiliseront alors la base de test ; la production reste inchangée.
5. Dans GitHub → Settings → Secrets : `SUPABASE_ACCESS_TOKEN` et `SUPABASE_PROJECT_REF=<ref-staging>`
   pour que la CI rejoue le scénario SQL sur la base de test.
