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
let currentPlayers = {}; // Va stocker la liste des joueurs

// 1. REJOINDRE LA PARTIE
document.getElementById('join-btn').addEventListener('click', () => {
    let name = document.getElementById('player-name').value.trim();
    const room = document.getElementById('room-code').value.trim().toUpperCase();

    if (!name || !room) return alert("Saisis un pseudo et un code !");

    // Détecter l'admin
    if (name.toLowerCase() === "admin") {
        amIAdmin = true;
        name = "👑 Admin"; 
    }

    currentRoom = room;
    const playerRef = ref(db, `rooms/${room}/players/${myPlayerId}`);
    onDisconnect(playerRef).remove(); // Auto-suppression si on quitte

    // Envoi des infos à Firebase
    set(playerRef, { name: name, role: "En attente" });

    // Si on est le premier (ou l'admin), on crée le statut du salon
    if (amIAdmin) {
        set(ref(db, `rooms/${room}/status`), "lobby");
    }

    // Changement d'écran
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('lobby-screen').classList.add('active');
    document.getElementById('display-room-code').textContent = room;

    // Afficher le panneau admin si on est admin
    if (amIAdmin) {
        document.getElementById('admin-panel').style.display = "block";
        document.getElementById('waiting-msg').style.display = "none";
    }

    // ÉCOUTE DES JOUEURS EN DIRECT
    onValue(ref(db, `rooms/${room}/players`), (snapshot) => {
        currentPlayers = snapshot.val() || {};
        updateLobby(currentPlayers);
    });

    // ÉCOUTE DU STATUT DE LA PARTIE (Pour savoir quand l'admin lance)
    onValue(ref(db, `rooms/${room}/status`), (snapshot) => {
        if (snapshot.val() === "role_reveal") {
            showRoleScreen();
        }
    });
});

// 2. METTRE A JOUR LA LISTE DES JOUEURS
function updateLobby(playersData) {
    const list = document.getElementById('player-list');
    list.innerHTML = "";
    let count = 0;

    for (let id in playersData) {
        count++;
        const li = document.createElement('li');
        li.textContent = playersData[id].name;
        if (id === myPlayerId) {
            li.textContent += " (Toi)";
            li.style.color = "#e94560";
        }
        list.appendChild(li);
    }
    document.getElementById('player-count').textContent = count;
}

// 3. L'ADMIN LANCE LA PARTIE ET DISTRIBUE LES RÔLES
document.getElementById('start-game-btn').addEventListener('click', () => {
    const playerIds = Object.keys(currentPlayers);
    const totalPlayers = playerIds.length;
    
    // Récupérer les réglages
    const wolfCount = parseInt(document.getElementById('wolf-count').value);
    const hasVoyante = document.getElementById('role-voyante').checked;
    const hasSorciere = document.getElementById('role-sorciere').checked;
    const hasCupidon = document.getElementById('role-cupidon').checked;
    const hasChasseur = document.getElementById('role-chasseur').checked;

    // Créer la pile de rôles
    let rolesPool = [];
    for(let i=0; i<wolfCount; i++) rolesPool.push("🐺 Loup-Garou");
    if(hasVoyante) rolesPool.push("👁️ Voyante");
    if(hasSorciere) rolesPool.push("🧙‍♀️ Sorcière");
    if(hasCupidon) rolesPool.push("🏹 Cupidon");
    if(hasChasseur) rolesPool.push("🔫 Chasseur");

    // Vérifier si on a assez de joueurs
    if (rolesPool.length > totalPlayers) {
        return alert("Il y a trop de rôles spéciaux pour le nombre de joueurs !");
    }

    // Compléter avec des Villageois
    while(rolesPool.length < totalPlayers) {
        rolesPool.push("🧑‍🌾 Simple Villageois");
    }

    // Mélanger les rôles (Algorithme de Fisher-Yates)
    for (let i = rolesPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rolesPool[i], rolesPool[j]] = [rolesPool[j], rolesPool[i]];
    }

    // Préparer l'envoi de tous les rôles en même temps à la base de données
    let updates = {};
    playerIds.forEach((id, index) => {
        updates[`rooms/${currentRoom}/players/${id}/role`] = rolesPool[index];
    });
    
    // On change le statut pour dire à tous les téléphones "La partie commence !"
    updates[`rooms/${currentRoom}/status`] = "role_reveal";

    // Envoi massif à Firebase
    update(ref(db), updates);
});

// 4. AFFICHER L'ECRAN DE JEU ET LE RÔLE
function showRoleScreen() {
    document.getElementById('lobby-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');

    // Mettre à jour l'affichage du rôle caché
    const myRole = currentPlayers[myPlayerId].role;
    document.getElementById('my-role-display').textContent = myRole;
}

// 5. BOUTON POUR RÉVÉLER LE RÔLE (Maintien clic/tactile)
const roleCard = document.getElementById('role-card');
const roleDisplay = document.getElementById('my-role-display');
const roleInstruction = document.getElementById('role-instruction');

function showRole() {
    roleDisplay.style.display = "block";
    roleInstruction.style.display = "none";
}
function hideRole() {
    roleDisplay.style.display = "none";
    roleInstruction.style.display = "block";
}

roleCard.addEventListener('mousedown', showRole);
roleCard.addEventListener('touchstart', showRole);
roleCard.addEventListener('mouseup', hideRole);
roleCard.addEventListener('touchend', hideRole);
