const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

const app = express();
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
const PORT = process.env.PORT || 10000;
const BOT = process.env.BOT_NAME || 'KAYSEUR MDX';
const OWNER = process.env.OWNER_NAME || 'MR KING KAYSEUR';
const CHANNEL = process.env.WHATSAPP_CHANNEL || 'https://whatsapp.com/channel/0029VbDvPxj0VycNWTvOrE0x';
const PREFIX = process.env.PREFIX || '.';
const AUTH_ROOT = path.join(__dirname, 'auth_info_baileys');
fs.mkdirSync(AUTH_ROOT, { recursive: true });

// Small-cap lettering used for all bot-authored text. URLs and command tokens remain usable.
const SMALL = {'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ғ','g':'ɢ','h':'ʜ','i':'ɪ','j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ','q':'ǫ','r':'ʀ','s':'s','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x','y':'ʏ','z':'ᴢ'};
function stylize(input='') {
  return String(input).split(/(https?:\/\/[^\s]+|\.[a-z0-9][a-z0-9_-]*)/gi).map(part => {
    if (/^https?:\/\//i.test(part) || /^\.[a-z0-9][a-z0-9_-]*$/i.test(part)) return part;
    return [...part].map(ch => SMALL[ch.toLowerCase()] || ch).join('');
  }).join('');
}
const box = (s) => `╭━━〔 ${s} 〕━━╮\n${stylize('│  KAYSEUR MDX')}\n╰━━━━━━━━━━━━╯`;
const COMMAND_GROUPS = {
  'GÉNÉRAL': ['menu','help','ping','alive','botinfo','owner','runtime','date','time','uptime','support','channel','prefix','about'],
  'FUN & TEXTE': ['joke','quote','fact','meme','compliment','truth','dare','ship','coin','roll','choose','8ball','reverse','upper','lower'],
  'OUTILS': ['calc','translate','shortlink','qr','weather','define','wiki','password','uuid','count','read','sticker','toimg','take','emojimix','poll'],
  'MÉDIAS': ['play','song','video','audio','lyrics','ytsearch','tiktok','instagram','facebook','media'],
  'GROUPE': ['tagall','hidetag','groupinfo','admins','members','linkgroup','revoke','setname','setdesc','welcome','goodbye','antilink','delete','promote','demote','kick','add','mute','unmute','lock','unlock','everyone'],
  'PROPRIÉTAIRE': ['broadcast','restart','shutdown','setprefix','setbotname','block','unblock','listblocked','clear','stats','privacy','report','feedback','pairhelp','menuimage','autoread','autotyping','antispam','filter','unfilter','backup','pingall','rules']
};
const ALL_COMMANDS = Object.values(COMMAND_GROUPS).flat();
if (ALL_COMMANDS.length !== 100) console.error('Expected 100 commands, got', ALL_COMMANDS.length);
const descriptions = {
 menu:'Afficher le menu des commandes',help:'Afficher l’aide',ping:'Tester la réponse du bot',alive:'Vérifier si le bot est actif',botinfo:'Informations du bot',owner:'Contacter le propriétaire',runtime:'Afficher la durée de fonctionnement',date:'Afficher la date',time:'Afficher l’heure',uptime:'Durée depuis le démarrage',support:'Informations de support',channel:'Lien de la chaîne WhatsApp',source:'Informations du projet',prefix:'Afficher le préfixe',about:'À propos de KAYSEUR MDX',
 joke:'Recevoir une blague',quote:'Recevoir une citation',fact:'Recevoir un fait',meme:'Idée de meme',compliment:'Recevoir un compliment',truth:'Question vérité',dare:'Défi amusant sans danger',ship:'Compatibilité fictive',coin:'Lancer une pièce',roll:'Lancer un dé',choose:'Choisir entre des options', '8ball':'Réponse aléatoire',reverse:'Inverser un texte',upper:'Mettre en majuscules',lower:'Mettre en minuscules',fancy:'Styliser un texte',
 calc:'Calculatrice simple',translate:'Lien vers un traducteur',shortlink:'Créer un lien court via un service externe',qr:'Créer un QR code via un lien',weather:'Lien météo',define:'Définition d’un mot',wiki:'Recherche encyclopédique',password:'Générer un mot de passe local',uuid:'Générer un identifiant',count:'Compter les mots et caractères',read:'Lire un texte cité',sticker:'Créer un sticker depuis une image/vidéo',toimg:'Convertir un sticker en image',take:'Renommer un sticker',emojimix:'Mélange emoji (texte)',poll:'Créer un mini-sondage',
 play:'Rechercher une musique et partager les liens officiels',song:'Envoyer un fichier audio depuis un lien direct autorisé',video:'Rechercher une vidéo',audio:'Aide pour envoyer un audio',lyrics:'Recherche de paroles via le web',ytsearch:'Rechercher sur YouTube',tiktok:'Ouvrir TikTok',instagram:'Ouvrir Instagram',facebook:'Ouvrir Facebook',media:'Aide médias',transcribe:'Aide à la transcription',
 tagall:'Mentionner les membres (admins)',hidetag:'Message sans liste visible (admins)',groupinfo:'Infos du groupe',admins:'Lister les admins',members:'Nombre de membres',linkgroup:'Lien du groupe',revoke:'Réinitialiser le lien (admins)',setname:'Changer le nom (admins)',setdesc:'Changer la description (admins)',welcome:'Activer/désactiver bienvenue',goodbye:'Activer/désactiver au revoir',antilink:'Activer/désactiver anti-lien',delete:'Supprimer un message cité (admins)',promote:'Promouvoir un membre (admins)',demote:'Rétrograder un membre (admins)',kick:'Retirer un membre (admins)',add:'Inviter un membre par numéro (admins)',mute:'Fermer le groupe (admins)',unmute:'Ouvrir le groupe (admins)',lock:'Fermer les paramètres du groupe (admins)',unlock:'Ouvrir les paramètres du groupe (admins)',everyone:'Mentionner tout le monde (admins)',
 broadcast:'Diffuser un message (propriétaire)',restart:'Redémarrer le processus (propriétaire)',shutdown:'Arrêter le bot (propriétaire)',setprefix:'Changer le préfixe (propriétaire)',setbotname:'Changer le nom affiché (propriétaire)',block:'Bloquer un utilisateur WhatsApp (propriétaire)',unblock:'Débloquer un utilisateur (propriétaire)',listblocked:'Lister les utilisateurs bloqués',clear:'Effacer le cache local',stats:'Statistiques du bot',privacy:'Conseils de confidentialité',report:'Signaler un problème au propriétaire',feedback:'Envoyer un avis au propriétaire',pairhelp:'Aide pour le pairing',menuimage:'Afficher l’image du menu',autoread:'Activer/désactiver la lecture auto',autotyping:'Activer/désactiver la simulation de saisie',antispam:'Activer/désactiver anti-spam',filter:'Créer une réponse automatique simple',unfilter:'Supprimer une réponse automatique',backup:'État de la sauvegarde de session',pingall:'Mentionner les membres (admins)',rules:'Afficher les règles du bot'
};
const startedAt = Date.now();
const sessions = new Map();
const settings = new Map();
const rate = new Map();
let currentPrefix = PREFIX;
function getSettings(id) { if (!settings.has(id)) settings.set(id, { welcome:true, goodbye:true, antilink:false, autoread:false, antispam:false, filters:{} }); return settings.get(id); }
function jidNumber(jid='') { return jid.split('@')[0].split(':')[0]; }
function isGroup(jid='') { return jid.endsWith('@g.us'); }
function argsText(args) { return args.join(' ').trim(); }
function duration(ms) { const s=Math.floor(ms/1000); return `${Math.floor(s/86400)}j ${Math.floor(s%86400/3600)}h ${Math.floor(s%3600/60)}m ${s%60}s`; }
async function sendText(sock, jid, text, quoted) { return sock.sendMessage(jid, { text: stylize(text) }, quoted ? { quoted } : {}); }
async function isAdmin(sock, group, sender) { try { const m=await sock.groupMetadata(group); const p=m.participants.find(x=>x.id===sender); return !!p && ['admin','superadmin'].includes(p.admin); } catch { return false; } }
async function isOwner(sender) { const n=jidNumber(sender); return (process.env.OWNER_NUMBERS||'').split(',').map(x=>x.replace(/\D/g,'')).filter(Boolean).includes(n); }
function menuText() {
 let out=`╔════════════════════════════╗\n║       ${BOT}       ║\n║     100 COMMANDES • MDX    ║\n╚════════════════════════════╝\n\n`;
 for (const [group, cmds] of Object.entries(COMMAND_GROUPS)) {
   out += `\n┏━━〔 ${group} 〕━━┓\n`;
   for (let i=0;i<cmds.length;i+=2) out += `┃ ${currentPrefix}${cmds[i]}${cmds[i+1] ? `  •  ${currentPrefix}${cmds[i+1]}` : ''}\n`;
   out += `┗━━━━━━━━━━━━━━━━━━┛\n`;
 }
 out += `\n╭━━〔 LIENS OFFICIELS 〕━━╮\n│ WhatsApp : ${CHANNEL}\n╰━━━━━━━━━━━━━━━━━━━━╯\n
${OWNER} • KAYSEUR MDX`;
 return stylize(out);
}
async function sendMenu(sock, jid, quoted) {
 const imagePath=path.join(__dirname,'assets','kayseur-mdx-menu.png');
 if (fs.existsSync(imagePath)) await sock.sendMessage(jid,{image:fs.readFileSync(imagePath)},{quoted});
 await sendText(sock,jid,menuText(),quoted);
 await sendText(sock,jid,`╭━━〔 VOIR LA CHAÎNE 〕━━╮\n${CHANNEL}\n╰━━━━━━━━━━━━━━━━━━━━╯`,quoted);
}
async function directAudio(sock,jid,url,quoted) {
  if (!/^https:\/\//i.test(url)) return sendText(sock,jid,'Utilise un lien HTTPS direct vers un fichier audio que tu as le droit de télécharger.',quoted);
  const u=new URL(url); if (['localhost','127.0.0.1'].includes(u.hostname) || u.hostname.endsWith('.local')) return sendText(sock,jid,'Lien non autorisé.',quoted);
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),12000);
  try {
    const res=await fetch(url,{signal:controller.signal,redirect:'error'}); const type=(res.headers.get('content-type')||'').toLowerCase();
    if(!res.ok || !type.startsWith('audio/')) return sendText(sock,jid,'Le lien doit pointer directement vers un fichier audio accessible (audio/*).',quoted);
    const len=Number(res.headers.get('content-length')||0); if(len>15*1024*1024) return sendText(sock,jid,'Fichier trop volumineux : limite 15 Mo.',quoted);
    const buf=Buffer.from(await res.arrayBuffer()); if(buf.length>15*1024*1024) return sendText(sock,jid,'Fichier trop volumineux : limite 15 Mo.',quoted);
    await sock.sendMessage(jid,{audio:buf,mimetype:type, ptt:false},{quoted});
  } catch(e) { await sendText(sock,jid,'Impossible de récupérer ce fichier. Vérifie le lien direct et réessaie.',quoted); }
  finally { clearTimeout(timer); }
}
async function handleCommand(sock,msg,sessionKey) {
 const jid=msg.key.remoteJid; const sender=msg.key.participant||msg.key.remoteJid; const fromMe=msg.key.fromMe;
 const body=msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '';
 if(!body) return;
 const cfg=getSettings(jid);
 if(cfg.autoread) await sock.readMessages([msg.key]).catch(()=>{});
 if(cfg.antispam && !fromMe) { const k=sender; const now=Date.now(); const last=rate.get(k)||0; if(now-last<1800) return; rate.set(k,now); }
 const matched=body.trim().match(new RegExp('^'+currentPrefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([\\w8-]+)(?:\\s+([\\s\\S]*))?$','i'));
 if(!matched) {
   if(isGroup(jid) && cfg.antilink && /https?:\/\//i.test(body) && await isAdmin(sock,jid,sender)===false) { await sock.sendMessage(jid,{delete:msg.key}).catch(()=>{}); await sendText(sock,jid,'Lien supprimé : anti-lien activé.'); }
   const key=body.toLowerCase().trim(); if(cfg.filters[key]) await sendText(sock,jid,cfg.filters[key],msg);
   return;
 }
 const cmd=matched[1].toLowerCase(); const args=(matched[2]||'').trim().split(/\s+/).filter(Boolean); const rest=matched[2]||'';
 if(!ALL_COMMANDS.includes(cmd)) return;
 const group=isGroup(jid); const admin=group?await isAdmin(sock,jid,sender):false; const owner=await isOwner(sender);
 const adminOnly=['tagall','hidetag','revoke','setname','setdesc','delete','promote','demote','kick','add','mute','unmute','lock','unlock','everyone','pingall'];
 const ownerOnly=['broadcast','restart','shutdown','setprefix','setbotname','block','unblock','listblocked','clear','autoread','autotyping','antispam','filter','unfilter','backup'];
 if(adminOnly.includes(cmd) && (!group || !admin)) return sendText(sock,jid,'Commande réservée aux administrateurs du groupe.',msg);
 if(ownerOnly.includes(cmd) && !owner) return sendText(sock,jid,'Commande réservée au propriétaire du bot.',msg);
 const quoted=msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
 const mentions=(msg.message?.extendedTextMessage?.contextInfo?.mentionedJid)||[];
 const target=mentions[0] || (msg.message?.extendedTextMessage?.contextInfo?.participant);
 const meta=group?await sock.groupMetadata(jid).catch(()=>null):null;
 try {
 switch(cmd) {
 case 'menu': case 'help': return sendMenu(sock,jid,msg);
 case 'ping': return sendText(sock,jid,`PONG • ${Date.now()-Number(msg.messageTimestamp||0)*1000} ms`,msg);
 case 'alive': return sendText(sock,jid,`╭━━〔 ${BOT} 〕━━╮\nStatut : EN LIGNE\nCommandes : 100\n╰━━━━━━━━━━━━╯`,msg);
 case 'botinfo': case 'about': return sendText(sock,jid,`${BOT}\nVersion 1.0.0\nCréateur : ${OWNER}\nPréfixe : ${currentPrefix}\nCommandes : 100`,msg);
 case 'owner': case 'support': case 'feedback': case 'report': return sendText(sock,jid,`Propriétaire : ${OWNER}\nAjoute le numéro du propriétaire dans OWNER_NUMBERS pour activer le contact direct.`,msg);
 case 'runtime': case 'uptime': return sendText(sock,jid,`En ligne depuis : ${duration(Date.now()-startedAt)}`,msg);
 case 'date': return sendText(sock,jid,new Date().toLocaleDateString('fr-FR'),msg);
 case 'time': return sendText(sock,jid,new Date().toLocaleTimeString('fr-FR'),msg);
 case 'channel': return sendText(sock,jid,`Chaîne WhatsApp officielle : ${CHANNEL}`,msg);
 case 'source': return sendText(sock,jid,'Projet Node.js • Baileys • Express • Render',msg);
 case 'prefix': return sendText(sock,jid,`Préfixe actuel : ${currentPrefix}`,msg);
 case 'joke': return sendText(sock,jid,['Pourquoi le développeur aime le calme ? Parce qu’il déteste les bugs bruyants.','Un bot entre dans un groupe… tout le monde lui demande le menu.','Pourquoi JavaScript est rapide ? Il ne perd pas son temps à compiler ses excuses.'][Math.floor(Math.random()*3)],msg);
 case 'quote': return sendText(sock,jid,['La constance transforme les petits pas en grands résultats.','Apprends, teste, corrige et recommence.','Le progrès commence quand tu passes à l’action.'][Math.floor(Math.random()*3)],msg);
 case 'fact': return sendText(sock,jid,'Fait : un jour terrestre dure environ 24 heures, mais la rotation réelle varie légèrement.',msg);
 case 'meme': return sendText(sock,jid,'Idée meme : « Moi : juste une petite modification. Le projet : 47 nouveaux bugs. »',msg);
 case 'compliment': return sendText(sock,jid,'Tu progresses à ton rythme : continue à apprendre et à créer.',msg);
 case 'truth': return sendText(sock,jid,'Vérité : quelle compétence aimerais-tu maîtriser cette année ?',msg);
 case 'dare': return sendText(sock,jid,'Défi : apprends un nouveau raccourci clavier aujourd’hui et montre-le à un ami.',msg);
 case 'ship': return sendText(sock,jid,'Compatibilité fictive : 99 % de bonne humeur ✨',msg);
 case 'coin': return sendText(sock,jid,Math.random()<.5?'Pile !':'Face !',msg);
 case 'roll': return sendText(sock,jid,`Résultat du dé : ${1+Math.floor(Math.random()*6)}`,msg);
 case 'choose': return sendText(sock,jid,`Choix : ${(rest.split('|').map(x=>x.trim()).filter(Boolean)[Math.floor(Math.random()*rest.split('|').length)]||'Ajoute des options séparées par |')}`,msg);
 case '8ball': return sendText(sock,jid,['Oui.','Pas maintenant.','C’est possible.','Essaie encore plus tard.'][Math.floor(Math.random()*4)],msg);
 case 'reverse': return sendText(sock,jid,[...rest].reverse().join(''),msg);
 case 'upper': return sendText(sock,jid,rest.toLocaleUpperCase('fr-FR'),msg);
 case 'lower': return sendText(sock,jid,rest.toLocaleLowerCase('fr-FR'),msg);
 case 'fancy': return sendText(sock,jid,rest.split('').map(c=>c===' '?'　':c).join(''),msg);
 case 'calc': { if(!/^[0-9+*/().% -]+$/.test(rest)) return sendText(sock,jid,'Expression non valide. Exemple : .calc 12*(5+2)',msg); const result=Function('"use strict";return ('+rest+')')(); return sendText(sock,jid,`Résultat : ${result}`,msg); }
 case 'translate': return sendText(sock,jid,`Traducteur : https://translate.google.com/?sl=auto&tl=fr&text=${encodeURIComponent(rest)}`,msg);
 case 'shortlink': return sendText(sock,jid,'Pour raccourcir un lien, utilise un service de confiance comme https://tinyurl.com/ . Ne raccourcis pas des liens suspects.',msg);
 case 'qr': return sendText(sock,jid,`QR code : https://quickchart.io/qr?text=${encodeURIComponent(rest||'KAYSEUR MDX')}`,msg);
 case 'weather': return sendText(sock,jid,`Météo : https://wttr.in/${encodeURIComponent(rest||'Brazzaville')}`,msg);
 case 'define': return sendText(sock,jid,`Définition : https://fr.wiktionary.org/wiki/${encodeURIComponent(rest)}`,msg);
 case 'wiki': return sendText(sock,jid,`Recherche : https://fr.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(rest)}`,msg);
 case 'password': return sendText(sock,jid,`Mot de passe temporaire : ${require('crypto').randomBytes(9).toString('base64url')}\nNe le réutilise pas et conserve-le dans un gestionnaire sécurisé.`,msg);
 case 'uuid': return sendText(sock,jid,require('crypto').randomUUID(),msg);
 case 'count': return sendText(sock,jid,`Mots : ${rest.trim()?rest.trim().split(/\s+/).length:0}\nCaractères : ${rest.length}`,msg);
 case 'read': return sendText(sock,jid,rest||'Ajoute le texte après la commande.',msg);
 case 'sticker': return sendText(sock,jid,'Réponds à une image ou vidéo avec .sticker. (Le convertisseur sticker est prévu dans une prochaine version.)',msg);
 case 'toimg': case 'take': return sendText(sock,jid,'Cette commande nécessite le module de conversion média. Envoie une image avec .sticker pour le flux de création.',msg);
 case 'emojimix': return sendText(sock,jid,`Emoji : ${rest||'✨ + 👑'}`,msg);
 case 'poll': return sendText(sock,jid,`Sondage : ${rest||'Écris ta question et les choix.'}\nLes votes peuvent être lancés avec le sondage natif WhatsApp.`,msg);
 case 'play': case 'ytsearch': case 'video': return sendText(sock,jid,`Recherche média : https://www.youtube.com/results?search_query=${encodeURIComponent(rest)}\nUtilise les plateformes officielles et respecte les droits des créateurs.`,msg);
 case 'song': return directAudio(sock,jid,rest,msg);
 case 'audio': case 'media': return sendText(sock,jid,'Pour .song, fournis un lien HTTPS direct vers un fichier audio que tu es autorisé à télécharger. Taille maximale : 15 Mo.',msg);
 case 'lyrics': return sendText(sock,jid,`Recherche de paroles : https://www.google.com/search?q=${encodeURIComponent(rest+' paroles')}`,msg);
 case 'tiktok': return sendText(sock,jid,`TikTok : https://www.tiktok.com/search?q=${encodeURIComponent(rest)}`,msg);
 case 'instagram': return sendText(sock,jid,`Instagram : https://www.instagram.com/`,msg);
 case 'facebook': return sendText(sock,jid,`Facebook : https://www.facebook.com/`,msg);
 case 'transcribe': return sendText(sock,jid,'Transcription : utilise la fonction de transcription audio de ton téléphone ou de WhatsApp si disponible.',msg);
 case 'groupinfo': return sendText(sock,jid,meta?`Nom : ${meta.subject}\nMembres : ${meta.participants.length}\nDescription : ${meta.desc||'Aucune'}`:'Cette commande fonctionne dans un groupe.',msg);
 case 'admins': return sendText(sock,jid,meta?`Admins :\n${meta.participants.filter(p=>p.admin).map(p=>'• @'+jidNumber(p.id)).join('\n')||'Aucun'}`:'Groupe uniquement.',msg);
 case 'members': return sendText(sock,jid,meta?`Membres : ${meta.participants.length}`:'Groupe uniquement.',msg);
 case 'linkgroup': { if(!group) return sendText(sock,jid,'Groupe uniquement.',msg); const code=await sock.groupInviteCode(jid); return sendText(sock,jid,`Lien du groupe : https://chat.whatsapp.com/${code}`,msg); }
 case 'revoke': { const c=await sock.groupRevokeInvite(jid); return sendText(sock,jid,`Nouveau lien : https://chat.whatsapp.com/${c}`,msg); }
 case 'setname': await sock.groupUpdateSubject(jid,rest); return sendText(sock,jid,'Nom du groupe modifié.',msg);
 case 'setdesc': await sock.groupUpdateDescription(jid,rest); return sendText(sock,jid,'Description modifiée.',msg);
 case 'welcome': cfg.welcome=!cfg.welcome; return sendText(sock,jid,`Bienvenue : ${cfg.welcome?'activée':'désactivée'}`,msg);
 case 'goodbye': cfg.goodbye=!cfg.goodbye; return sendText(sock,jid,`Au revoir : ${cfg.goodbye?'activé':'désactivé'}`,msg);
 case 'antilink': cfg.antilink=!cfg.antilink; return sendText(sock,jid,`Anti-lien : ${cfg.antilink?'activé':'désactivé'}`,msg);
 case 'delete': { const ctx=msg.message?.extendedTextMessage?.contextInfo; if(!ctx?.stanzaId) return sendText(sock,jid,'Réponds au message à supprimer.',msg); return sock.sendMessage(jid,{delete:{remoteJid:jid,id:ctx.stanzaId,participant:ctx.participant||sender,fromMe:ctx.participant===sock.user.id}}); }
 case 'promote': case 'demote': case 'kick': { if(!target) return sendText(sock,jid,'Mentionne un membre ou réponds à son message.',msg); const action=cmd==='promote'?'promote':cmd==='demote'?'demote':'remove'; await sock.groupParticipantsUpdate(jid,[target],action); return sendText(sock,jid,'Action effectuée.',msg); }
 case 'add': { const n=rest.replace(/\D/g,''); if(n.length<8) return sendText(sock,jid,'Indique un numéro avec indicatif, sans +.',msg); await sock.groupParticipantsUpdate(jid,[n+'@s.whatsapp.net'],'add'); return sendText(sock,jid,'Demande d’ajout envoyée si les paramètres du groupe le permettent.',msg); }
 case 'mute': await sock.groupSettingUpdate(jid,'announcement'); return sendText(sock,jid,'Seuls les admins peuvent envoyer des messages.',msg);
 case 'unmute': await sock.groupSettingUpdate(jid,'not_announcement'); return sendText(sock,jid,'Tous les membres peuvent envoyer des messages.',msg);
 case 'lock': await sock.groupSettingUpdate(jid,'locked'); return sendText(sock,jid,'Paramètres du groupe verrouillés aux admins.',msg);
 case 'unlock': await sock.groupSettingUpdate(jid,'unlocked'); return sendText(sock,jid,'Paramètres du groupe ouverts aux membres.',msg);
 case 'tagall': case 'everyone': case 'pingall': case 'hidetag': { const ps=meta.participants.map(p=>p.id); const text=rest||'Annonce du groupe'; return sock.sendMessage(jid,{text:stylize(text+'\n'+(cmd==='hidetag'?'':ps.map(x=>'@'+jidNumber(x)).join(' '))),mentions:ps}); }
 case 'broadcast': return sendText(sock,jid,'La diffusion multi-groupes est désactivée par sécurité. Envoie les annonces dans tes propres groupes.',msg);
 case 'restart': return sendText(sock,jid,'Redémarrage demandé. Le service Render peut relancer le processus automatiquement.',msg);
 case 'shutdown': return sendText(sock,jid,'Arrêt manuel désactivé sur cette version hébergée.',msg);
 case 'setprefix': if(!rest || rest.length>3) return sendText(sock,jid,'Exemple : .setprefix !',msg); currentPrefix=rest; return sendText(sock,jid,`Nouveau préfixe : ${currentPrefix}`,msg);
 case 'setbotname': return sendText(sock,jid,'Pour modifier le nom, change BOT_NAME dans les variables Render.',msg);
 case 'block': case 'unblock': { if(!target) return sendText(sock,jid,'Mentionne un utilisateur.',msg); await sock.updateBlockStatus(target,cmd==='block'?'block':'unblock'); return sendText(sock,jid,'Statut de blocage mis à jour.',msg); }
 case 'listblocked': { const b=await sock.fetchBlocklist(); return sendText(sock,jid,`Bloqués : ${b.length}\n${b.map(jidNumber).join(', ')||'Aucun'}`,msg); }
 case 'clear': return sendText(sock,jid,'Aucun cache temporaire à effacer.',msg);
 case 'stats': return sendText(sock,jid,`Sessions actives : ${sessions.size}\nCommandes : ${ALL_COMMANDS.length}\nUptime : ${duration(Date.now()-startedAt)}`,msg);
 case 'privacy': return sendText(sock,jid,'Conseil : ne partage jamais ton code de pairing, ton code PIN WhatsApp ou tes identifiants.',msg);
 case 'pairhelp': return sendText(sock,jid,`Ouvre le site de pairing hébergé sur Render, saisis ton numéro avec indicatif sans +, puis entre le code dans WhatsApp > Appareils connectés. Utilise ton propre compte.`,msg);
 case 'menuimage': return sendMenu(sock,jid,msg);
 case 'autoread': cfg.autoread=!cfg.autoread; return sendText(sock,jid,`Lecture auto : ${cfg.autoread?'activée':'désactivée'}`,msg);
 case 'autotyping': return sendText(sock,jid,'Simulation de saisie non activée dans cette version.',msg);
 case 'antispam': cfg.antispam=!cfg.antispam; return sendText(sock,jid,`Anti-spam : ${cfg.antispam?'activé':'désactivé'}`,msg);
 case 'filter': { const parts=rest.split('|'); if(parts.length<2) return sendText(sock,jid,'Format : .filter mot-clé|réponse',msg); cfg.filters[parts[0].trim().toLowerCase()]=parts.slice(1).join('|').trim(); return sendText(sock,jid,'Réponse automatique enregistrée pour cette session.',msg); }
 case 'unfilter': delete cfg.filters[rest.toLowerCase()]; return sendText(sock,jid,'Filtre supprimé de cette session.',msg);
 case 'backup': return sendText(sock,jid,'Les sessions sont stockées dans auth_info_baileys. Active un disque persistant Render pour les conserver.',msg);
 case 'rules': return sendText(sock,jid,'Règles : respecte les membres, évite le spam, ne partage pas de liens dangereux et protège les comptes.',msg);
 }
 } catch(err) { console.error('Command error',cmd,err?.message); return sendText(sock,jid,'Une erreur est survenue. Vérifie les permissions du bot et réessaie.',msg); }
}
async function startSession(phone) {
 const dir=path.join(AUTH_ROOT,phone); fs.mkdirSync(dir,{recursive:true});
 const {state,saveCreds}=await useMultiFileAuthState(dir);
 const sock=makeWASocket({auth:state,logger:pino({level:'silent'}),printQRInTerminal:false,browser:['KAYSEUR MDX','Chrome','1.0.0'],markOnlineOnConnect:false,syncFullHistory:false});
 sessions.set(phone,{sock,dir,connected:false});
 sock.ev.on('creds.update',saveCreds);
 sock.ev.on('connection.update',async update=>{
   const {connection,lastDisconnect}=update;
   if(connection==='open') { const s=sessions.get(phone); if(s) s.connected=true; console.log('Connected session',phone); }
   if(connection==='close') { const s=sessions.get(phone); if(s) s.connected=false; const code=lastDisconnect?.error?.output?.statusCode; if(code!==DisconnectReason.loggedOut) { setTimeout(()=>startSession(phone).catch(console.error),5000); } else { sessions.delete(phone); } }
 });
 sock.ev.on('messages.upsert',async ({messages,type})=>{ if(type!=='notify') return; for(const m of messages) if(m.message && !m.key.fromMe) await handleCommand(sock,m,phone); });
 sock.ev.on('group-participants.update',async update=>{ const cfg=getSettings(update.id); for(const participant of (update.participants||[])) { if(update.action==='add' && cfg.welcome) await sock.sendMessage(update.id,{text:stylize(`Bienvenue @${jidNumber(participant)} dans le groupe !`),mentions:[participant]}); if(update.action==='remove' && cfg.goodbye) await sock.sendMessage(update.id,{text:stylize(`@${jidNumber(participant)} a quitté le groupe. À bientôt !`),mentions:[participant]}); } });
 return sock;
}
const pending=new Map();
app.get('/health',(req,res)=>res.json({ok:true,bot:BOT,sessions:sessions.size,commands:ALL_COMMANDS.length}));
app.get('/api/status',(req,res)=>res.json({ok:true,commands:ALL_COMMANDS.length,bot:BOT}));
app.post('/api/pair',async(req,res)=>{
 const phone=String(req.body?.phone||'').replace(/\D/g,'');
 if(phone.length<8 || phone.length>15) return res.status(400).json({error:'Numéro invalide. Ajoute l’indicatif du pays sans le signe +.'});
 const now=Date.now(), last=pending.get(phone)||0; if(now-last<60000) return res.status(429).json({error:'Patiente une minute avant de demander un nouveau code.'}); pending.set(phone,now);
 try {
   const dir=path.join(AUTH_ROOT,phone); const credsPath=path.join(dir,'creds.json');
   if(fs.existsSync(credsPath)) { try { const c=JSON.parse(fs.readFileSync(credsPath,'utf8')); if(c.registered) return res.status(409).json({error:'Ce numéro possède déjà une session enregistrée sur ce serveur.'}); } catch{} }
   let sock=sessions.get(phone)?.sock;
   // ===============================
// KAYSEUR MDX - PAIRING CORRIGÉ
// ===============================

const pairingLocks = new Map();
const pairingTimes = new Map();

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
    pairing: true
  };

  sessions.set(phone, session);

  sock.ev.on('creds.update', saveCreds);

  // Attendre que la connexion démarre réellement
  session.ready = new Promise((resolve, reject) => {
    let finished = false;

    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        reject(new Error('Délai de connexion dépassé'));
      }
    }, 20000);

    sock.ev.on('connection.update', update => {
      if (finished) return;

      if (update.connection === 'connecting' ||
          update.connection === 'open') {
        finished = true;
        clearTimeout(timeout);
        resolve(true);
      }

      if (update.connection === 'close') {
        finished = true;
        clearTimeout(timeout);
        reject(new Error('Connexion WhatsApp fermée'));
      }
    });
  });

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      const current = sessions.get(phone);
      if (current && current.sock === sock) {
        current.connected = true;
        current.pairing = false;
      }

      console.log('KAYSEUR MDX connecté :', phone);
    }

    if (connection === 'close') {
      const current = sessions.get(phone);

      if (current && current.sock === sock) {
        current.connected = false;
      }

      const code = lastDisconnect?.error?.output?.statusCode;

      if (code === DisconnectReason.loggedOut) {
        if (current && current.sock === sock) {
          sessions.delete(phone);
        }
        return;
      }

      // Ne pas créer plusieurs sockets pendant le pairing.
      if (current && current.sock === sock && current.pairing) {
        sessions.delete(phone);
        return;
      }

      // Reconnexion uniquement pour la session encore active.
      if (current && current.sock === sock) {
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
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const m of messages) {
      if (m.message && !m.key.fromMe) {
        await handleCommand(sock, m, phone);
      }
    }
  });

  sock.ev.on('group-participants.update', async update => {
    const cfg = getSettings(update.id);

    for (const participant of (update.participants || [])) {
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
// ROUTES DU SITE ET DU PAIRING
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

app.post('/api/pair', async (req, res) => {
  const phone = String(req.body?.phone || '').replace(/\D/g, '');

  if (phone.length < 8 || phone.length > 15) {
    return res.status(400).json({
      error: 'Numéro invalide. Ajoute ton indicatif sans le signe +.'
    });
  }

  // Empêcher plusieurs demandes simultanées pour le même numéro.
  if (pairingLocks.has(phone)) {
    return res.status(429).json({
      error: 'Une demande est déjà en cours. Patiente quelques instants.'
    });
  }

  // Petite protection contre les demandes répétées.
  const last = pairingTimes.get(phone) || 0;

  if (Date.now() - last < 15000) {
    return res.status(429).json({
      error: 'Patiente quelques secondes avant de redemander un code.'
    });
  }

  pairingLocks.set(phone, true);
  pairingTimes.set(phone, Date.now());

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
        console.log('Lecture session :', err.message);
      }
    }

    // Créer un seul socket pour ce numéro.
    let session = sessions.get(phone);

    if (session && session.connected) {
      return res.status(409).json({
        error: 'Ce numéro est déjà connecté.'
      });
    }

    if (session && session.pairing) {
      return res.status(429).json({
        error: 'Un code a déjà été demandé. Vérifie WhatsApp.'
      });
    }

    const sock = await startSession(phone);
    session = sessions.get(phone);

    // Attendre le démarrage de la connexion.
    await session.ready;

    // Laisser le temps au socket de se stabiliser.
    await wait(1500);

    // Vérifier que le socket est toujours celui de la session.
    const current = sessions.get(phone);

    if (!current || current.sock !== sock) {
      throw new Error('La session a changé pendant le pairing.');
    }

    // Demander le code une seule fois.
    const code = await sock.requestPairingCode(phone);

    console.log('Code de pairing généré pour :', phone);

    return res.json({
      ok: true,
      code
    });

  } catch (err) {
    console.error('PAIRING ERROR :', err.message);

    const session = sessions.get(phone);

    if (session && !session.connected) {
      sessions.delete(phone);

      try {
        session.sock.end(undefined);
      } catch {}
    }

    return res.status(500).json({
      error: 'Connexion impossible. Patiente un instant puis réessaie.'
    });

  } finally {
    pairingLocks.delete(phone);
  }
});

app.listen(PORT, () => {
  console.log(`${BOT} pairing server listening on ${PORT}`);
});
