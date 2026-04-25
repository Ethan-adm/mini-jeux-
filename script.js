const wordPairs = [
    ["Pomme", "Poire"], ["Cinéma", "Théâtre"], ["Voiture", "Moto"],
    ["Plage", "Piscine"], ["Guitare", "Piano"], ["Chien", "Loup"]
];

let players = [];
let playerRoles = []; // Va contenir des objets {nom, role, mot}
let currentPlayerIndex = 0;
let civWordGlobal = "";

// Ouvrir un jeu depuis le Hub
function openGame(gameName) {
    if (gameName === 'undercover') {
        switchScreen("hub-screen", "setup-screen");
    }
}

// Ajouter un joueur
function addPlayer() {
    const input = document.getElementById("player-name");
    const name = input.value.trim();
    if (name && !players.includes(name)) {
        players.push(name);
        const li = document.createElement("li");
        li.textContent = name;
        document.getElementById("player-list").appendChild(li);
        input.value = "";
        
        if (players.length >= 3) {
            document.getElementById("start-btn").disabled = false;
        }
    }
}

// Démarrer la partie
function startGame() {
    const mrWhiteCount = parseInt(document.getElementById("mr-white-count").value);
    
    // Vérification de sécurité pour ne pas avoir trop de méchants
    if (mrWhiteCount + 1 >= players.length) {
        alert("Il y a trop de Mr. White pour le nombre de joueurs !");
        return;
    }

    // Choisir les mots
    const randomPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
    const isSwapped = Math.random() > 0.5;
    civWordGlobal = isSwapped ? randomPair[0] : randomPair[1];
    const undercoverWord = isSwapped ? randomPair[1] : randomPair[0];

    // Préparer les rôles
    let rolesPool = ["Undercover"];
    for (let i = 0; i < mrWhiteCount; i++) rolesPool.push("Mr. White");
    while (rolesPool.length < players.length) rolesPool.push("Civil");

    // Mélanger les rôles
    rolesPool = rolesPool.sort(() => Math.random() - 0.5);

    // Assigner les rôles aux joueurs
    playerRoles = players.map((playerName, index) => {
        let role = rolesPool[index];
        let word = "";
        if (role === "Civil") word = civWordGlobal;
        else if (role === "Undercover") word = undercoverWord;
        else if (role === "Mr. White") word = "Tu es Mr. White (aucun mot)";
        
        return { name: playerName, role: role, word: word };
    });

    currentPlayerIndex = 0;
    switchScreen("setup-screen", "turn-screen");
    updateTurnScreen();
}

function updateTurnScreen() {
    document.getElementById("turn-title").textContent = `📱 Au tour de ${playerRoles[currentPlayerIndex].name}`;
}

function showWord() {
    document.getElementById("secret-word").textContent = playerRoles[currentPlayerIndex].word;
    
    const roleTitle = document.getElementById("role-title");
    if (playerRoles[currentPlayerIndex].role === "Mr. White") {
        roleTitle.textContent = "Attention :";
    } else {
        roleTitle.textContent = "Ton mot est :";
    }

    switchScreen("turn-screen", "word-screen");
}

function nextTurn() {
    currentPlayerIndex++;
    if (currentPlayerIndex < players.length) {
        switchScreen("word-screen", "turn-screen");
        updateTurnScreen();
    } else {
        startVotingPhase();
    }
}

// Lancer la phase de vote
function startVotingPhase() {
    const voteList = document.getElementById("vote-list");
    voteList.innerHTML = ""; // Vider la liste précédente

    // Créer un bouton de vote pour chaque joueur
    playerRoles.forEach(player => {
        const btn = document.createElement("button");
        btn.className = "vote-btn";
        btn.textContent = `Voter contre ${player.name}`;
        btn.onclick = () => handleVote(player);
        voteList.appendChild(btn);
    });

    switchScreen("word-screen", "debate-screen");
}

// Gérer le résultat du vote
function handleVote(votedPlayer) {
    if (votedPlayer.role === "Mr. White") {
        switchScreen("debate-screen", "guess-screen");
    } else if (votedPlayer.role === "Undercover") {
        showResult("🎉 Les Civils gagnent !", `L'Undercover était bien ${votedPlayer.name}.`);
    } else {
        showResult("💀 Les Civils ont perdu...", `Vous avez éliminé un Civil. C'était ${votedPlayer.name}.`);
    }
}

// Vérifier la réponse de Mr White
function checkWhiteGuess() {
    const guess = document.getElementById("white-guess").value.trim().toLowerCase();
    const actualWord = civWordGlobal.toLowerCase();

    // Tolérance basique pour les accents ou majuscules
    if (guess === actualWord) {
        showResult("👻 Mr. White GAGNE !", `Incroyable ! Le mot des civils était bien "${civWordGlobal}".`);
    } else {
        showResult("🎉 Les Civils gagnent !", `Mr. White a échoué. Il a proposé "${guess}", mais le mot était "${civWordGlobal}".`);
    }
}

function showResult(title, description) {
    document.getElementById("result-title").textContent = title;
    document.getElementById("result-desc").textContent = description;
    
    // Cacher tous les écrans et afficher le résultat
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('result-screen').classList.add('active');
}

function switchScreen(hideId, showId) {
    document.getElementById(hideId).classList.remove("active");
    document.getElementById(showId).classList.add("active");
}
