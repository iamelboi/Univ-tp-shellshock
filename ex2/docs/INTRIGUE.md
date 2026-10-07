# Scénario : « Le coffre d'Alice »

> Document réservé à l'enseignant : il contient la solution.
> Tout est **fictif**. Données dans [db/stub.js](../db/stub.js), chargées par `npm run init-db`.

## Pitch

Alice a confié le **code de son coffre** à une seule personne de confiance, **Bob**, dans un message privé. Tous les messages du site sont chiffrés. La clé de chiffrement est dans le fichier **`.env`** du serveur.

L'étudiant doit récupérer la base `app.db` **et** la clé (`.env`), puis déchiffrer les messages pour retrouver le code.

## Objectif final (le « flag »)

- **Code du coffre : `041792`**
- Il se trouve dans l'unique message **Alice → Bob**. Bob est le seul à le détenir.

## Comptes

Mot de passe commun : `password123`.

| Compte | Rôle |
|---|---|
| `alice` | Propriétaire du coffre (émettrice du code) |
| `bob` | Seul détenteur du code |
| `charlie`, `david` | Amis d'Alice (messages d'ambiance) |
| `eve` | Curieuse, demande d'ami en attente |
| `admin` | Gestion du réseau |

## Chaîne d'attaque attendue (Shellshock)

1. **Shellshock** sur le CGI du serveur legacy → exécution de commandes à distance.
2. Lire le code source exfiltré, dont `db/encryption.js` : format `<iv_hex>:<ciphertext_base64>`, **AES-256-CBC**, clé lue depuis la variable d'environnement `DATA_KEY`.
3. Exfiltrer **`db/app.db`** (données chiffrées) **et `.env`** (qui contient `DATA_KEY`).
4. **Déchiffrer** les messages avec la clé.
5. Lire le message Alice → Bob → **`041792`**.

## Points pédagogiques

- **Chiffrement au repos** : ouvrir `app.db` avec `sqlite3` montre des contenus illisibles. Sans la clé du `.env`, la base seule ne suffit pas.
- **Mauvaise pratique classique** : garder la clé de chiffrement sur le même serveur que les données (dans `.env`). Si l'attaquant lit un fichier, il lit l'autre → le chiffrement ne protège plus rien.
- **Contre-mesures** : patcher Bash, couper le serveur legacy, sortir la clé du serveur (coffre de secrets / HSM), moindre privilège.

## Pour déchiffrer (côté correction)

Avec `app.db` et `.env` récupérés, le déchiffrement de tous les messages tient en **une commande** (bash + `sqlite3` + `openssl`) :

```bash
KEY=$(sed -n 's/^DATA_KEY=//p' .env); sqlite3 app.db 'SELECT content FROM messages' | while IFS=: read -r iv data; do echo "$data" | openssl enc -d -aes-256-cbc -K "$KEY" -iv "$iv" -A -base64; echo; done
```

Format d'une valeur chiffrée : `<iv_hex>:<ciphertext_base64>`. On récupère la clé dans `.env`,
puis pour chaque ligne on sépare l'IV du texte chiffré et on passe le tout à `openssl` (AES-256-CBC).

Le message recherché apparaît dans la sortie :

> Bob, je te confie le code de mon coffre. Ne le partage avec personne : **041792**.
