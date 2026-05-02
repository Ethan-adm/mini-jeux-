// 1. Importation de Firebase depuis Internet
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, onDisconnect, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 2. Ta configuration secrète Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDTX0_aUssO0gzY5YrnXJWYtsC1SKkWKZQ",
    authDomain: "minijeux-ethan.firebaseapp.com",
    databaseURL: "https://minijeux-ethan-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "minijeux-ethan",
    storageBucket: "minijeux-ethan.firebasestorage.app",
    messagingSenderId: "494501305767",
    appId: "1:494501305767:web:48a4acd2e836f68f036a82"
};

// 3. Allumage de la base de données
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Variables du joueur
let myPlayerId = "joueur_" + Math.random().toString(36).substr(2, 9); // ID unique
let currentRoom = "";

// Quand on clique sur "Rejoindre"
document.getElementById('join-btn').addEventListener('click', () => {
    const name = document.getElementById('player-name').value.trim();
    const room = document.getElementById('room-code').value.trim().toUpperCase();

    if (!name || !room) {
        alert("Saisis un pseudo et un code de salon !");
        return;
    }

    currentRoom = room;
    
    // Chemin dans la base de données : rooms -> 1234 -> players -> joueur_XYZ
    const playerRef = ref(db, `rooms/${room}/players/${myPlayerId}`);

    // Si le joueur ferme l'onglet, Firebase le supprime automatiquement du salon !
    onDisconnect(playerRef).remove();

    // On envoie le pseudo dans la base de données
    set(playerRef, {
        name: name,
        isHost: false // On gérera le Maître du jeu plus tard
    });

    // On change d'écran
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('lobby-screen').classList.add('active');
    document.getElementById('display-room-code').textContent = room;

    // On écoute en direct ce qui se passe dans ce salon
    const roomRef = ref(db, `rooms/${room}/players`);
    onValue(roomRef, (snapshot) => {
        const playersData = snapshot.val();
        updateLobby(playersData);
    });
});

// Fonction pour mettre à jour la liste sur l'écran
function updateLobby(playersData) {
    const list = document.getElementById('player-list');
    list.innerHTML = "";
    let count = 0;

    if (playersData) {
        for (let id in playersData) {
            count++;
            const li = document.createElement('li');
            li.textContent = playersData[id].name;
            
            // Si c'est nous, on rajoute un petit "Toi"
            if (id === myPlayerId) {
                li.textContent += " (Toi)";
                li.style.color = "#e94560";
            }
            
            list.appendChild(li);
        }
    }
    document.getElementById('player-count').textContent = count;
}
