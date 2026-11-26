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
