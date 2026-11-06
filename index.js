
const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const crypto = require('crypto');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const app = express();

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const PORT = process.env.PORT || 10000;
const BOT = process.env.BOT_NAME || 'KAYSEUR MDX';
const OWNER = process.env.OWNER_NAME || 'MR KING KAYSEUR THE GLITCH DEV';
const CHANNEL = process.env.WHATSAPP_CHANNEL ||
  'https://whatsapp.com/channel/0029VbDvPxj0VycNWTvOrE0x';

const PREFIX = process.env.PREFIX || '.';
const AUTH_ROOT = path.join(__dirname, 'auth_info_baileys');

fs.mkdirSync(AUTH_ROOT, { recursive: true });

// ===============================
// STYLISATION
// ===============================

const SMALL = {
  a:'ᴀ', b:'ʙ', c:'ᴄ', d:'ᴅ', e:'ᴇ', f:'ғ',
  g:'ɢ', h:'ʜ', i:'ɪ', j:'ᴊ', k:'ᴋ', l:'ʟ',
  m:'ᴍ', n:'ɴ', o:'ᴏ', p:'ᴘ', q:'ǫ', r:'ʀ',
  s:'s', t:'ᴛ', u:'ᴜ', v:'ᴠ', w:'ᴡ', x:'x',
  y:'ʏ', z:'ᴢ'
};

function stylize(input = '') {
  return String(input)
    .split(/(https?:\/\/[^\s]+|\.[a-z0-9][a-z0-9_-]*)/gi)
    .map(part => {
      if (
        /^https?:\/\//i.test(part) ||
        /^\.[a-z0-9][a-z0-9_-]*$/i.test(part)
      ) return part;

      return [...part]
        .map(ch => SMALL[ch.toLowerCase()] || ch)
        .join('');
    })
    .join('');
}

const box = s =>
  `╭━━〔 ${s} 〕━━╮\n${stylize('│ KAYSEUR MDX')}\n╰━━━━━━━━━━━━╯`;

// ===============================
// LES 100 COMMANDES
// ===============================

const COMMAND_GROUPS = {
  'GÉNÉRAL': [
    'menu','help','ping','alive','botinfo','owner','runtime',
    'date','time','uptime','support','channel','prefix','about'
  ],

  'FUN & TEXTE': [
    'joke','quote','fact','meme','compliment','truth','dare',
    'ship','coin','roll','choose','8ball','reverse','upper','lower'
  ],

  'OUTILS': [
    'calc','translate','shortlink','qr','weather','define','wiki',
    'password','uuid','count','read','sticker','toimg','take',
    'emojimix','poll'
  ],

  'MÉDIAS': [
    'play','song','video','audio','lyrics','ytsearch',
    'tiktok','instagram','facebook','media'
  ],

  'GROUPE': [
    'tagall','hidetag','groupinfo','admins','members','linkgroup',
    'revoke','setname','setdesc','welcome','goodbye','antilink',
    'delete','promote','demote','kick','add','mute','unmute',
    'lock','unlock','everyone'
  ],

  'PROPRIÉTAIRE': [
    'broadcast','restart','shutdown','setprefix','setbotname',
    'block','unblock','listblocked','clear','stats','privacy',
    'report','feedback','pairhelp','menuimage','autoread',
    'autotyping','antispam','filter','unfilter','backup',
    'pingall','rules'
  ]
};

const ALL_COMMANDS = Object.values(COMMAND_GROUPS).flat();

console.log('Nombre de commandes :', ALL_COMMANDS.length);

if (ALL_COMMANDS.length !== 100) {
  console.error('ERREUR : le menu ne contient pas 100 commandes.');
}

// ===============================
// VARIABLES GLOBALES
// ===============================

const startedAt = Date.now();

const sessions = new Map();
const settings = new Map();
const rate = new Map();

const pairingLocks = new Set();
const pairingTimes = new Map();

let currentPrefix = PREFIX;

function getSettings(id) {
  if (!settings.has(id)) {
    settings.set(id, {
      welcome: true,
      goodbye: true,
      antilink: false,
      autoread: false,
      antispam: false,
      filters: {}
    });
  }

  return settings.get(id);
}

function jidNumber(jid = '') {
  return jid.split('@')[0].split(':')[0];
}

function isGroup(jid = '') {
  return jid.endsWith('@g.us');
}

function duration(ms) {
  const s = Math.floor(ms / 1000);

  return `${Math.floor(s / 86400)}j ${
    Math.floor(s % 86400 / 3600)
  }h ${Math.floor(s % 3600 / 60)}m ${s % 60}s`;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendText(sock, jid, text, quoted) {
  return sock.sendMessage(
    jid,
    { text: stylize(text) },
    quoted ? { quoted } : {}
  );
}

async function isAdmin(sock, group, sender) {
  try {
    const m = await sock.groupMetadata(group);
    const p = m.participants.find(x => x.id === sender);

    return !!p && ['admin', 'superadmin'].includes(p.admin);
  } catch {
    return false;
  }
}

async function isOwner(sender) {
  const n = jidNumber(sender);

  return (process.env.OWNER_NUMBERS || '')
    .split(',')
    .map(x => x.replace(/\D/g, ''))
    .filter(Boolean)
    .includes(n);
}

// ===============================
// MENU
// ===============================

function menuText() {
  let out = `╔════════════════════════════╗
║       ${BOT}       ║
║     100 COMMANDES • MDX    ║
╚════════════════════════════╝

`;

  for (const [group, cmds] of Object.entries(COMMAND_GROUPS)) {
    out += `\n┏━━〔 ${group} 〕━━┓\n`;

    for (let i = 0; i < cmds.length; i += 2) {
      out += `┃ ${currentPrefix}${cmds[i]}${
        cmds[i + 1] ? `  •  ${currentPrefix}${cmds[i + 1]}` : ''
      }\n`;
    }

    out += `┗━━━━━━━━━━━━━━━━━━┛\n`;
  }

  out += `
╭━━〔 LIENS OFFICIELS 〕━━╮
│ WhatsApp : ${CHANNEL}
╰━━━━━━━━━━━━━━━━━━━━╯

${OWNER} • KAYSEUR MDX`;

  return stylize(out);
}

async function sendMenu(sock, jid, quoted) {
  const imagePath = path.join(
    __dirname,
    'assets',
    'kayseur-mdx-menu.png'
  );

  if (fs.existsSync(imagePath)) {
    await sock.sendMessage(
      jid,
      { image: fs.readFileSync(imagePath) },
      { quoted }
    );
  }

  await sendText(sock, jid, menuText(), quoted);

  await sendText(
    sock,
    jid,
    `╭━━〔 VOIR LA CHAÎNE 〕━━╮
${CHANNEL}
╰━━━━━━━━━━━━━━━━━━━━╯`,
    quoted
  );
}

// ===============================
// AUDIO
// ===============================

async function directAudio(sock, jid, url, quoted) {
  if (!/^https:\/\//i.test(url)) {
    return sendText(
      sock,
      jid,
      'Utilise un lien HTTPS direct vers un fichier audio autorisé.',
      quoted
    );
  }

  const u = new URL(url);

  if (
    ['localhost', '127.0.0.1'].includes(u.hostname) ||
    u.hostname.endsWith('.local')
  ) {
    return sendText(sock, jid, 'Lien non autorisé.', quoted);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'error'
    });

    const type = (res.headers.get('content-type') || '').toLowerCase();

    if (!res.ok || !type.startsWith('audio/')) {
      return sendText(
        sock,
        jid,
        'Le lien doit pointer directement vers un fichier audio.',
        quoted
      );
    }

    const len = Number(res.headers.get('content-length') || 0);

    if (len > 15 * 1024 * 1024) {
      return sendText(sock, jid, 'Fichier trop volumineux.', quoted);
    }

    const buf = Buffer.from(await res.arrayBuffer());

    if (buf.length > 15 * 1024 * 1024) {
      return sendText(sock, jid, 'Fichier trop volumineux.', quoted);
    }

    await sock.sendMessage(
      jid,
      { audio: buf, mimetype: type, ptt: false },
      { quoted }
    );

  } catch (e) {
    await sendText(
      sock,
      jid,
      'Impossible de récupérer ce fichier. Vérifie le lien.',
      quoted
    );
  } finally {
    clearTimeout(timer);
  }
}

// ===============================
// GESTION DES COMMANDES
// ===============================

async function handleCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || jid;
  const fromMe = msg.key.fromMe;

  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    '';

  if (!body) return;

  const cfg = getSettings(jid);

  if (cfg.autoread) {
    await sock.readMessages([msg.key]).catch(() => {});
  }

  if (cfg.antispam && !fromMe) {
    const now = Date.now();
    const last = rate.get(sender) || 0;

    if (now - last < 1800) return;

    rate.set(sender, now);
  }

  const escapedPrefix = currentPrefix.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

  const matched = body.trim().match(
    new RegExp(
      '^' + escapedPrefix +
      '([\\w8-]+)(?:\\s+([\\s\\S]*))?$',
      'i'
    )
  );

  if (!matched) {
    if (
      isGroup(jid) &&
      cfg.antilink &&
      /https?:\/\//i.test(body) &&
      !(await isAdmin(sock, jid, sender))
    ) {
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      await sendText(sock, jid, 'Lien supprimé : anti-lien activé.');
    }

    const key = body.toLowerCase().trim();

    if (cfg.filters[key]) {
      await sendText(sock, jid, cfg.filters[key], msg);
    }

    return;
  }

  const cmd = matched[1].toLowerCase();
  const rest = matched[2] || '';
  const args = rest.trim().split(/\s+/).filter(Boolean);

  if (!ALL_COMMANDS.includes(cmd)) return;

  const group = isGroup(jid);
  const admin = group ? await isAdmin(sock, jid, sender) : false;
  const owner = await isOwner(sender);

  const adminOnly = [
    'tagall','hidetag','revoke','setname','setdesc',
    'delete','promote','demote','kick','add','mute',
    'unmute','lock','unlock','everyone','pingall'
  ];

  const ownerOnly = [
    'broadcast','restart','shutdown','setprefix','setbotname',
    'block','unblock','listblocked','clear','autoread',
    'autotyping','antispam','filter','unfilter','backup'
  ];

  if (adminOnly.includes(cmd) && (!group || !admin)) {
    return sendText(
      sock,
      jid,
      'Commande réservée aux administrateurs du groupe.',
      msg
    );
  }

  if (ownerOnly.includes(cmd) && !owner) {
    return sendText(
      sock,
      jid,
      'Commande réservée au propriétaire du bot.',
      msg
    );
  }

  const context = msg.message?.extendedTextMessage?.contextInfo;
  const mentions = context?.mentionedJid || [];

  const target =
    mentions[0] ||
    context?.participant;

  const meta = group
    ? await sock.groupMetadata(jid).catch(() => null)
    : null;

  try {
    switch (cmd) {

      case 'menu':
      case 'help':
        return sendMenu(sock, jid, msg);

      case 'ping':
        return sendText(sock, jid, `PONG • ${Date.now() - Number(msg.messageTimestamp || 0) * 1000} ms`, msg);

      case 'alive':
        return sendText(sock, jid, `╭━━〔 ${BOT} 〕━━╮
Statut : EN LIGNE
Commandes : 100
╰━━━━━━━━━━━━╯`, msg);

      case 'botinfo':
      case 'about':
        return sendText(sock, jid, `${BOT}
Version 1.0.0
Créateur : ${OWNER}
Préfixe : ${currentPrefix}
Commandes : 100`, msg);

      case 'owner':
      case 'support':
      case 'feedback':
      case 'report':
        return sendText(sock, jid, `Propriétaire : ${OWNER}
Ajoute OWNER_NUMBERS dans Render pour activer les commandes propriétaire.`, msg);

      case 'runtime':
      case 'uptime':
        return sendText(sock, jid, `En ligne depuis : ${duration(Date.now() - startedAt)}`, msg);

      case 'date':
        return sendText(sock, jid, new Date().toLocaleDateString('fr-FR'), msg);

      case 'time':
        return sendText(sock, jid, new Date().toLocaleTimeString('fr-FR'), msg);

      case 'channel':
        return sendText(sock, jid, `Chaîne WhatsApp officielle : ${CHANNEL}`, msg);

      case 'prefix':
        return sendText(sock, jid, `Préfixe actuel : ${currentPrefix}`, msg);

      case 'joke':
        return sendText(sock, jid, [
          'Pourquoi le développeur aime le calme ? Parce qu’il déteste les bugs bruyants.',
          'Un bot entre dans un groupe… tout le monde lui demande le menu.',
          'Pourquoi JavaScript est rapide ? Il ne perd pas son temps à compiler ses excuses.'
        ][Math.floor(Math.random() * 3)], msg);

      case 'quote':
        return sendText(sock, jid, [
          'La constance transforme les petits pas en grands résultats.',
          'Apprends, teste, corrige et recommence.',
          'Le progrès commence quand tu passes à l’action.'
        ][Math.floor(Math.random() * 3)], msg);

      case 'fact':
        return sendText(sock, jid, 'Fait : un jour terrestre dure environ 24 heures.', msg);

      case 'meme':
        return sendText(sock, jid, 'Idée meme : Moi : juste une petite modification. Le projet : 47 nouveaux bugs.', msg);

      case 'compliment':
        return sendText(sock, jid, 'Tu progresses à ton rythme : continue à apprendre et à créer.', msg);

      case 'truth':
        return sendText(sock, jid, 'Vérité : quelle compétence aimerais-tu maîtriser cette année ?', msg);

      case 'dare':
        return sendText(sock, jid, 'Défi : apprends un nouveau raccourci clavier aujourd’hui.', msg);

      case 'ship':
        return sendText(sock, jid, 'Compatibilité fictive : 99 % de bonne humeur ✨', msg);

      case 'coin':
        return sendText(sock, jid, Math.random() < 0.5 ? 'Pile !' : 'Face !', msg);

      case 'roll':
        return sendText(sock, jid, `Résultat du dé : ${1 + Math.floor(Math.random() * 6)}`, msg);

      case 'choose': {
        const choices = rest.split('|').map(x => x.trim()).filter(Boolean);
        return sendText(sock, jid, choices.length
          ? `Choix : ${choices[Math.floor(Math.random() * choices.length)]}`
          : 'Ajoute des options séparées par |', msg);
      }

      case '8ball':
        return sendText(sock, jid, [
          'Oui.',
          'Pas maintenant.',
          'C’est possible.',
          'Essaie encore plus tard.'
        ][Math.floor(Math.random() * 4)], msg);

      case 'reverse':
        return sendText(sock, jid, [...rest].reverse().join(''), msg);

      case 'upper':
        return sendText(sock, jid, rest.toLocaleUpperCase('fr-FR'), msg);

      case 'lower':
        return sendText(sock, jid, rest.toLocaleLowerCase('fr-FR'), msg);

      case 'fancy':
        return sendText(sock, jid, rest.split('').map(c => c === ' ' ? '　' : c).join(''), msg);

      case 'calc': {
        if (!/^[0-9+*/().% -]+$/.test(rest)) {
          return sendText(sock, jid, 'Expression non valide. Exemple : .calc 12*(5+2)', msg);
        }

        const result = Function('"use strict";return (' + rest + ')')();

        return sendText(sock, jid, `Résultat : ${result}`, msg);
      }

      case 'translate':
        return sendText(sock, jid, `Traducteur : https://translate.google.com/?sl=auto&tl=fr&text=${encodeURIComponent(rest)}`, msg);

      case 'shortlink':
        return sendText(sock, jid, 'Pour raccourcir un lien, utilise https://tinyurl.com/', msg);

      case 'qr':
        return sendText(sock, jid, `QR code : https://quickchart.io/qr?text=${encodeURIComponent(rest || 'KAYSEUR MDX')}`, msg);

      case 'weather':
        return sendText(sock, jid, `Météo : https://wttr.in/${encodeURIComponent(rest || 'Brazzaville')}`, msg);

      case 'define':
        return sendText(sock, jid, `Définition : https://fr.wiktionary.org/wiki/${encodeURIComponent(rest)}`, msg);

      case 'wiki':
        return sendText(sock, jid, `Recherche : https://fr.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(rest)}`, msg);

      case 'password':
        return sendText(sock, jid, `Mot de passe temporaire : ${crypto.randomBytes(9).toString('base64url')}\nNe le réutilise pas.`, msg);

      case 'uuid':
        return sendText(sock, jid, crypto.randomUUID(), msg);

      case 'count':
        return sendText(sock, jid, `Mots : ${rest.trim() ? rest.trim().split(/\s+/).length : 0}
Caractères : ${rest.length}`, msg);

      case 'read':
        return sendText(sock, jid, rest || 'Ajoute le texte après la commande.', msg);

      case 'sticker':
        return sendText(sock, jid, 'La conversion sticker nécessite un module média supplémentaire.', msg);

      case 'toimg':
      case 'take':
        return sendText(sock, jid, 'La conversion nécessite un module média supplémentaire.', msg);

      case 'emojimix':
        return sendText(sock, jid, `Emoji : ${rest || '✨ + 👑'}`, msg);

      case 'poll':
        return sendText(sock, jid, `Sondage : ${rest || 'Écris ta question et les choix.'}`, msg);

      case 'play':
      case 'ytsearch':
      case 'video':
        return sendText(sock, jid, `Recherche média : https://www.youtube.com/results?search_query=${encodeURIComponent(rest)}`, msg);

      case 'song':
        return directAudio(sock, jid, rest, msg);

      case 'audio':
      case 'media':
        return sendText(sock, jid, 'Pour .song, fournis un lien HTTPS direct vers un fichier audio autorisé. Limite : 15 Mo.', msg);

      case 'lyrics':
        return sendText(sock, jid, `Recherche de paroles : https://www.google.com/search?q=${encodeURIComponent(rest + ' paroles')}`, msg);

      case 'tiktok':
        return sendText(sock, jid, `TikTok : https://www.tiktok.com/search?q=${encodeURIComponent(rest)}`, msg);

      case 'instagram':
        return sendText(sock, jid, 'Instagram : https://www.instagram.com/', msg);

      case 'facebook':
        return sendText(sock, jid, 'Facebook : https://www.facebook.com/', msg);

      case 'groupinfo':
        return sendText(sock, jid, meta
          ? `Nom : ${meta.subject}\nMembres : ${meta.participants.length}\nDescription : ${meta.desc || 'Aucune'}`
          : 'Cette commande fonctionne dans un groupe.', msg);

      case 'admins':
        return sendText(sock, jid, meta
          ? `Admins :\n${meta.participants.filter(p => p.admin).map(p => '• @' + jidNumber(p.id)).join('\n') || 'Aucun'}`
          : 'Groupe uniquement.', msg);

      case 'members':
        return sendText(sock, jid, meta
          ? `Membres : ${meta.participants.length}`
          : 'Groupe uniquement.', msg);

      case 'linkgroup': {
        if (!group) return sendText(sock, jid, 'Groupe uniquement.', msg);
        const code = await sock.groupInviteCode(jid);
        return sendText(sock, jid, `Lien du groupe : https://chat.whatsapp.com/${code}`, msg);
      }

      case 'revoke': {
        const c = await sock.groupRevokeInvite(jid);
        return sendText(sock, jid, `Nouveau lien : https://chat.whatsapp.com/${c}`, msg);
      }

      case 'setname':
        await sock.groupUpdateSubject(jid, rest);
        return sendText(sock, jid, 'Nom du groupe modifié.', msg);

      case 'setdesc':
        await sock.groupUpdateDescription(jid, rest);
        return sendText(sock, jid, 'Description modifiée.', msg);

      case 'welcome':
        cfg.welcome = !cfg.welcome;
        return sendText(sock, jid, `Bienvenue : ${cfg.welcome ? 'activée' : 'désactivée'}`, msg);

      case 'goodbye':
        cfg.goodbye = !cfg.goodbye;
        return sendText(sock, jid, `Au revoir : ${cfg.goodbye ? 'activé' : 'désactivé'}`, msg);

      case 'antilink':
        cfg.antilink = !cfg.antilink;
        return sendText(sock, jid, `Anti-lien : ${cfg.antilink ? 'activé' : 'désactivé'}`, msg);

      case 'delete': {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;

        if (!ctx?.stanzaId) {
          return sendText(sock, jid, 'Réponds au message à supprimer.', msg);
        }

        return sock.sendMessage(jid, {
          delete: {
            remoteJid: jid,
            id: ctx.stanzaId,
            participant: ctx.participant || sender,
            fromMe: ctx.participant === sock.user.id
          }
        });
      }

      case 'promote':
      case 'demote':
      case 'kick': {
        if (!target) {
          return sendText(sock, jid, 'Mentionne un membre ou réponds à son message.', msg);
        }

        const action = cmd === 'promote'
          ? 'promote'
          : cmd === 'demote'
            ? 'demote'
            : 'remove';

        await sock.groupParticipantsUpdate(jid, [target], action);

        return sendText(sock, jid, 'Action effectuée.', msg);
      }

      case 'add': {
        const n = rest.replace(/\D/g, '');

        if (n.length < 8) {
          return sendText(sock, jid, 'Indique un numéro avec indicatif, sans +.', msg);
        }

        await sock.groupParticipantsUpdate(jid, [n + '@s.whatsapp.net'], 'add');

        return sendText(sock, jid, 'Demande d’ajout envoyée si les paramètres du groupe le permettent.', msg);
      }

      case 'mute':
        await sock.groupSettingUpdate(jid, 'announcement');
        return sendText(sock, jid, 'Seuls les admins peuvent envoyer des messages.', msg);

      case 'unmute':
        await sock.groupSettingUpdate(jid, 'not_announcement');
        return sendText(sock, jid, 'Tous les membres peuvent envoyer des messages.', msg);

      case 'lock':
        await sock.groupSettingUpdate(jid, 'locked');
        return sendText(sock, jid, 'Paramètres du groupe verrouillés aux admins.', msg);

      case 'unlock':
        await sock.groupSettingUpdate(jid, 'unlocked');
        return sendText(sock, jid, 'Paramètres du groupe ouverts aux membres.', msg);

      case 'tagall':
      case 'everyone':
      case 'pingall':
      case 'hidetag': {
        const ps = meta.participants.map(p => p.id);
        const text = rest || 'Annonce du groupe';

        return sock.sendMessage(jid, {
          text: stylize(
            text + '\n' +
            (cmd === 'hidetag' ? '' : ps.map(x => '@' + jidNumber(x)).join(' '))
          ),
          mentions: ps
        });
      }

      case 'broadcast':
        return sendText(sock, jid, 'La diffusion multi-groupes est désactivée sur cette version.', msg);

      case 'restart':
        return sendText(sock, jid, 'Le service Render peut relancer automatiquement le processus.', msg);

      case 'shutdown':
        return sendText(sock, jid, 'Arrêt manuel désactivé sur cette version hébergée.', msg);

      case 'setprefix':
        if (!rest || rest.length > 3) {
          return sendText(sock, jid, 'Exemple : .setprefix !', msg);
        }

        currentPrefix = rest;

        return sendText(sock, jid, `Nouveau préfixe : ${currentPrefix}`, msg);

      case 'setbotname':
        return sendText(sock, jid, 'Pour modifier le nom, change BOT_NAME dans les variables Render.', msg);

      case 'block':
      case 'unblock': {
        if (!target) return sendText(sock, jid, 'Mentionne un utilisateur.', msg);

        await sock.updateBlockStatus(
          target,
          cmd === 'block' ? 'block' : 'unblock'
        );

        return sendText(sock, jid, 'Statut de blocage mis à jour.', msg);
      }

      case 'listblocked': {
        const b = await sock.fetchBlocklist();

        return sendText(sock, jid, `Bloqués : ${b.length}\n${b.map(jidNumber).join(', ') || 'Aucun'}`, msg);
      }

      case 'clear':
        return sendText(sock, jid, 'Aucun cache temporaire à effacer.', msg);

      case 'stats':
        return sendText(sock, jid, `Sessions actives : ${sessions.size}
Commandes : ${ALL_COMMANDS.length}
Uptime : ${duration(Date.now() - startedAt)}`, msg);

      case 'privacy':
        return sendText(sock, jid, 'Ne partage jamais ton code de pairing, ton PIN WhatsApp ou tes identifiants.', msg);

      case 'pairhelp':
        return sendText(sock, jid, 'Ouvre le site de pairing, saisis ton numéro avec indicatif sans +, puis entre le code dans WhatsApp > Appareils connectés.', msg);

      case 'menuimage':
        return sendMenu(sock, jid, msg);

      case 'autoread':
        cfg.autoread = !cfg.autoread;
        return sendText(sock, jid, `Lecture auto : ${cfg.autoread ? 'activée' : 'désactivée'}`, msg);

      case 'autotyping':
        return sendText(sock, jid, 'Simulation de saisie non activée dans cette version.', msg);

      case 'antispam':
        cfg.antispam = !cfg.antispam;
        return sendText(sock, jid, `Anti-spam : ${cfg.antispam ? 'activé' : 'désactivé'}`, msg);

      case 'filter': {
        const parts = rest.split('|');

        if (parts.length < 2) {
          return sendText(sock, jid, 'Format : .filter mot-clé|réponse', msg);
        }

        cfg.filters[parts[0].trim().toLowerCase()] =
          parts.slice(1).join('|').trim();

        return sendText(sock, jid, 'Réponse automatique enregistrée pour cette session.', msg);
      }

      case 'unfilter':
        delete cfg.filters[rest.toLowerCase()];
        return sendText(sock, jid, 'Filtre supprimé de cette session.', msg);

      case 'backup':
        return sendText(sock, jid, 'Les sessions sont stockées dans auth_info_baileys. Utilise un disque persistant Render.', msg);

      case 'rules':
        return sendText(sock, jid, 'Règles : respecte les membres, évite le spam, ne partage pas de liens dangereux et protège les comptes.', msg);
    }

  } catch (err) {
    console.error('Command error:', cmd, err?.message);

    return sendText(
      sock,
      jid,
      'Une erreur est survenue. Vérifie les permissions du bot et réessaie.',
      msg
    );
  }
}

// ===============================
// SESSION WHATSAPP
// UNE SEULE FONCTION startSession
// ===============================

async function startSession(phone) {
  const dir = path.join(AUTH_ROOT, phone);

  fs.mkdirSync(dir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(dir);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['KAYSEUR MDX', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
    syncFullHistory: false
  });

  const session = {
    sock,
    dir,
    connected: false,
    pairing: true,
    ready: null
  };

  sessions.set(phone, session);

  sock.ev.on('creds.update', saveCreds);

  let resolveReady;
  let rejectReady;
  let readyDone = false;

  session.ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  const readyTimer = setTimeout(() => {
    if (!readyDone) {
      readyDone = true;
      rejectReady(new Error('Délai de connexion dépassé'));
    }
  }, 25000);

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update;

    const current = sessions.get(phone);

    if (!current || current.sock !== sock) return;

    if (connection === 'connecting' || connection === 'open') {
      if (!readyDone) {
        readyDone = true;
        clearTimeout(readyTimer);
        resolveReady(true);
      }
    }

    if (connection === 'open') {
      current.connected = true;
      current.pairing = false;

      console.log('KAYSEUR MDX connecté :', phone);
    }

    if (connection === 'close') {
      current.connected = false;

      if (!readyDone) {
        readyDone = true;
        clearTimeout(readyTimer);
        rejectReady(new Error('Connexion WhatsApp fermée'));
      }

      const code = lastDisconnect?.error?.output?.statusCode;

      if (code === DisconnectReason.loggedOut) {
        sessions.delete(phone);
        console.log('Session déconnectée :', phone);
        return;
      }

      // Pendant une demande de pairing,
      // ne pas créer une deuxième connexion.

      if (current.pairing) {
        sessions.delete(phone);
        return;
      }

      // Reconnexion automatique.

      setTimeout(async () => {
        const latest = sessions.get(phone);

        if (!latest || latest.sock !== sock) return;

        try {
          await startSession(phone);
        } catch (err) {
          console.error('Erreur reconnexion :', err.message);
        }
      }, 5000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const m of messages) {
      if (m.message && !m.key.fromMe) {
        await handleCommand(sock, m);
      }
    }
  });

  sock.ev.on('group-participants.update', async update => {
    const cfg = getSettings(update.id);

    for (const participant of update.participants || []) {
      if (update.action === 'add' && cfg.welcome) {
        await sock.sendMessage(update.id, {
          text: stylize(
            `Bienvenue @${jidNumber(participant)} dans le groupe !`
          ),
          mentions: [participant]
        });
      }

      if (update.action === 'remove' && cfg.goodbye) {
        await sock.sendMessage(update.id, {
          text: stylize(
            `@${jidNumber(participant)} a quitté le groupe. À bientôt !`
          ),
          mentions: [participant]
        });
      }
    }
  });

  return sock;
}

// ===============================
// ROUTES SERVEUR
// ===============================

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    bot: BOT,
    sessions: sessions.size,
    commands: ALL_COMMANDS.length
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    commands: ALL_COMMANDS.length,
    bot: BOT
  });
});

// ===============================
// PAIRING CORRIGÉ
// ===============================

app.post('/api/pair', async (req, res) => {
  const phone = String(req.body?.phone || '').replace(/\D/g, '');

  if (phone.length < 8 || phone.length > 15) {
    return res.status(400).json({
      error: 'Numéro invalide. Ajoute ton indicatif sans le signe +.'
    });
  }

  if (pairingLocks.has(phone)) {
    return res.status(429).json({
      error: 'Une demande est déjà en cours. Patiente.'
    });
  }

  const last = pairingTimes.get(phone) || 0;

  if (Date.now() - last < 60000) {
    return res.status(429).json({
      error: 'Patiente une minute avant de demander un nouveau code.'
    });
  }

  pairingLocks.add(phone);

  let sock;

  try {
    const dir = path.join(AUTH_ROOT, phone);
    const credsPath = path.join(dir, 'creds.json');

    if (fs.existsSync(credsPath)) {
      try {
        const creds = JSON.parse(
          fs.readFileSync(credsPath, 'utf8')
        );

        if (creds.registered) {
          return res.status(409).json({
            error: 'Ce numéro possède déjà une session enregistrée.'
          });
        }
      } catch (err) {
        console.error('Lecture session :', err.message);
      }
    }

    // Vérifier une session existante.

    const oldSession = sessions.get(phone);

    if (oldSession?.connected) {
      return res.status(409).json({
        error: 'Ce numéro est déjà connecté.'
      });
    }

    // Nettoyer une ancienne session non connectée.

    if (oldSession) {
      sessions.delete(phone);

      try {
        oldSession.sock.end(undefined);
      } catch (err) {
        console.log('Nettoyage ancienne session :', err.message);
      }

      await wait(500);
    }

    // Créer UNE seule nouvelle session.

    sock = await startSession(phone);

    const session = sessions.get(phone);

    if (!session || session.sock !== sock) {
      throw new Error('Session introuvable');
    }

    // Attendre que la connexion démarre.

    await session.ready;
    await wait(1500);

    const current = sessions.get(phone);

    if (!current || current.sock !== sock) {
      throw new Error('La session a changé');
    }

    // Générer le code.

    const code = await sock.requestPairingCode(phone);

    current.pairing = false;

    pairingTimes.set(phone, Date.now());

    console.log('Code de pairing généré pour :', phone);

    return res.json({
      ok: true,
      code: code
    });

  } catch (err) {
    console.error('PAIRING ERROR:', err.message);

    const session = sessions.get(phone);

    if (session && session.sock === sock) {
      sessions.delete(phone);

      try {
        session.sock.end(undefined);
      } catch {}
    }

    return res.status(500).json({
      error: 'Connexion impossible. Vérifie le numéro et réessaie plus tard.'
    });

  } finally {
    pairingLocks.delete(phone);
  }
});

// ===============================
// DÉMARRAGE
// ===============================

app.listen(PORT, () => {
  console.log('================================');
  console.log(BOT + ' démarré');
  console.log('Port : ' + PORT);
  console.log('Commandes : ' + ALL_COMMANDS.length);
  console.log('================================');
});
