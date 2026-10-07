// Données de démonstration : « Le coffre d'Alice ».
// TOUT EST FICTIF. La solution est dans docs/INTRIGUE.md.
//
// Objectif du TP : exfiltrer la base SQLite (app.db) ET la clé de chiffrement
// (.env), puis déchiffrer les messages pour retrouver le code du coffre.
// Une seule personne (Bob) possède le code complet : Alice le lui a envoyé.
//
// `ago` = ancienneté en heures (du plus ancien au plus récent).

// Le compte "pierre" (le compte de départ des étudiants) n'est PAS dans le seed :
// il est créé par le serveur au lancement (voir ensureStudentAccount dans server.js).
const users = ['admin', 'alice', 'bob', 'charlie', 'david', 'eve'];

// [demandeur, destinataire, statut]
const friendships = [
  ['alice', 'bob', 'accepted'],
  ['alice', 'charlie', 'accepted'],
  ['alice', 'david', 'accepted'],
  ['admin', 'alice', 'accepted'],
  ['bob', 'charlie', 'accepted'],
  ['eve', 'alice', 'pending'],
];

// [auteur, ago, titre, contenu]
const posts = [
  ['admin', 120, 'Bienvenue sur Agora',
    "Bienvenue sur Agora, le réseau privé du cercle de Roseval. Ajoutez vos proches et discutez en toute confidentialité."],
  ['alice', 96, 'Je m\'absente',
    "Je pars quelque temps régler des affaires. Bob veille sur la maison en mon absence."],
  ['david', 48, 'Bonne journée',
    "Belle journée à la maison aujourd'hui. Au plaisir de vous revoir bientôt."],
  // Dernier post d'Alice (le plus récent) : indice que Bob est sa personne de confiance.
  ['alice', 2, 'Journée parfaite',
    "Super journée passée avec Bob aujourd'hui. C'est la seule personne à qui je confie mes secrets, je lui donne toute ma confiance."],
];

// [expéditeur, destinataire, ago, contenu]
const messages = [
  // LE SEUL message qui contient le code : Alice ne le confie qu'à Bob.
  ['alice', 'bob', 90,
    "Bob, je te confie le code de mon coffre. Ne le partage avec personne : 041792."],
  ['bob', 'alice', 89, "Bien reçu, Madame. C'est noté et gardé secret."],

  // Conversations ordinaires d'Alice avec ses autres amis (aucune info sur le code).
  // Alice ↔ David
  ['david', 'alice', 70, "Salut Alice ! Toujours partante pour une balade au lac ce week-end ?"],
  ['alice', 'david', 69, "Avec plaisir David, si le temps le permet. On se dit samedi matin ?"],
  ['david', 'alice', 68, "Parfait, je passe te prendre à 9h."],

  // Alice ↔ Charlie
  ['charlie', 'alice', 50, "Bonjour Alice, les documents sont prêts à signer dès votre retour."],
  ['alice', 'charlie', 49, "Merci Charlie, je repasse à l'étude la semaine prochaine."],
  ['charlie', 'alice', 48, "Très bien, je vous réserve un créneau mardi après-midi."],

  // Alice ↔ David (encore)
  ['alice', 'david', 15, "Super moment au lac, merci encore. À refaire bientôt !"],
  ['david', 'alice', 14, "Quand tu veux :)"],
];

module.exports = { users, friendships, posts, messages };
