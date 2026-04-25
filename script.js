// La base de données complète des 17 thèmes !
const themes = {
    "metiers": { name: "💼 Métiers & Célébrités", words: [["Médecin", "Infirmier"], ["Pompier", "Policier"], ["Professeur", "Élève"], ["Boucher", "Boulanger"], ["Astronaute", "Pilote"], ["Cristiano Ronaldo", "Lionel Messi"], ["Elon Musk", "Jeff Bezos"], ["YouTubeur", "Influenceur"], ["Acteur", "Chanteur"], ["Avocat", "Juge"]] },
    "animaux": { name: "🦁 Animaux & Nature", words: [["Lion", "Tigre"], ["Abeille", "Guêpe"], ["Dauphin", "Requin"], ["Pingouin", "Manchot"], ["Loup", "Renard"], ["Escargot", "Limace"], ["Chameau", "Dromadaire"], ["Forêt", "Jungle"], ["Océan", "Mer"], ["Crapaud", "Grenouille"], ["Rat", "Souris"], ["Cheval", "Poney"], ["Zèbre", "Âne"], ["Corbeau", "Pie"], ["Requin", "Orque"], ["Poule", "Canard"], ["Lézard", "Salamandre"], ["Moustique", "Mouche"], ["Girafe", "Autruche"]] },
    "anime": { name: "🍥 Anime & Pop Culture", words: [["Naruto", "Sasuke"], ["One Piece", "Dragon Ball"], ["Luffy", "Goku"], ["Shinigami", "Démon"], ["Kamehameha", "Rasengan"], ["Pokémon", "Digimon"], ["Pikachu", "Raichu"], ["Marvel", "DC Comics"], ["Sabre Laser", "Épée"], ["Death Note", "Code Geass"], ["Hunter x Hunter", "YuYu Hakusho"], ["Zelda", "Link"], ["Mario", "Luigi"], ["Batman", "Superman"], ["Jujutsu Kaisen", "Demon Slayer"], ["Eren Yeager", "Kirito"], ["Baguette Magique", "Anneau Unique"], ["Saiyan", "Ninja"], ["Tony Stark", "Bruce Wayne"]] },
    "food": { name: "🍕 Gastronomie & Food", words: [["Pizza", "Quiche"], ["Burger", "Sandwich"], ["Raclette", "Fondue"], ["Crêpe", "Gaufre"], ["Nutella", "Confiture"], ["Frites", "Potatoes"], ["Coca-Cola", "Pepsi"], ["Ketchup", "Moutarde"], ["Sushi", "Maki"], ["Croissant", "Pain au chocolat"], ["Café", "Thé"], ["Glace", "Sorbet"], ["Mayonnaise", "Aïoli"], ["Spaghetti", "Penne"], ["Steak", "Côtelette"], ["Miel", "Sirop d'érable"], ["Lait", "Crème"], ["Pomme", "Poire"], ["Bière", "Cidre"]] },
    "quotidien": { name: "🏠 Vie Quotidienne", words: [["Crayon", "Stylo"], ["Ordinateur", "Tablette"], ["Lunettes", "Lentilles"], ["Oreiller", "Couette"], ["Douche", "Baignoire"], ["Vélo", "Trottinette"], ["Montre", "Horloge"], ["Canapé", "Fauteuil"], ["Balai", "Aspirateur"], ["Clé", "Badge"], ["Savon", "Shampoing"], ["Parapluie", "Imperméable"], ["Fenêtre", "Porte"], ["Sac à dos", "Valise"], ["Miroir", "Vitre"], ["Bougie", "Lampe"], ["Ciseaux", "Couteau"], ["Tapis", "Moquette"], ["Rideau", "Store"]] },
    "voyage": { name: "🌍 Voyage & Géographie", words: [["Paris", "Londres"], ["Plage", "Piscine"], ["Montagne", "Volcan"], ["Avion", "Hélicoptère"], ["Hôtel", "Camping"], ["Désert", "Plage"], ["Soleil", "Lune"], ["Neige", "Glace"], ["Tour Eiffel", "Statue de la Liberté"], ["Italie", "Espagne"], ["New York", "Los Angeles"], ["Bateau", "Paquebot"], ["Lac", "Étang"], ["Japon", "Corée du Sud"], ["Tunnel", "Pont"], ["Campagne", "Village"], ["Route", "Autoroute"], ["Valise", "Sac de voyage"], ["Carte", "Boussole"]] },
    "expert": { name: "🔥 Mode Expert", words: [["Amour", "Amitié"], ["Rêve", "Cauchemar"], ["Vitesse", "Accélération"], ["Silence", "Bruit"], ["Travail", "École"], ["Richesse", "Succès"], ["Guerre", "Conflit"], ["Espoir", "Foi"], ["Peur", "Angoisse"], ["Temps", "Durée"], ["Mensonge", "Secret"], ["Liberté", "Indépendance"], ["Force", "Puissance"], ["Tristesse", "Solitude"], ["Rire", "Sourire"], ["Loi", "Règle"]] },
    "sport": { name: "⚽ Sport & Loisirs", words: [["Football", "Rugby"], ["Tennis", "Ping-pong"], ["Course à pied", "Marche rapide"], ["Natation", "Water-polo"], ["Ski", "Snowboard"], ["Yoga", "Méditation"], ["Échecs", "Dames"], ["Boxe", "Karaté"], ["Pétanque", "Bowling"], ["Surf", "Planche à voile"], ["VTT", "Motocross"], ["Musculation", "Fitness"]] },
    "tech": { name: "💻 High-Tech & Numérique", words: [["Smartphone", "Tablette"], ["Instagram", "TikTok"], ["Netflix", "Disney+"], ["Wi-Fi", "Bluetooth"], ["Clavier", "Souris"], ["YouTube", "Twitch"], ["Google", "Chat GPT"], ["Écouteurs", "Casque"], ["Batterie", "Chargeur"], ["Appareil Photo", "Caméra"], ["Logiciel", "Application"], ["Mot de passe", "Code PIN"]] },
    "heros": { name: "🦸 Super-Héros & Fantastique", words: [["Vampire", "Loup-garou"], ["Licorne", "Pégase"], ["Ange", "Démon"], ["Fantôme", "Esprit"], ["Magicien", "Sorcier"], ["Dragon", "Dinosaure"], ["Superman", "Captain America"], ["Spider-Man", "Iron Man"], ["Thor", "Hercule"], ["Sirène", "Méduse"], ["Zombi", "Momie"], ["Cape", "Masque"]] },
    "musique": { name: "🎼 Musique & Art", words: [["Guitare", "Basse"], ["Piano", "Orgue"], ["Violon", "Violoncelle"], ["Rap", "RnB"], ["Rock", "Metal"], ["Batterie", "Percussions"], ["Micro", "Haut-parleur"], ["Concert", "Festival"], ["Danse", "Gymnastique"], ["Peinture", "Dessin"], ["Radio", "Podcast"], ["CD", "Vinyle"]] },
    "corps": { name: "🫀 Corps Humain & Santé", words: [["Bras", "Jambe"], ["Œil", "Oreille"], ["Cœur", "Poumon"], ["Cerveau", "Esprit"], ["Sang", "Sueur"], ["Doigt", "Orteil"], ["Dents", "Gencives"], ["Estomac", "Intestin"], ["Médecin", "Chirurgien"], ["Hôpital", "Clinique"], ["Grippe", "Rhume"], ["Pansement", "Plâtre"]] },
    "hp": { name: "⚡ Harry Potter & Fantaisie", words: [["Poudlard", "Rivendell"], ["Harry Potter", "Ron Weasley"], ["Hermione", "Luna Lovegood"], ["Voldemort", "Sauron"], ["Gryffondor", "Serpentard"], ["Quidditch", "Balai"], ["Baguette", "Grimoire"], ["Dobby", "Gollum"], ["Elf", "Nain"], ["Potion", "Poison"]] },
    "meteo": { name: "☁️ Saisons & Météo", words: [["Été", "Printemps"], ["Hiver", "Automne"], ["Pluie", "Grêle"], ["Orage", "Tempête"], ["Brouillard", "Nuage"], ["Canicule", "Sécheresse"], ["Glace", "Givre"], ["Arc-en-ciel", "Aurore boréale"], ["Éclair", "Tonnerre"], ["Vent", "Courant d'air"]] },
    "histoire": { name: "🏛️ Histoire & Mythologie", words: [["Roi", "Empereur"], ["Chevalier", "Samouraï"], ["Château", "Palais"], ["Pyramide", "Temple"], ["Zeus", "Jupiter"], ["Rome", "Athènes"], ["Napoléon", "Jules César"], ["Moyen-Âge", "Renaissance"], ["Viking", "Pirate"], ["Momie", "Squelette"]] },
    "caliente": { name: "🔞 Caliente", words: [["Préservatif", "Pilule"], ["Lit", "Canapé"], ["Menottes", "Fouet"], ["Strip-tease", "Lap dance"], ["Kamasutra", "Yoga"], ["Sextape", "Porno"], ["Dessous chics", "Nuisette"], ["Vibromasseur", "Plug"], ["Orgasme", "Plaisir"], ["Missionnaire", "Lévrier"], ["Partouze", "Plan à trois"], ["Cuir", "Latex"]] },
    "dating": { name: "❤️ Séduction & Dating", words: [["Tinder", "Fruitz"], ["Premier RDV", "Speed Dating"], ["Coup d'un soir", "Plan cul"], ["Amant", "Petit ami"], ["Célibataire", "Cocu"], ["Drague", "Harcèlement"], ["Friendzone", "Râteau"], ["Bisou", "Pelle"], ["Mariage", "PACS"], ["Ex", "Plan B"], ["Saint-Valentin", "Soirée Tinder"]] }
};

let players = [];
let playerRoles = []; 
let currentPlayerIndex = 0;
let civWordGlobal = "";
let roundCount = 1;
let currentVotedPlayer = null;
let canUndercoverGuess = false;

// Initialiser les thèmes au chargement
window.onload = function() {
    const themeList = document.getElementById("theme-list");
    for (const [key, data] of Object.entries(themes)) {
        const div = document.createElement("div");
        div.className = "theme-item";
        div.innerHTML = `<input type="checkbox" class="theme-checkbox custom-checkbox" value="${key}" checked onchange="checkSelectAll()"> <label>${data.name}</label>`;
        themeList.appendChild(div);
    }
};

function toggleAllThemes(source) {
    const checkboxes = document.querySelectorAll('.theme-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

function checkSelectAll() {
    const allChecked = document.querySelectorAll('.theme-checkbox:not(:checked)').length === 0;
    document.getElementById('select-all-themes').checked = allChecked;
}

function openGame(gameName) {
    if (gameName === 'undercover') {
        switchScreen("hub-screen", "setup-screen");
    }
}

function updateCounter(id, change) {
    const span = document.getElementById(id);
    let val = parseInt(span.textContent) + change;
    if (id === 'undercover-count' && val >= 1 && val <= 5) span.textContent = val;
    if (id === 'mr-white-count' && val >= 0 && val <= 5) span.textContent = val;
}

function addPlayer() {
    const input = document.getElementById("player-name");
    const name = input.value.trim();
    if (name && !players.includes(name)) {
        players.push(name);
        const li = document.createElement("li");
        li.textContent = name;
        document.getElementById("player-list").appendChild(li);
        input.value = "";
        if (players.length >= 3) document.getElementById("start-btn").disabled = false;
    }
}

function startGame() {
    const undercoverCount = parseInt(document.getElementById("undercover-count").textContent);
    const mrWhiteCount = parseInt(document.getElementById("mr-white-count").textContent);
    canUndercoverGuess = document.getElementById("allow-undercover-guess").checked;

    if (undercoverCount + mrWhiteCount >= players.length - 1) {
        alert("Trop d'intrus ! Il faut plus de Civils.");
        return;
    }

    // Récupérer les mots de tous les thèmes sélectionnés
    const checkedBoxes = document.querySelectorAll('.theme-checkbox:checked');
    let availableWords = [];
    checkedBoxes.forEach(box => {
        availableWords = availableWords.concat(themes[box.value].words);
    });

    if (availableWords.length === 0) {
        alert("Tu dois sélectionner au moins un thème !");
        return;
    }

    const randomPair = availableWords[Math.floor(Math.random() * availableWords.length)];
    const isSwapped = Math.random() > 0.5;
    civWordGlobal = isSwapped ? randomPair[0] : randomPair[1];
    const undercoverWord = isSwapped ? randomPair[1] : randomPair[0];

    let rolesPool = [];
    for (let i = 0; i < undercoverCount; i++) rolesPool.push("Undercover");
    for (let i = 0; i < mrWhiteCount; i++) rolesPool.push("Mr. White");
    while (rolesPool.length < players.length) rolesPool.push("Civil");

    rolesPool = rolesPool.sort(() => Math.random() - 0.5);

    playerRoles = players.map((name, index) => ({
        name: name,
        role: rolesPool[index],
        word: rolesPool[index] === "Civil" ? civWordGlobal : (rolesPool[index] === "Undercover" ? undercoverWord : "Tu es Mr. White"),
        isAlive: true
    }));

    roundCount = 1;
    currentPlayerIndex = 0;
    switchScreen("setup-screen", "turn-screen");
    updateTurnScreen();
}

function updateTurnScreen() {
    document.getElementById("turn-title").textContent = `📱 Au tour de ${playerRoles[currentPlayerIndex].name}`;
}

function showWord() {
    const p = playerRoles[currentPlayerIndex];
    document.getElementById("secret-word").textContent = p.word;
    document.getElementById("role-title").textContent = (p.role === "Mr. White") ? "Attention :" : "Ton mot est :";
    switchScreen("turn-screen", "word-screen");
}

function nextTurn() {
    currentPlayerIndex++;
    if (currentPlayerIndex < playerRoles.length) {
        switchScreen("word-screen", "turn-screen");
        updateTurnScreen();
    } else {
        startVotingPhase();
    }
}

function startVotingPhase() {
    document.getElementById("round-number").textContent = roundCount;
    const voteList = document.getElementById("vote-list");
    voteList.innerHTML = "";

    playerRoles.forEach(player => {
        const btn = document.createElement("button");
        btn.className = player.isAlive ? "vote-btn" : "vote-btn eliminated";
        btn.textContent = player.isAlive ? `Voter contre ${player.name}` : `💀 ${player.name} (Eliminé)`;
        btn.onclick = () => handleVote(player);
        voteList.appendChild(btn);
    });

    switchScreen("word-screen", "debate-screen");
    switchScreen("continue-screen", "debate-screen");
}

function handleVote(votedPlayer) {
    votedPlayer.isAlive = false;
    currentVotedPlayer = votedPlayer;

    const isMrWhite = votedPlayer.role === "Mr. White";
    const isUnderAndCanGuess = votedPlayer.role === "Undercover" && canUndercoverGuess;

    if (isMrWhite || isUnderAndCanGuess) {
        const icon = isMrWhite ? "👻" : "🕵️‍♂️";
        document.getElementById("guess-title").textContent = `${icon} ${votedPlayer.name} était ${votedPlayer.role} !`;
        switchScreen("debate-screen", "guess-screen");
    } else {
        checkWinConditions();
    }
}

function checkIntruderGuess() {
    const guess = document.getElementById("intruder-guess").value.trim().toLowerCase();
    if (guess === civWordGlobal.toLowerCase()) {
        showResult(`🎉 Victoire de ${currentVotedPlayer.name} !`, `L'intrus a trouvé le mot des civils : "${civWordGlobal}".`);
    } else {
        document.getElementById("intruder-guess").value = "";
        checkWinConditions();
    }
}

function checkWinConditions() {
    const alivePlayers = playerRoles.filter(p => p.isAlive);
    const aliveIntruders = alivePlayers.filter(p => p.role !== "Civil");
    const aliveCivils = alivePlayers.filter(p => p.role === "Civil");

    if (aliveIntruders.length === 0) {
        showResult("🎉 Victoire des Civils !", "Tous les intrus ont été éliminés.");
    } else if (aliveCivils.length <= aliveIntruders.length) {
        showResult("💀 Les Civils ont perdu...", "Les intrus sont trop nombreux !");
    } else {
        roundCount++;
        document.getElementById("continue-desc").textContent = `${currentVotedPlayer.name} a été éliminé. Mais il reste des intrus...`;
        switchScreen("debate-screen", "continue-screen");
        switchScreen("guess-screen", "continue-screen");
    }
}

function showResult(title, desc) {
    document.getElementById("result-title").textContent = title;
    document.getElementById("result-desc").textContent = desc;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('result-screen').classList.add('active');
}

function switchScreen(hideId, showId) {
    document.getElementById(hideId).classList.remove("active");
    document.getElementById(showId).classList.add("active");
}
