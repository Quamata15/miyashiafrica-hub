# Environnement de test (staging)

Objectif : tester les changements sur une copie de la base sans toucher aux vraies données.

1. Le projet de test existe : `miyashi-staging`, réf. `brflszgaqoketsvyyluv` (organisation
   « jojo tech free », région eu-west-3, plan gratuit).
2. Ajoutez dans GitHub → Settings → Secrets → Actions le secret `SUPABASE_ACCESS_TOKEN`
   (Supabase → Account → Access tokens). Le workflow **Staging** rejoue alors les migrations,
   déploie les fonctions et lance les scénarios SQL sur le projet de test, à chaque modification
   de `supabase/` (ou via *Actions → Staging → Run workflow*). La production n'est jamais visée :
   `scripts/staging-sync.sh` refuse la réf. de production.
3. Les secrets des fonctions (Resend, WhatsApp, SMS) ne sont pas copiés : mettez des clés de test
   dans le tableau de bord du projet de test si besoin.
4. Dans Vercel → Settings → Environment Variables, pour l'environnement **Preview** uniquement :
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` du projet de test.
   Les aperçus de branches utiliseront alors la base de test ; la production reste inchangée.
5. Pour que la CI principale teste aussi sur la base de test, ajoutez le secret
   `SUPABASE_PROJECT_REF=brflszgaqoketsvyyluv`.
