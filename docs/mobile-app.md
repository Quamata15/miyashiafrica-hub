# Application mobile MIYASHI (Android et iOS)

MIYASHI s'installe déjà comme application web (PWA) depuis `/install`. Pour publier sur
Google Play et l'App Store, le même site est emballé avec Capacitor.

## Android (Google Play)

Il faut Android Studio sur un ordinateur (Windows, macOS ou Linux) et un compte
Google Play Console (25 $, une fois).

```bash
npm install
npx cap add android        # une seule fois : crée le dossier android/
npm run mobile:android     # construit le site, copie dans android/ et ouvre Android Studio
```

Dans Android Studio : *Build → Generate Signed App Bundle*, puis envoyez le fichier `.aab`
dans la Play Console. Gardez précieusement la clé de signature.

### Sans Android Studio : construction automatique sur GitHub

Le dossier `android/` est dans le dépôt (icônes MIYASHI, autorisations position, appareil
photo et micro). Le workflow `.github/workflows/android.yml` produit le fichier `.aab` signé.

1. Créez une fois la clé d'envoi (sur n'importe quel ordinateur avec Java) :
   `keytool -genkeypair -v -keystore upload.jks -alias miyashi -keyalg RSA -keysize 2048 -validity 10000`
2. Dans GitHub → *Settings → Secrets and variables → Actions* :
   - secrets : `ANDROID_KEYSTORE_BASE64` (résultat de `base64 -w0 upload.jks`),
     `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`miyashi`), `ANDROID_KEY_PASSWORD` ;
   - variables : `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` (valeurs publiques).
3. *Actions → Android → Run workflow* (ou poussez une étiquette `v1.0.0`). Le `.aab` se
   télécharge dans les artefacts du run ; envoyez-le dans la Play Console.

Activez « Signature d'application par Google Play » : si la clé d'envoi est perdue, Google
peut la remplacer. Ne mettez jamais `upload.jks` ni ses mots de passe dans le dépôt.

## iOS (App Store)

Il faut un Mac avec Xcode et un compte Apple Developer (99 $/an).

```bash
npm install --save-dev @capacitor/ios@7
npx cap add ios
npm run mobile:sync && npx cap open ios
```

## Après chaque mise à jour du site

`npm run mobile:sync`, puis publiez une nouvelle version dans les stores.

## Mode économie de données

Activé automatiquement sur les réseaux 2G et quand le téléphone demande d'économiser les
données ; réglable dans *Préférences*. Images plus légères et animations coupées.
