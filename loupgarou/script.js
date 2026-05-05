import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, onDisconnect, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

// 1. REJOINDRE
document.getElementById('join-btn').addEventListener('click', () => {
    let rawName = document.getElementById('player-name').value.trim();
    const room = document.getElementById('room-code').value.trim().toUpperCase();
    if (!rawName || !room) return alert("Saisis un pseudo et un code !");

    currentRoom = room;
    let displayName = rawName;
    let wantsToAdmin = false;

    if (rawName.toLowerCase().includes("admin")) {
        wantsToAdmin = true;
        displayName = rawName.replace(/admin/gi, "").trim() || "Chef";
    }

    const playerRef = ref(db, `rooms/${room}/players/${myPlayerId}`);
    onDisconnect(playerRef).remove(); 
    set(playerRef, { name: displayName, isDead: false });

    if (wantsToAdmin) {
        set(ref(db, `rooms/${room}/adminId`), myPlayerId);
    }

    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('lobby-screen').classList.add('active');
    document.getElementById('display-room-code').textContent = room;

    // ECOUTE JOUEURS
    onValue(ref(db, `rooms/${room}/players`), (snapshot) => {
        currentPlayers = snapshot.val() || {};
        
        // Si je ne suis plus dans la liste (KICK), je recharge la page
        if (!currentPlayers[myPlayerId] && document.getElementById('lobby-screen').classList.contains('active')) {
            alert("Tu as été expulsé du salon.");
            location.reload();
        }
        updateLobby();
    });

    // ECOUTE ADMIN ID (Le dernier admin gagne)
    onValue(ref(db, `rooms/${room}/adminId`), (snapshot) => {
        const adminId = snapshot.val();
        amIAdmin = (adminId === myPlayerId);
        document.getElementById('admin-panel').style.display = amIAdmin ? "block" : "none";
        updateLobby(); // Rafraichir pour voir les boutons Kick
    });

    // ECOUTE LANCEMENT JEU
    onValue(ref(db, `rooms/${room}/status`), (snapshot) => {
        if (snapshot.val() === "started") {
            document.getElementById('lobby-screen').classList.remove('active');
            document.getElementById('game-screen').classList.add('active');
            
            // Si narrateur humain, verifier si c'est moi
            onValue(ref(db, `rooms/${room}/narratorId`), (nSnap) => {
                if(nSnap.val() === myPlayerId) {
                    document.getElementById('narrator-badge').style.display = "block";
                    document.getElementById('role-reveal-zone').style.display = "none";
                }
            });
        }
    });
});

function updateLobby() {
    const list = document.getElementById('player-list');
    const narratorSelect = document.getElementById('narrator-id');
    list.innerHTML = "";
    narratorSelect.innerHTML = "";
    
    let count = 0;
    for (let id in currentPlayers) {
        count++;
        const p = currentPlayers[id];
        const li = document.createElement('li');
        
        let prefix = (id === ref(db, `rooms/${currentRoom}/adminId`).key) ? "👑 " : ""; // Simplifié
        li.textContent = p.name;
        
        // Si je suis l'admin, je peux kick les autres
        if (amIAdmin && id !== myPlayerId) {
            const btn = document.createElement('button');
            btn.textContent = "❌";
            btn.className = "kick-btn";
            btn.onclick = () => remove(ref(db, `rooms/${currentRoom}/players/${id}`));
            li.appendChild(btn);
        }

        // Remplir la liste des narrateurs possibles
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = p.name;
        narratorSelect.appendChild(opt);

        list.appendChild(li);
    }
    document.getElementById('player-count').textContent = count;
}

// GESTION MODE JEU (Afficher/Cacher selection narrateur)
document.getElementById('game-mode').onchange = (e) => {
    document.getElementById('narrator-select-row').style.display = (e.target.value === "humain") ? "flex" : "none";
};

// LANCEMENT
document.getElementById('start-game-btn').addEventListener('click', () => {
    const updates = {};
    updates[`rooms/${currentRoom}/status`] = "started";
    updates[`rooms/${currentRoom}/mode`] = document.getElementById('game-mode').value;
    
    if (document.getElementById('game-mode').value === "humain") {
        updates[`rooms/${currentRoom}/narratorId`] = document.getElementById('narrator-id').value;
    }
    
    // Distribution simplifiée des rôles pour cet exemple
    update(ref(db), updates);
});

// CARTE ROLE
const roleCard = document.getElementById('role-card'), roleDisplay = document.getElementById('my-role-display'), roleInst = document.getElementById('role-instruction');
roleCard.onmousedown = roleCard.ontouchstart = () => { roleDisplay.style.display = "block"; roleInst.style.display = "none"; };
roleCard.onmouseup = roleCard.ontouchend = () => { roleDisplay.style.display = "none"; roleInst.style.display = "block"; };
