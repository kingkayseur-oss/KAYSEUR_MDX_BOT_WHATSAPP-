# KAYSEUR MDX — WhatsApp Bot

Bot WhatsApp multi-device en Node.js avec portail de pairing, menu illustré et **100 commandes**. Tous les textes envoyés par le bot passent par le convertisseur de petites capitales `sᴇᴜ`. Les URL et les commandes restent lisibles et cliquables.

## Contenu du ZIP

- `index.js` : serveur Express, pairing Baileys et commandes.
- `public/index.html` : site de pairing adapté au téléphone.
- `assets/kayseur-mdx-menu.png` : image de profil/menu KAYSEUR MDX.
- `render.yaml` : configuration de départ pour Render.

## Déploiement GitHub + Render

1. Décompresse `KAYSEUR-MDX-100-COMMANDES.zip`.
2. Crée un dépôt GitHub nommé `kayseur-mdx` et téléverse **le contenu** du dossier (pas le dossier ZIP lui-même).
3. Sur Render, crée un **New Web Service**, connecte le dépôt GitHub.
4. Choisis `npm install` comme Build Command et `npm start` comme Start Command. Runtime : Node.
5. Ajoute les variables d’environnement :
   - `BOT_NAME` = `KAYSEUR MDX`
   - `OWNER_NAME` = `MR KING KAYSEUR`
   - `OWNER_NUMBERS` = ton numéro avec indicatif, chiffres seulement (ex. `24206XXXXXXX`). Cette variable active les commandes propriétaire.
   - `WHATSAPP_CHANNEL` = `https://whatsapp.com/channel/0029VbDvPxj0VycNWTvOrE0x`
   - `PREFIX` = `.`
6. Déploie. Ouvre l’adresse Render : le site de pairing s’affiche.
7. Entre ton numéro WhatsApp avec indicatif, sans `+`. Dans WhatsApp, ouvre **Appareils connectés → Connecter un appareil → Connecter avec un numéro**, puis saisis le code affiché.
8. Envoie `.menu` au numéro WhatsApp connecté pour voir l’image et les 100 commandes.

## Important pour les sessions

Les fichiers de connexion sont enregistrés dans `auth_info_baileys/`. Ne partage jamais ce dossier, le code de pairing ou `creds.json`. Sur une instance Render gratuite, le stockage local peut être effacé lors d’un redémarrage ou d’un redéploiement : il faudra alors refaire le pairing. Pour conserver les sessions durablement, utilise un stockage persistant compatible avec ton offre Render.

## Commandes — 100

**Général (14)** : `.menu` `.help` `.ping` `.alive` `.botinfo` `.owner` `.runtime` `.date` `.time` `.uptime` `.support` `.channel` `.prefix` `.about`

**Fun & texte (15)** : `.joke` `.quote` `.fact` `.meme` `.compliment` `.truth` `.dare` `.ship` `.coin` `.roll` `.choose` `.8ball` `.reverse` `.upper` `.lower`

**Outils (16)** : `.calc` `.translate` `.shortlink` `.qr` `.weather` `.define` `.wiki` `.password` `.uuid` `.count` `.read` `.sticker` `.toimg` `.take` `.emojimix` `.poll`

**Médias (10)** : `.play` `.song` `.video` `.audio` `.lyrics` `.ytsearch` `.tiktok` `.instagram` `.facebook` `.media`

**Groupe (22)** : `.tagall` `.hidetag` `.groupinfo` `.admins` `.members` `.linkgroup` `.revoke` `.setname` `.setdesc` `.welcome` `.goodbye` `.antilink` `.delete` `.promote` `.demote` `.kick` `.add` `.mute` `.unmute` `.lock` `.unlock` `.everyone`

**Propriétaire (23)** : `.broadcast` `.restart` `.shutdown` `.setprefix` `.setbotname` `.block` `.unblock` `.listblocked` `.clear` `.stats` `.privacy` `.report` `.feedback` `.pairhelp` `.menuimage` `.autoread` `.autotyping` `.antispam` `.filter` `.unfilter` `.backup` `.pingall` `.rules`

## Musique et fichiers audio

- `.play nom de la musique` : ouvre une recherche YouTube pour retrouver la piste et ses sources officielles.
- `.song https://exemple.com/fichier.mp3` : envoie un fichier audio depuis un lien HTTPS direct, si tu as le droit de le télécharger. Limite : 15 Mo et type audio direct. Cette commande ne contourne pas les protections des plateformes et ne télécharge pas les pistes protégées depuis YouTube.

## Notes sur certaines commandes

Les commandes de groupe nécessitent que le bot soit administrateur lorsque WhatsApp l’exige. Les commandes propriétaire nécessitent `OWNER_NUMBERS`. Les fonctions de conversion avancée (`.sticker`, `.toimg`, `.take`) affichent une indication mais nécessitent un module média complémentaire pour effectuer la conversion réelle. Les commandes `.restart` et `.shutdown` ne forcent pas l’arrêt du service Render.

## Sécurité

Ce projet est fourni comme base de départ. Teste-le d’abord dans un groupe privé. Ne connecte que ton propre compte ou un compte dont tu as l’autorisation. N’envoie jamais les codes de pairing ou les fichiers de session à quelqu’un.
