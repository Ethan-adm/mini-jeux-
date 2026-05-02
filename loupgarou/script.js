import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, onDisconnect, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDTX0_aUssO0gzY5YrnXJWYtsC1SKkWKZQ",
    authDomain: "minijeux-ethan.firebaseapp.com",
    databaseURL: "https://minijeux-ethan-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "minijeux-ethan",
    storageBucket: "minijeux-ethan.firebasestorage.app",
    messagingSenderId: "494501305767",
    appId: "1:494501305767:web:48a4acd2e836f68f036a82"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let myPlayerId = "joueur_" + Math.random().toString(36).substr(2, 9);
let currentRoom = "";
let amIAdmin = false;
let currentPlayers = {}; 
let gameMode = "humain";
let currentPhase = ""; // Pour le mode auto

// --- FONCTION POUR FAIRE PARLER LE TELEPHONE ---
function parler(texte) {
    if ('speechSynthesis' in window) {
        const voix = new SpeechSynthesisUtterance(texte);
        voix.lang = 'fr-FR';
        voix.rate = 0.9; // Vitesse un peu lente pour faire peur
        window.speechSynthesis.speak(voix);
    }
}

// 1. REJOINDRE
document.getElementById('join-btn').addEventListener('click', () => {
    let name = document.getElementById('player-name').value.trim();
    const room = document.getElementById('room-code').value.trim().toUpperCase();

    if (!name || !room) return alert("Saisis un pseudo et un code !");

    if (name.toLowerCase() === "admin") {
        amIAdmin = true;
        name = "👑 Admin"; 
    }

    currentRoom = room;
    const playerRef = ref(db, `rooms/${room}/players/${myPlayerId}`);
    onDisconnect(playerRef).remove(); 

    set(playerRef, { name: name, role: "En attente", isDead: false });

    if (amIAdmin) {
        set(ref(db, `rooms/${room}/status`), "lobby");
        set(ref(db, `rooms/${room}/voteActive`), false);
        set(ref(db, `rooms/${room}/wolfVoteActive`), false);
        set(ref(db, `rooms/${room}/autoPhase`), "start");
    }

    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('lobby-screen').classList.add('active');
    document.getElementById('display-room-code').textContent = room;

    if (amIAdmin) {
        document.getElementById('admin-panel').style.display = "block";
        document.getElementById('waiting-msg').style.display = "none";
    }

    // ECOUTE JOUEURS
    onValue(ref(db, `rooms/${room}/players`), (snapshot) => {
        currentPlayers = snapshot.val() || {};
        if(document.getElementById('lobby-screen').classList.contains('active')) updateLobby(currentPlayers);
        if(document.getElementById('narrator-screen').classList.contains('active')) updateNarratorScreen(currentPlayers);

        if(currentPlayers[myPlayerId] && currentPlayers[myPlayerId].isDead && document.getElementById('game-screen').classList.contains('active')) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('dead-screen').classList.add('active');
        }
    });

    // ECOUTE LANCEMENT JEU
    onValue(ref(db, `rooms/${room}/status`), (snapshot) => {
        if (snapshot.val() === "role_reveal") {
            onValue(ref(db, `rooms/${room}/mode`), (modeSnap) => {
                gameMode = modeSnap.val();
                if (amIAdmin) {
                    showNarratorScreen();
                    document.getElementById(gameMode === "auto" ? 'auto-controls' : 'human-controls').style.display = "block";
                } else {
                    showRoleScreen();
                }
            }, {onlyOnce: true});
        }
    });

    // ==========================================
    // MOTEUR DU MODE AUTOMATIQUE (POUR LES JOUEURS)
    // ==========================================
    onValue(ref(db, `rooms/${room}/autoPhase`), (snapshot) => {
        if(gameMode !== "auto") return;
        const phase = snapshot.val();
        currentPhase = phase;
        
        const nightCover = document.getElementById('night-cover');
        const msgDisplay = document.getElementById('auto-narrator-msg');
        const autoBox = document.getElementById('auto-narrator-display');

        // Réinitialiser les votes à chaque phase
        document.getElementById('vote-zone').style.display = "none";

        if (phase === "nuit") {
            nightCover.style.display = 'flex';
            parler("La nuit tombe sur le village. Tout le monde ferme les yeux.");
        } 
        else if (phase === "loups") {
            if (currentPlayers[myPlayerId].role === "🐺 Loup-Garou" && !currentPlayers[myPlayerId].isDead) {
                nightCover.style.display = 'none'; // Les loups se réveillent
                document.getElementById('vote-zone').style.display = "block";
                document.getElementById('vote-title').textContent = "🐺 Vote des Loups (Choisis ta victime)";
                renderVoteButtons("loups");
                parler("Les loups-garous se réveillent, et choisissent leur victime.");
            } else {
                nightCover.style.display = 'flex'; // Les autres dorment
            }
        }
        else if (phase === "jour") {
            nightCover.style.display = 'none';
            autoBox.style.display = "block";
            autoBox.textContent = "Le soleil se lève sur le village... Regardez qui est mort.";
            parler("Le soleil se lève. Le village se réveille... et découvre les morts.");
            
            // Le calcul des morts se fait par l'admin au clic, les joueurs le verront direct via 'isDead'
        }
        else if (phase === "vote_village") {
            nightCover.style.display = 'none';
            if (!currentPlayers[myPlayerId].isDead) {
                document.getElementById('vote-zone').style.display = "block";
                document.getElementById('vote-title').textContent = "🗳️ Vote du Village";
                renderVoteButtons("village");
                parler("C'est l'heure du vote. Le village doit éliminer un suspect.");
            }
        }
    });

    // ECOUTE DES VOTES (NARRATEUR HUMAIN & AUTO)
    onValue(ref(db, `rooms/${room}/votes`), (snapshot) => {
        if(!amIAdmin) return;
        const votes = snapshot.val() || {};
        const results = {};
        for(let voter in votes) results[votes[voter]] = (results[votes[voter]] || 0) + 1;

        const list = document.getElementById('vote-results');
        list.innerHTML = "";
        Object.entries(results).sort((a,b) => b[1] - a[1]).forEach(([name, count]) => {
            const li = document.createElement('li');
            li.style.padding = "5px"; li.style.background = "transparent"; li.style.border = "none";
            li.innerHTML = `<strong>${name}</strong> : <span style="color:#e94560">${count} voix</span>`;
            list.appendChild(li);
        });
    });
});

// 2. AFFICHER LOBBY
function updateLobby(players) {
    const list = document.getElementById('player-list');
    list.innerHTML = "";
    document.getElementById('player-count').textContent = Object.keys(players).length;
    for (let id in players) {
        const li = document.createElement('li');
        li.textContent = players[id].name;
        if (id === myPlayerId) { li.textContent += " (Toi)"; li.style.color = "#e94560"; }
        list.appendChild(li);
    }
}

// 3. LANCER ET DISTRIBUER
document.getElementById('start-game-btn').addEventListener('click', () => {
    const mode = document.getElementById('game-mode').value;
    const allIds = Object.keys(currentPlayers).filter(id => id !== myPlayerId);
    if (allIds.length === 0) return alert("Il faut des joueurs !");

    const rolesPool = [];
    for(let i=0; i<parseInt(document.getElementById('wolf-count').value); i++) rolesPool.push("🐺 Loup-Garou");
    
    // Pour la V1 du mode auto, on limite aux Loups et Villageois
    if (mode === "humain") {
        if(document.getElementById('role-voyante').checked) rolesPool.push("👁️ Voyante");
        if(document.getElementById('role-sorciere').checked) rolesPool.push("🧙‍♀️ Sorcière");
        if(document.getElementById('role-cupidon').checked) rolesPool.push("🏹 Cupidon");
        if(document.getElementById('role-chasseur').checked) rolesPool.push("🔫 Chasseur");
    }

    if (rolesPool.length > allIds.length) return alert("Trop de rôles spéciaux !");
    while(rolesPool.length < allIds.length) rolesPool.push("🧑‍🌾 Simple Villageois");

    for (let i = rolesPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rolesPool[i], rolesPool[j]] = [rolesPool[j], rolesPool[i]];
    }

    let updates = {};
    allIds.forEach((id, i) => updates[`rooms/${currentRoom}/players/${id}/role`] = rolesPool[i]);
    updates[`rooms/${currentRoom}/status`] = "role_reveal";
    updates[`rooms/${currentRoom}/mode`] = mode;
    update(ref(db), updates);
});

function showRoleScreen() {
    document.getElementById('lobby-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    document.getElementById('my-role-display').textContent = currentPlayers[myPlayerId].role;
    
    // Pour que la voix s'active, il faut une interaction de l'utilisateur (cliquer sur la carte role)
}

function showNarratorScreen() {
    document.getElementById('lobby-screen').classList.remove('active');
    document.getElementById('narrator-screen').classList.add('active');
    updateNarratorScreen(currentPlayers);
}

function updateNarratorScreen(players) {
    const list = document.getElementById('narrator-player-list');
    list.innerHTML = "";
    for (let id in players) {
        if (id === myPlayerId) continue;
        const p = players[id];
        const li = document.createElement('li');
        if(p.isDead) {
            li.innerHTML = `<span style="text-decoration:line-through; color:#888;">${p.name}</span> <span style="color:#ff0000">Mort</span>`;
        } else {
            li.innerHTML = `<span>${p.name} <br><small style="color:#e94560">${p.role}</small></span>`;
            const btn = document.createElement('button');
            btn.className = "kill-btn"; btn.textContent = "Tuer 💀";
            btn.onclick = () => { if(confirm("Tuer " + p.name + " ?")) update(ref(db, `rooms/${currentRoom}/players/${id}`), {isDead: true}); };
            li.appendChild(btn);
        }
        list.appendChild(li);
    }
}

// ==========================================
// MOTEUR ADMIN : MODE AUTOMATIQUE
// ==========================================
let autoSteps = ["nuit", "loups", "jour", "vote_village"];
let currentStepIndex = -1;

document.getElementById('btn-next-phase').addEventListener('click', () => {
    currentStepIndex++;
    if(currentStepIndex >= autoSteps.length) currentStepIndex = 0; // On boucle
    
    const nextPhase = autoSteps[currentStepIndex];
    document.getElementById('admin-auto-status').textContent = `Phase en cours : ${nextPhase.toUpperCase()}`;
    
    // On efface les votes précédents à chaque nouvelle phase
    update(ref(db, `rooms/${currentRoom}`), { autoPhase: nextPhase, votes: null });
});

// ==========================================
// FONCTIONS DE VOTE (JOUEURS)
// ==========================================
function renderVoteButtons(type) {
    const list = document.getElementById('vote-list');
    list.innerHTML = "";
    for (let id in currentPlayers) {
        if (id === myPlayerId || currentPlayers[id].isDead || currentPlayers[id].role === "En attente") continue;
        
        // Un loup ne peut pas voter contre un autre loup pendant la nuit
        if (type === "loups" && currentPlayers[id].role === "🐺 Loup-Garou") continue;

        const btn = document.createElement('button');
        btn.textContent = currentPlayers[id].name;
        btn.style.background = "#2a3a5a"; btn.style.padding = "10px"; btn.style.margin = "0";
        btn.onclick = () => {
            set(ref(db, `rooms/${currentRoom}/votes/${myPlayerId}`), currentPlayers[id].name);
            document.getElementById('my-vote-status').textContent = `Choix validé : ${currentPlayers[id].name}`;
        };
        list.appendChild(btn);
    }
}

// CARTE ROLE
const roleCard = document.getElementById('role-card'), roleDisplay = document.getElementById('my-role-display'), roleInst = document.getElementById('role-instruction');
const show = () => { roleDisplay.style.display = "block"; roleInst.style.display = "none"; window.speechSynthesis.resume(); };
const hide = () => { roleDisplay.style.display = "none"; roleInst.style.display = "block"; };
roleCard.addEventListener('mousedown', show); roleCard.addEventListener('touchstart', show);
roleCard.addEventListener('mouseup', hide); roleCard.addEventListener('touchend', hide);
