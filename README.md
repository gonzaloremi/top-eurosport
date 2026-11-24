# Top 10 de l'année

Jeu entre amis / en famille : deviner les **tops 10 Eurosport Monde et France** de l'année.

- Chacun a son compte (pseudo + mot de passe).
- Ligues privées : on rejoint avec un **code à 4 lettres** (ou le lien `/rejoindre/ABCD`).
- Chaque joueur envoie son classement (10 Monde + 10 France) **avant le 1er décembre** (minuit, heure de Paris). Il est caché aux autres jusque-là.
- Barème : **3 pts** bon athlète à la bonne place, **1 pt** athlète dans le top 10 mais mal placé.
- Trois maillots par ligue : **Arc-en-ciel** (Monde), **Bleu** (France), **Jaune** (général). Égalité départagée au nombre de places exactes.
- Un admin saisit les tops 10 officiels (page `/admin`) ; les points sont recalculés aussitôt. Les noms sont comparés sans accents/majuscules/espaces/tirets, et l'admin peut rapprocher les fautes de frappe.
- Le **premier compte créé est admin** (on peut ensuite promouvoir d'autres joueurs, ou utiliser `ADMIN_USERNAMES`).

## Stack

Next.js 15 (App Router, server actions) + Postgres (`postgres`). Les tables sont créées automatiquement au premier accès.

## Développement local

```bash
cp .env.example .env.local   # ajuster DATABASE_URL
npm install
npm run dev
npm test                     # tests du barème (données réelles 2025)
```

## Déploiement (Vercel + Neon)

1. Sur vercel.com : **Add New → Project**, importer ce repo GitHub (framework Next.js détecté).
2. Dans le projet Vercel : **Storage → Create Database → Neon (Postgres)**, la relier au projet. Vercel ajoute `DATABASE_URL` automatiquement.
3. (Optionnel) Variables : `SESSION_SECRET` (chaîne aléatoire), `ADMIN_USERNAMES`.
4. **Redeploy**. Chaque push sur `main` redéploie automatiquement.

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` (ou `POSTGRES_URL`) | Connexion Postgres |
| `SESSION_SECRET` | Optionnel — sinon généré et stocké en base |
| `ADMIN_USERNAMES` | Optionnel — pseudos admin, séparés par des virgules |
