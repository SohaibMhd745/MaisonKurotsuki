# Maison Kurotsuki

Le lookbook et l'atelier de la Maison Kurotsuki : Next.js (App Router, TypeScript) sur Vercel, Supabase pour
la base, les comptes et les fichiers, skinview3d pour la 3D. Le cahier des charges est dans
`../SPECIFICATIONS.md`.

## Mise en route

### 1. Supabase

1. Créer un projet sur [supabase.com](https://supabase.com) (offre gratuite).
2. **SQL Editor** : exécuter `supabase/migrations/0001_maison.sql` (tables, règles d'accès, seaux de stockage,
   temps réel). Le script peut être rejoué sans risque.
3. Remplacer les deux identifiants Discord dans `supabase/membres.sql`, puis l'exécuter.
4. **Authentication > Sign In / Providers > Discord** : activer le fournisseur et coller l'identifiant et le
   secret de l'application Discord (étape 2).
5. **Authentication > URL Configuration** :
   - *Site URL* : l'adresse publique du site (ex. `https://maison-kurotsuki.vercel.app`) ;
   - *Redirect URLs* : `https://maison-kurotsuki.vercel.app/auth/callback` et
     `http://localhost:3000/auth/callback`.
6. **Authentication > Sessions** : laisser « Time-box user sessions » et « Inactivity timeout » désactivés.
   La session reste alors ouverte tant que le navigateur garde ses cookies (400 jours).

### 2. Application Discord

1. [Discord Developer Portal](https://discord.com/developers/applications) > *New Application*.
2. *OAuth2* > *Redirects* : ajouter `https://<projet>.supabase.co/auth/v1/callback` (l'adresse exacte est
   indiquée sur la page du fournisseur Discord dans Supabase).
3. Copier *Client ID* et *Client Secret* dans Supabase. Seules les permissions `identify` et `email` sont
   demandées.

### 3. Variables d'environnement

Copier `.env.example` vers `.env.local` et remplir :

| Variable | Où la trouver |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | même page, clé `anon` (publique) |
| `NEXT_PUBLIC_SITE_URL` | adresse publique du site |
| `CRON_SECRET` | une longue chaîne aléatoire |

La clé de service Supabase n'est pas utilisée : toutes les écritures passent par la session du membre et sont
contrôlées par les règles d'accès.

### 4. Lancer en local

```bash
npm install
npm run dev
```

### 5. Mettre en ligne sur Vercel

1. Importer le dépôt dans Vercel, avec `Application` comme *Root Directory*.
2. Ajouter les quatre variables d'environnement.
3. Déployer. La tâche quotidienne de `vercel.json` appelle `/api/veille` chaque matin : cette petite requête
   évite la mise en pause du projet Supabase gratuit.

Node 22 ou plus est recommandé : supabase-js annonce la fin du support de Node 20. Vercel utilise Node 22 par
défaut.

## Organisation

| Dossier | Contenu |
| --- | --- |
| `src/app` | Les pages : Foyer, Garde-robe, Lookbook, Jury, Coulisses, Connexion et les routes API |
| `src/components` | Composants, par espace (`lookbook/`, `jury/`, `coulisses/`…) |
| `src/lib/skin3d.ts` | Vue 3D, détection du gabarit, prise de vue des portraits et vignettes |
| `src/lib/verifications.ts` | Vérifications d'un skin, partagées entre le navigateur et le serveur |
| `src/lib/maison.ts` | Nom et phrase d'accroche de la Maison |
| `src/styles/tokens.css` | **Tous** les jetons de design : couleurs, typographies, tailles, durées, décors |
| `supabase/` | Schéma SQL et inscription des deux membres |

### Brancher le design system

Toutes les valeurs visuelles sont des variables CSS déclarées dans `src/styles/tokens.css`. Les composants et
les feuilles de style ne font que les utiliser. Pour appliquer le design system, il suffit de remplacer les
valeurs de ce fichier. Les emplacements décoratifs (`--deco-texture-fond`, `--deco-cadre-portrait`,
`--deco-ornement-separation`, `--deco-motif-dentelle`, `--deco-rideau`, `--deco-embleme`) valent `none` ou un
style sobre en attendant. Les polices se changent dans `src/app/layout.tsx` (next/font) et dans les variables
`--police-*`.

### Cadrage des miniatures

L'angle, la distance et l'éclairage des portraits sont réglés dans `PRISE_DE_VUE` (`src/lib/skin3d.ts`). Après un
changement, utiliser **Coulisses > Sauvegarde > Regénérer toutes les images**.

## Fonctionnement

- **Pages publiques** : pré-générées et relues depuis Supabase. Chaque modification dans les Coulisses ou le
  Jury appelle `/api/revalider`, qui les régénère en quelques secondes.
- **Skins** : vérifiés dans le navigateur (signature PNG, 64 × 64 ou 64 × 32, 200 Ko, non vide), puis à nouveau
  par `/api/skins` avant d'être rangés dans `skins/`. Un skin n'est lisible publiquement que si sa tenue est
  publiée.
- **Images statiques** : portrait 600 × 1200 et vignette 200 × 400, en WebP (PNG si le navigateur ne sait pas
  encoder le WebP), prises par la vue 3D du miroir de loge avec un cadrage fixe.
- **Tier lists** : enregistrement 0,5 s après chaque modification, avec un numéro de version. Si l'autre membre a
  enregistré entre-temps, sa version est rechargée et un message prévient. Un second écran ouvert sur le même
  classement se met à jour seul grâce au temps réel de Supabase.
- **Lettre** : la créatrice la voit en grand à sa première visite des Coulisses. Elle peut la ranger, puis la
  relire depuis les Coulisses. Seul le compte `ami` peut l'écrire.

## Choix faits là où le cahier des charges laisse le choix

- **Champs supplémentaires d'une tenue** : les champs *détails*, *mot de la créatrice* et *créée pour* sont
  ajoutés, car le Foyer et la recherche les utilisent. Ils sont facultatifs et repliés dans le formulaire.
  Les collections ont aussi une *description*.
- **Ordre dans le Lookbook** : avec un filtre de collection, la navigation suit l'ordre choisi dans la
  collection ; sans filtre, elle va de la plus récente à la plus ancienne.
- **Tenue masquée dans un classement** : elle disparaît de l'affichage, mais garde sa place. Si elle est
  republiée, elle revient à son rang.
- **Lien `/lookbook`** : il ouvre la tenue la plus récente.
