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
let isVoteOpen = false;

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
        set(ref(db, `rooms/${room}/phase`), "day");
        set(ref(db, `rooms/${room}/voteActive`), false);
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

        // Si on meurt
        if(currentPlayers[myPlayerId] && currentPlayers[myPlayerId].isDead) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('dead-screen').classList.add('active');
        }
        
        // Rafraichir la liste des votes si on est en train de voter
        if(document.getElementById('vote-zone').style.display === "block") renderVoteButtons();
    });

    // ECOUTE LANCEMENT JEU
    onValue(ref(db, `rooms/${room}/status`), (snapshot) => {
        if (snapshot.val() === "role_reveal") {
            onValue(ref(db, `rooms/${room}/mode`), (modeSnap) => {
                if (modeSnap.val() === "humain" && amIAdmin) showNarratorScreen();
                else showRoleScreen();
            }, {onlyOnce: true});
        }
    });

    // ECOUTE JOUR/NUIT
    onValue(ref(db, `rooms/${room}/phase`), (snapshot) => {
        const nightCover = document.getElementById('night-cover');
        if (nightCover) nightCover.style.display = snapshot.val() === 'night' ? 'flex' : 'none';
    });

    // ECOUTE OUVERTURE DES VOTES (POUR LES JOUEURS)
    onValue(ref(db, `rooms/${room}/voteActive`), (snapshot) => {
        const active = snapshot.val();
        const voteZone = document.getElementById('vote-zone');
        
        if (active && !currentPlayers[myPlayerId].isDead && !amIAdmin && document.getElementById('game-screen').classList.contains('active')) {
            voteZone.style.display = "block";
            document.getElementById('my-vote-status').textContent = "";
            renderVoteButtons();
        } else {
            if(voteZone) voteZone.style.display = "none";
        }
    });

    // ECOUTE DES RESULTATS DE VOTE (POUR LE NARRATEUR)
    onValue(ref(db, `rooms/${room}/votes`), (snapshot) => {
        if(!amIAdmin) return;
        const votes = snapshot.val() || {};
        const results = {};
        let total = 0;
        
        for(let voter in votes) {
            results[votes[voter]] = (results[votes[voter]] || 0) + 1;
            total++;
        }

        const list = document.getElementById('vote-results');
        list.innerHTML = `<p style="margin:0 0 10px 0; font-size:0.9em; color:#aaa;">Votes reçus : ${total}</p>`;
        
        // Trier par nombre de votes
        Object.entries(results).sort((a,b) => b[1] - a[1]).forEach(([name, count]) => {
            const li = document.createElement('li');
            li.style.padding = "5px"; li.style.margin = "0"; li.style.background = "transparent"; li.style.border = "none";
            li.innerHTML = `<strong>${name}</strong> : <span style="color:#e94560">${count} voix</span>`;
            list.appendChild(li);
        });
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

document.getElementById('start-game-btn').addEventListener('click', () => {
    const mode = document.getElementById('game-mode').value;
    if (mode === "auto") return alert("Le mode Automatique n'est pas encore codé ! Utilise Humain.");
    
    const allIds = Object.keys(currentPlayers).filter(id => id !== myPlayerId);
    if (allIds.length === 0) return alert("Il faut des joueurs !");

    const rolesPool = [];
    for(let i=0; i<parseInt(document.getElementById('wolf-count').value); i++) rolesPool.push("🐺 Loup-Garou");
    if(document.getElementById('role-voyante').checked) rolesPool.push("👁️ Voyante");
    if(document.getElementById('role-sorciere').checked) rolesPool.push("🧙‍♀️ Sorcière");
    if(document.getElementById('role-cupidon').checked) rolesPool.push("🏹 Cupidon");
    if(document.getElementById('role-chasseur').checked) rolesPool.push("🔫 Chasseur");

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

// GESTION JOUR/NUIT
document.getElementById('btn-night').addEventListener('click', () => update(ref(db, `rooms/${currentRoom}`), { phase: 'night' }));
document.getElementById('btn-day').addEventListener('click', () => update(ref(db, `rooms/${currentRoom}`), { phase: 'day' }));

// GESTION DU VOTE (ADMIN)
document.getElementById('btn-toggle-vote').addEventListener('click', () => {
    isVoteOpen = !isVoteOpen;
    const btn = document.getElementById('btn-toggle-vote');
    if (isVoteOpen) {
        update(ref(db, `rooms/${currentRoom}`), { voteActive: true, votes: null });
        btn.textContent = "Fermer les votes"; btn.style.background = "#e94560"; btn.style.color = "white";
    } else {
        update(ref(db, `rooms/${currentRoom}`), { voteActive: false });
        btn.textContent = "Ouvrir les votes"; btn.style.background = "#ffbc00"; btn.style.color = "black";
    }
});

// AFFICHER BOUTONS DE VOTE (JOUEURS)
function renderVoteButtons() {
    const list = document.getElementById('vote-list');
    list.innerHTML = "";
    for (let id in currentPlayers) {
        if (id === myPlayerId || currentPlayers[id].isDead || !currentPlayers[id].role || currentPlayers[id].role === "En attente") continue;
        
        const btn = document.createElement('button');
        btn.textContent = currentPlayers[id].name;
        btn.style.background = "#2a3a5a"; btn.style.padding = "10px"; btn.style.margin = "0";
        btn.onclick = () => {
            set(ref(db, `rooms/${currentRoom}/votes/${myPlayerId}`), currentPlayers[id].name);
            document.getElementById('my-vote-status').textContent = `Tu as voté contre ${currentPlayers[id].name}`;
        };
        list.appendChild(btn);
    }
}

// CARTE ROLE
const roleCard = document.getElementById('role-card'), roleDisplay = document.getElementById('my-role-display'), roleInst = document.getElementById('role-instruction');
const show = () => { roleDisplay.style.display = "block"; roleInst.style.display = "none"; };
const hide = () => { roleDisplay.style.display = "none"; roleInst.style.display = "block"; };
roleCard.addEventListener('mousedown', show); roleCard.addEventListener('touchstart', show);
roleCard.addEventListener('mouseup', hide); roleCard.addEventListener('touchend', hide);
