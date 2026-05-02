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

// --- GESTION DE LA VOIX ---
let lastSpokenPhase = "";
function parler(texte, phase) {
    if (lastSpokenPhase === phase) return; 
    lastSpokenPhase = phase;
    
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 
        const voix = new SpeechSynthesisUtterance(texte);
        voix.lang = 'fr-FR';
        voix.rate = 0.95;
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
        set(ref(db, `rooms/${room}/autoPhase`), "start");
        set(ref(db, `rooms/${room}/votes`), null);
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
                if (gameMode === "humain" && amIAdmin) {
                    showNarratorScreen();
                } else {
                    showRoleScreen();
                    if (gameMode === "auto" && amIAdmin) {
                        document.getElementById('admin-auto-bar').style.display = "flex";
                    }
                }
            }, {onlyOnce: true});
        }
    });

    // ECOUTE DU VOTE (Compteur global)
    onValue(ref(db, `rooms/${room}/votes`), (snapshot) => {
        const votes = snapshot.val() || {};
        const count = Object.keys(votes).length;
        document.getElementById('vote-progress').textContent = `${count} action(s) validée(s)`;
    });

    // ==========================================
    // MOTEUR DU MODE AUTOMATIQUE
    // ==========================================
    onValue(ref(db, `rooms/${room}/autoPhase`), (snapshot) => {
        if(gameMode !== "auto") return;
        const phase = snapshot.val();
        
        const nightCover = document.getElementById('night-cover');
        const autoBox = document.getElementById('auto-narrator-display');
        const voteZone = document.getElementById('vote-zone');

        voteZone.style.display = "none";
        document.getElementById('my-vote-status').textContent = "";

        if (phase === "nuit") {
            nightCover.style.display = 'flex';
            autoBox.style.display = 'none';
            parler("La nuit tombe sur le village. Tout le monde ferme les yeux.", phase);
        } 
        else if (phase === "voyante") {
            parler("La voyante se réveille, et désigne un joueur.", phase);
            if (currentPlayers[myPlayerId].role === "👁️ Voyante" && !currentPlayers[myPlayerId].isDead) {
                nightCover.style.display = 'none';
                voteZone.style.display = "block";
                document.getElementById('vote-title').textContent = "👁️ Choisis qui inspecter";
                renderVoteButtons("voyante");
            } else {
                nightCover.style.display = 'flex';
            }
        }
        else if (phase === "loups") {
            parler("Les loups-garous se réveillent, et choisissent leur victime.", phase);
            if (currentPlayers[myPlayerId].role === "🐺 Loup-Garou" && !currentPlayers[myPlayerId].isDead) {
                nightCover.style.display = 'none';
                voteZone.style.display = "block";
                document.getElementById('vote-title').textContent = "🐺 Votez pour la victime";
                renderVoteButtons("loups");
            } else {
                nightCover.style.display = 'flex';
            }
        }
        else if (phase === "sorciere") {
            parler("La sorcière se réveille. Elle peut jeter une potion.", phase);
            if (currentPlayers[myPlayerId].role === "🧙‍♀️ Sorcière" && !currentPlayers[myPlayerId].isDead) {
                nightCover.style.display = 'none';
                voteZone.style.display = "block";
                document.getElementById('vote-title').textContent = "🧙‍♀️ Sorcière : Tuer quelqu'un ?";
                renderVoteButtons("sorciere");
            } else {
                nightCover.style.display = 'flex';
            }
        }
        else if (phase === "jour") {
            nightCover.style.display = 'none';
            autoBox.style.display = "block";
            autoBox.textContent = "Le soleil se lève sur le village... (L'Admin peut tuer la victime du Loup via son autre appareil, ou l'annoncer !)";
            parler("Le soleil se lève. Le village se réveille.", phase);
        }
        else if (phase === "vote_village") {
            nightCover.style.display = 'none';
            autoBox.style.display = 'none';
            if (!currentPlayers[myPlayerId].isDead) {
                voteZone.style.display = "block";
                document.getElementById('vote-title').textContent = "🗳️ Vote du Village";
                renderVoteButtons("village");
                parler("C'est l'heure du vote. Le village doit éliminer un suspect.", phase);
            }
        }
    });
});

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
    const allIds = Object.keys(currentPlayers);
    
    // Si humain = admin ne joue pas. Si auto = TOUT LE MONDE JOUE.
    let playersToAssign = mode === "humain" ? allIds.filter(id => id !== myPlayerId) : allIds;

    if (playersToAssign.length === 0) return alert("Il faut des joueurs !");

    const rolesPool = [];
    for(let i=0; i<parseInt(document.getElementById('wolf-count').value); i++) rolesPool.push("🐺 Loup-Garou");
    
    if(document.getElementById('role-voyante').checked) rolesPool.push("👁️ Voyante");
    if(document.getElementById('role-sorciere').checked) rolesPool.push("🧙‍♀️ Sorcière");
    if(document.getElementById('role-cupidon').checked) rolesPool.push("🏹 Cupidon");
    if(document.getElementById('role-chasseur').checked) rolesPool.push("🔫 Chasseur");

    if (rolesPool.length > playersToAssign.length) return alert("Trop de rôles spéciaux pour le nombre de joueurs !");
    while(rolesPool.length < playersToAssign.length) rolesPool.push("🧑‍🌾 Simple Villageois");

    for (let i = rolesPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rolesPool[i], rolesPool[j]] = [rolesPool[j], rolesPool[i]];
    }

    let updates = {};
    playersToAssign.forEach((id, i) => updates[`rooms/${currentRoom}/players/${id}/role`] = rolesPool[i]);
    updates[`rooms/${currentRoom}/status`] = "role_reveal";
    updates[`rooms/${currentRoom}/mode`] = mode;
    update(ref(db), updates);
});

function showRoleScreen() {
    document.getElementById('lobby-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    document.getElementById('my-role-display').textContent = currentPlayers[myPlayerId].role;
}

function showNarratorScreen() {
    document.getElementById('lobby-screen').classList.remove('active');
    document.getElementById('narrator-screen').classList.add('active');
    updateNarratorScreen(currentPlayers);
}

// ==========================================
// MOTEUR ADMIN : BOUTON SUIVANT MODE AUTO
// ==========================================
let autoSteps = ["nuit", "voyante", "loups", "sorciere", "jour", "vote_village"];
let currentStepIndex = -1;

document.getElementById('btn-next-phase').addEventListener('click', () => {
    currentStepIndex++;
    if(currentStepIndex >= autoSteps.length) currentStepIndex = 0;
    
    const nextPhase = autoSteps[currentStepIndex];
    update(ref(db, `rooms/${currentRoom}`), { autoPhase: nextPhase, votes: null });
});

// ==========================================
// FONCTION D'ACTIONS/VOTES (JOUEURS)
// ==========================================
function renderVoteButtons(type) {
    const list = document.getElementById('vote-list');
    list.innerHTML = "";
    for (let id in currentPlayers) {
        if (id === myPlayerId || currentPlayers[id].isDead || !currentPlayers[id].role) continue;
        
        // Un loup ne vote pas contre un loup
        if (type === "loups" && currentPlayers[id].role === "🐺 Loup-Garou") continue;

        const btn = document.createElement('button');
        btn.textContent = currentPlayers[id].name;
        btn.style.background = "#2a3a5a"; btn.style.padding = "10px"; btn.style.margin = "0";
        
        btn.onclick = () => {
            if (type === "voyante") {
                document.getElementById('my-vote-status').textContent = `Tu as vu : ${currentPlayers[id].name} est ${currentPlayers[id].role}`;
            } else {
                set(ref(db, `rooms/${currentRoom}/votes/${myPlayerId}`), currentPlayers[id].name);
                document.getElementById('my-vote-status').textContent = `Action validée : ${currentPlayers[id].name}`;
            }
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
