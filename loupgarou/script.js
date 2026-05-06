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
let amINarrator = false;
let currentPlayers = {}; 
let gameMode = "auto";
let currentVotes = {};
let adminIdGlobal = "";
let isGameActive = false; 

let autoState = {};    
let gameState = {};    
let selectedTargetIds = []; 

let lastSpokenPhase = "";
function parler(texte, phase) {
    if (gameMode !== "auto") return; 
    if (lastSpokenPhase === phase) return; 
    lastSpokenPhase = phase;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 
        const voix = new SpeechSynthesisUtterance(texte);
        voix.lang = 'fr-FR'; voix.rate = 0.95;
        window.speechSynthesis.speak(voix);
    }
}

// 1. REJOINDRE LE SALON ET ECOUTES GLOBALES
document.getElementById('join-btn').addEventListener('click', () => {
    let rawName = document.getElementById('player-name').value.trim();
    const room = document.getElementById('room-code').value.trim().toUpperCase();

    if (!rawName || !room) return alert("Saisis un pseudo et un code !");

    document.getElementById('join-btn').style.display = "none";
    document.getElementById('connecting-msg').style.display = "block";

    currentRoom = room;
    let displayName = rawName;
    let wantsToAdmin = false;

    if (rawName.toLowerCase().includes("admin")) {
        wantsToAdmin = true;
        displayName = rawName.replace(/admin/gi, "").trim() || "Chef";
    }

    const playerRef = ref(db, `rooms/${room}/players/${myPlayerId}`);
    onDisconnect(playerRef).remove(); 
    set(playerRef, { name: displayName, role: "En attente", isDead: false });

    if (wantsToAdmin) {
        set(ref(db, `rooms/${room}/adminId`), myPlayerId);
        set(ref(db, `rooms/${room}/status`), "lobby");
    }

    document.getElementById('display-room-code').textContent = room; 

    // ECOUTES CENTRALISÉES
    onValue(ref(db, `rooms/${room}/status`), snap => { 
        let val = snap.val();
        if (val === "lobby" || !val) {
            isGameActive = false;
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('lobby-screen').classList.add('active');
            document.getElementById('display-room-code').textContent = currentRoom; 
            document.getElementById('vote-zone').style.display = "none";
            document.getElementById('night-cover').style.display = "none";
            document.getElementById('admin-auto-bar').style.display = "none";
            if(document.getElementById('lobby-screen').classList.contains('active')) updateLobby();
        } else {
            isGameActive = true;
            masterRender();
        }
    });

    onValue(ref(db, `rooms/${room}/mode`), snap => { gameMode = snap.val() || "auto"; masterRender(); });
    onValue(ref(db, `rooms/${room}/narratorId`), snap => { amINarrator = (snap.val() === myPlayerId); masterRender(); });
    onValue(ref(db, `rooms/${room}/gameState`), snap => { gameState = snap.val() || {}; masterRender(); });
    onValue(ref(db, `rooms/${room}/autoState`), snap => { autoState = snap.val() || {}; masterRender(); });
    
    onValue(ref(db, `rooms/${room}/adminId`), snap => { 
        adminIdGlobal = snap.val(); 
        amIAdmin = (adminIdGlobal === myPlayerId); 
        document.getElementById('admin-panel').style.display = amIAdmin ? "block" : "none";
        document.getElementById('waiting-msg').style.display = amIAdmin ? "none" : "block";
        updateLobby(); 
        masterRender(); 
    });
    
    onValue(ref(db, `rooms/${room}/players`), snap => {
        currentPlayers = snap.val() || {};
        if (!currentPlayers[myPlayerId] && document.getElementById('lobby-screen').classList.contains('active')) {
            alert("Vous avez été expulsé."); location.reload();
        }
        if(document.getElementById('lobby-screen').classList.contains('active')) updateLobby();
        masterRender();
    });

    onValue(ref(db, `rooms/${room}/votes`), snap => {
        currentVotes = snap.val() || {};
        masterRender(); 
    });
});

document.getElementById('game-mode').addEventListener('change', (e) => {
    document.getElementById('narrator-select-row').style.display = e.target.value === "humain" ? "flex" : "none";
});

function updateLobby() {
    const list = document.getElementById('player-list');
    const narratorSelect = document.getElementById('narrator-id');
    let selectedNarrator = narratorSelect ? narratorSelect.value : myPlayerId;
    list.innerHTML = ""; if(narratorSelect) narratorSelect.innerHTML = "";

    document.getElementById('player-count').textContent = Object.keys(currentPlayers).length;
    
    for (let id in currentPlayers) {
        const p = currentPlayers[id];
        const li = document.createElement('li'); 
        let isMaire = (autoState.maireId === id || gameState.maireId === id) ? " 🎖️" : "";
        li.textContent = (id === adminIdGlobal ? "👑 " : "") + p.name + isMaire + (id === myPlayerId ? " (Toi)" : "");
        if(id === myPlayerId) li.style.color = "#e94560";

        if (amIAdmin && id !== myPlayerId) {
            const btn = document.createElement('button'); btn.textContent = "❌"; btn.className = "kick-btn";
            btn.onclick = () => remove(ref(db, `rooms/${currentRoom}/players/${id}`));
            li.appendChild(btn);
        }

        if(narratorSelect) {
            const opt = document.createElement('option'); opt.value = id; opt.textContent = p.name;
            if (id === selectedNarrator) opt.selected = true;
            narratorSelect.appendChild(opt);
        }
        list.appendChild(li);
    }
    if (narratorSelect && !narratorSelect.value) narratorSelect.value = myPlayerId;
}

// ==========================================
// 2. LANCER LE JEU
// ==========================================
document.getElementById('start-game-btn').addEventListener('click', () => {
    const mode = document.getElementById('game-mode').value;
    let narratorId = document.getElementById('narrator-id').value;
    const allIds = Object.keys(currentPlayers);
    let playersToAssign = mode === "humain" ? allIds.filter(id => id !== narratorId) : allIds;

    if (playersToAssign.length === 0) return alert("Il faut des joueurs !");

    const rolesPool = [];
    for(let i=0; i<parseInt(document.getElementById('wolf-count').value); i++) rolesPool.push("🐺 Loup-Garou");
    if(document.getElementById('role-voyante').checked) rolesPool.push("👁️ Voyante");
    if(document.getElementById('role-sorciere').checked) rolesPool.push("🧙‍♀️ Sorcière");
    if(document.getElementById('role-cupidon').checked) rolesPool.push("🏹 Cupidon");
    if(document.getElementById('role-chasseur').checked) rolesPool.push("🔫 Chasseur");

    if (rolesPool.length > playersToAssign.length) return alert("Trop de rôles spéciaux !");
    while(rolesPool.length < playersToAssign.length) rolesPool.push("🧑‍🌾 Simple Villageois");

    for (let i = rolesPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rolesPool[i], rolesPool[j]] = [rolesPool[j], rolesPool[i]];
    }

    let updates = {};
    playersToAssign.forEach((id, i) => updates[`rooms/${currentRoom}/players/${id}/role`] = rolesPool[i]);
    
    updates[`rooms/${currentRoom}/mode`] = mode;
    updates[`rooms/${currentRoom}/votes`] = null;

    let defaultState = {
        cupidonDone: false, lovers: ["none"], wolfVictim: "none",
        witchLifeUsed: false, witchDeathUsed: false, chasseurA_Tire: false,
        lastDeaths: ["none"], nextPhaseAfterChasseur: "vote_village", 
        revealRoles: document.getElementById('reveal-roles-death').checked,
        hasMaire: document.getElementById('rule-maire').checked,
        maireId: "none", dayCount: 1
    };

    if (mode === "humain") {
        updates[`rooms/${currentRoom}/narratorId`] = narratorId;
        updates[`rooms/${currentRoom}/players/${narratorId}/role`] = "🗣️ Narrateur";
        updates[`rooms/${currentRoom}/gameState`] = { ...defaultState, phase: "nuit_debut", nightLog: "" };
    } else {
        updates[`rooms/${currentRoom}/autoState`] = { 
            ...defaultState, phase: "nuit", 
            witchActsIfAttacked: document.getElementById('rule-witch-attacked').checked 
        };
    }
    
    updates[`rooms/${currentRoom}/status`] = "started"; 
    update(ref(db), updates);
});

document.getElementById('btn-restart').addEventListener('click', () => {
    if (amIAdmin) {
        update(ref(db, `rooms/${currentRoom}`), { status: "lobby", autoState: null, gameState: null, votes: null })
            .then(() => location.reload());
    } else location.reload();
});

// ==========================================
// 3. MASTER RENDER (LE CERVEAU DE L'AFFICHAGE)
// ==========================================
let currentAutoPhaseRendered = "";
let currentHumainPhaseRendered = "";
let currentNarratorPhaseRendered = "";

function masterRender() {
    if (!currentRoom || !isGameActive) return; 

    let currentPhase = (gameMode === "auto") ? autoState.phase : gameState.phase;
    if (!currentPhase) return; 

    let targetScreen = "game-screen";
    let isChasseurTurn = (gameMode === "auto" && currentPhase === "chasseur" && !autoState.chasseurA_Tire) || 
                         (gameMode === "humain" && currentPhase === "chasseur" && !gameState.chasseurA_Tire);

    if (currentPhase === "endgame") {
        targetScreen = "endgame-screen";
    } else if (currentPlayers[myPlayerId] && currentPlayers[myPlayerId].isDead && !(currentPlayers[myPlayerId].role === "🔫 Chasseur" && isChasseurTurn)) {
        targetScreen = "dead-screen";
    } else if (gameMode === "humain" && amINarrator) {
        targetScreen = "narrator-screen";
    }

    document.querySelectorAll('.screen').forEach(s => { if (s.id !== targetScreen) s.classList.remove('active'); });
    document.getElementById(targetScreen).classList.add('active');

    if (targetScreen === "endgame-screen") {
        document.getElementById('night-cover').style.display = 'none';
        document.getElementById('endgame-winner').textContent = gameMode === "auto" ? autoState.winnerMsg : gameState.winnerMsg;
    } else if (targetScreen === "narrator-screen") {
        renderNarratorUI();
    } else if (targetScreen === "game-screen") {
        document.getElementById('my-role-display').textContent = currentPlayers[myPlayerId]?.role || "???";
        if (gameMode === "auto") {
            if (amIAdmin) {
                document.getElementById('admin-auto-bar').style.display = "flex";
                document.getElementById('vote-progress').textContent = `${Object.keys(currentVotes).length} action(s)`;
            } else document.getElementById('admin-auto-bar').style.display = "none";
            handleAutoPhase();
        } else {
            document.getElementById('admin-auto-bar').style.display = "none";
            renderPlayerUIHumain();
        }
    }
}

// ==========================================
// MOTEUR AUTO : RENDER ET AVANCEMENT
// ==========================================
function handleAutoPhase() {
    let pName = autoState.phase;
    const nightCover = document.getElementById('night-cover');
    const dayAnnounce = document.getElementById('day-announcement');
    const voteZone = document.getElementById('vote-zone');
    const voteSubtitle = document.getElementById('vote-subtitle');

    if (autoState.lovers && autoState.lovers.includes(myPlayerId)) {
        let otherLoverId = autoState.lovers.find(id => id !== myPlayerId);
        if (currentPlayers[otherLoverId]) {
            document.getElementById('my-lover-display').style.display = "block";
            document.getElementById('my-lover-display').textContent = `💘 En couple avec : ${currentPlayers[otherLoverId].name}`;
        }
    }

    let isNight = ["nuit", "cupidon", "voyante", "loups", "sorciere"].includes(pName);
    nightCover.style.display = isNight ? 'flex' : 'none';
    dayAnnounce.style.display = ["jour", "resultat_election", "resultat_chasseur", "resultat_village"].includes(pName) ? 'block' : 'none';

    let canVote = false;
    if (!currentPlayers[myPlayerId]?.isDead && ["cupidon", "voyante", "loups", "sorciere", "election_maire", "vote_village"].includes(pName)) canVote = true;
    if (pName === "chasseur" && currentPlayers[myPlayerId]?.role === "🔫 Chasseur") canVote = true; // Chasseur vote mort
    voteZone.style.display = canVote ? 'block' : 'none';

    if (currentAutoPhaseRendered !== pName) {
        currentAutoPhaseRendered = pName;
        document.getElementById('my-vote-status').textContent = "";
        
        if (pName === "nuit") parler("La nuit tombe sur le village.", pName);
        else if (pName === "cupidon") {
            parler("Cupidon désigne deux amoureux.", pName);
            if (currentPlayers[myPlayerId]?.role === "🏹 Cupidon") {
                document.getElementById('vote-title').textContent = "🏹 Formez le couple";
                voteSubtitle.textContent = "Sélectionnez 2 joueurs."; renderPlayerVoteButtonsCommon("cupidon", autoState);
            } else voteZone.style.display = 'none';
        }
        else if (pName === "voyante") {
            parler("La voyante choisit un joueur.", pName);
            if (currentPlayers[myPlayerId]?.role === "👁️ Voyante") {
                document.getElementById('vote-title').textContent = "👁️ Choisis qui inspecter";
                voteSubtitle.textContent = "Son rôle secret s'affichera ici."; renderPlayerVoteButtonsCommon("voyante", autoState);
            } else voteZone.style.display = 'none';
        }
        else if (pName === "loups") {
            parler("Les loups-garous choisissent leur victime.", pName);
            if (currentPlayers[myPlayerId]?.role === "🐺 Loup-Garou") {
                document.getElementById('vote-title').textContent = "🐺 Cible de la Meute";
                voteSubtitle.textContent = "Mettez-vous d'accord !"; renderPlayerVoteButtonsCommon("loups", autoState);
            } else voteZone.style.display = 'none';
        }
        else if (pName === "sorciere") {
            parler("La sorcière se réveille.", pName);
            if (currentPlayers[myPlayerId]?.role === "🧙‍♀️ Sorcière") {
                if (autoState.wolfVictim === myPlayerId && !autoState.witchActsIfAttacked) {
                    dayAnnounce.style.display = "block"; voteZone.style.display = 'none';
                    dayAnnounce.textContent = "🩸 Les loups t'ont attaquée ! Tu es trop faible pour tes potions.";
                    set(ref(db, `rooms/${currentRoom}/votes/${myPlayerId}`), "skip"); 
                } else {
                    document.getElementById('vote-title').textContent = "🧙‍♀️ Tes Potions";
                    voteSubtitle.textContent = ""; renderPlayerVoteButtonsCommon("sorciere", autoState);
                }
            } else voteZone.style.display = 'none';
        }
        else if (pName === "jour" || pName === "resultat_village") {
            let txt = annoncerMortsUI(autoState); dayAnnounce.textContent = txt;
            parler((pName === "jour" ? "Le soleil se lève. " : "") + txt, pName);
        }
        else if (pName === "election_maire") {
            document.getElementById('vote-title').textContent = "🎖️ Élection du Maire";
            voteSubtitle.textContent = "Votez pour le joueur de votre choix."; renderPlayerVoteButtonsCommon("election_maire", autoState);
            parler("C'est l'heure d'élire le maire du village.", pName);
        }
        else if (pName === "resultat_election") {
            let mName = (autoState.maireId && autoState.maireId !== "none") ? currentPlayers[autoState.maireId].name : "Personne";
            let txt = `Le nouveau Maire est ${mName} ! Son vote compte double.`;
            dayAnnounce.textContent = txt; parler(txt, pName);
        }
        else if (pName === "chasseur") {
            parler("Le chasseur est mort ! Il a un dernier tir.", pName);
            if (currentPlayers[myPlayerId]?.role === "🔫 Chasseur") {
                document.getElementById('vote-title').textContent = "🔫 Ultimatum du Chasseur";
                voteSubtitle.textContent = "Tire sur quelqu'un avant de partir !"; renderPlayerVoteButtonsCommon("chasseur", autoState);
            } else voteZone.style.display = 'none';
        }
        else if (pName === "resultat_chasseur") {
            let txt = annoncerMortsUI(autoState); dayAnnounce.textContent = txt; parler(txt, pName);
        }
        else if (pName === "vote_village") {
            document.getElementById('vote-title').textContent = "🗳️ Tribunal du Village";
            voteSubtitle.textContent = "Votez pour éliminer un suspect."; renderPlayerVoteButtonsCommon("village", autoState);
            parler("C'est l'heure du vote.", pName);
        }
    }
}

document.getElementById('btn-next-phase').addEventListener('click', (e) => {
    e.target.disabled = true; setTimeout(() => { if(e.target) e.target.disabled = false; }, 1500); // Anti-spam double clic
    if (gameMode === "auto") advanceAutoPhase();
});

function getWolfConsensusAuto() {
    let wolfCount = 0;
    for(let id in currentPlayers) { if (currentPlayers[id].role === "🐺 Loup-Garou" && !currentPlayers[id].isDead) wolfCount++; }
    let votes = Object.values(currentVotes);
    if (votes.length < wolfCount) return "not_enough";
    let first = votes[0];
    return votes.every(v => v === first) ? first : "no_consensus";
}

function advanceAutoPhase() {
    let phase = autoState.phase; let nextPhase = "nuit"; let updates = {}; let deadThisTurn = [];

    let winMsg = checkWinCondition(autoState.lovers, autoState.lastDeaths || []);
    if (winMsg && !["start", "nuit", "voyante", "loups", "sorciere", "cupidon"].includes(phase)) {
        updates[`rooms/${currentRoom}/autoState/phase`] = "endgame";
        updates[`rooms/${currentRoom}/autoState/winnerMsg`] = winMsg;
        update(ref(db), updates); return;
    }

    if (phase === "start" || phase === "resultat_village" || phase === "resultat_chasseur" && autoState.nextPhaseAfterChasseur === "nuit") {
        nextPhase = "nuit"; updates[`rooms/${currentRoom}/autoState/dayCount`] = (autoState.dayCount || 1) + 1;
        updates[`rooms/${currentRoom}/autoState/lastDeaths`] = ["none"]; 
    }
    else if (phase === "nuit" || phase === "cupidon" || phase === "voyante") {
        if (phase === "cupidon") {
            let loverIds = Object.values(currentVotes)[0] || [];
            updates[`rooms/${currentRoom}/autoState/lovers`] = loverIds.length > 0 ? loverIds : ["none"];
            updates[`rooms/${currentRoom}/autoState/cupidonDone`] = true;
        }
        nextPhase = getNextNightPhase(phase, autoState);
    }
    else if (phase === "loups") {
        let victim = getWolfConsensusAuto();
        if (victim === "not_enough" || victim === "no_consensus") {
            if(!confirm("Les loups n'ont pas tous voté pareil. Forcer le passage ? (Personne ne meurt)")) return;
            victim = "none";
        }
        updates[`rooms/${currentRoom}/autoState/wolfVictim`] = victim;
        nextPhase = getNextNightPhase("loups", autoState);
    }
    else if (phase === "sorciere") {
        let witchId = Object.keys(currentPlayers).find(id => currentPlayers[id].role === "🧙‍♀️ Sorcière");
        let witchVote = witchId ? currentVotes[witchId] : null;

        if (autoState.wolfVictim && autoState.wolfVictim !== "none" && (!witchVote || !witchVote.revive)) deadThisTurn.push(autoState.wolfVictim);
        if (witchVote && witchVote.kill && witchVote.kill !== "none") {
            deadThisTurn.push(witchVote.kill); updates[`rooms/${currentRoom}/autoState/witchDeathUsed`] = true;
        }
        if (witchVote && witchVote.revive) updates[`rooms/${currentRoom}/autoState/witchLifeUsed`] = true;

        applyDeathsAndMayor(deadThisTurn, autoState, updates, "autoState"); nextPhase = "jour";
    }
    else if (phase === "jour") {
        let lastD = autoState.lastDeaths || [];
        if (lastD.some(id => id !== "none" && currentPlayers[id] && currentPlayers[id].role === "🔫 Chasseur")) {
            nextPhase = "chasseur"; updates[`rooms/${currentRoom}/autoState/nextPhaseAfterChasseur`] = (autoState.dayCount === 1 && autoState.hasMaire && autoState.maireId === "none") ? "election_maire" : "vote_village";
        } else {
            nextPhase = (autoState.dayCount === 1 && autoState.hasMaire && autoState.maireId === "none") ? "election_maire" : "vote_village";
        }
    }
    else if (phase === "election_maire") {
        let winner = getHighestVotedId(autoState);
        updates[`rooms/${currentRoom}/autoState/maireId`] = winner || "none"; nextPhase = "resultat_election";
    }
    else if (phase === "resultat_election") nextPhase = "vote_village";
    else if (phase === "vote_village") {
        let victim = getHighestVotedId(autoState);
        if (victim && victim !== "skip") applyDeathsAndMayor([victim], autoState, updates, "autoState");
        else updates[`rooms/${currentRoom}/autoState/lastDeaths`] = ["none"];
        nextPhase = "resultat_village";
    }
    else if (phase === "resultat_village") {
        let lastD = autoState.lastDeaths || [];
        if (lastD.some(id => id !== "none" && currentPlayers[id] && currentPlayers[id].role === "🔫 Chasseur" && !autoState.chasseurA_Tire)) {
            nextPhase = "chasseur"; updates[`rooms/${currentRoom}/autoState/nextPhaseAfterChasseur`] = "nuit";
        } else { nextPhase = "nuit"; updates[`rooms/${currentRoom}/autoState/dayCount`] = (autoState.dayCount || 1) + 1; updates[`rooms/${currentRoom}/autoState/lastDeaths`] = ["none"];}
    }
    else if (phase === "chasseur") {
        updates[`rooms/${currentRoom}/autoState/chasseurA_Tire`] = true;
        let victim = getHighestVotedId(autoState);
        if (victim && victim !== "skip") applyDeathsAndMayor([victim], autoState, updates, "autoState");
        else updates[`rooms/${currentRoom}/autoState/lastDeaths`] = ["none"];
        nextPhase = "resultat_chasseur";
    }
    else if (phase === "resultat_chasseur") nextPhase = autoState.nextPhaseAfterChasseur;

    updates[`rooms/${currentRoom}/autoState/phase`] = nextPhase; updates[`rooms/${currentRoom}/votes`] = null; 
    update(ref(db), updates);
}

// ==========================================
// MOTEUR HUMAIN : RENDER ET AVANCEMENT
// ==========================================
function renderPlayerUIHumain() {
    const nightCover = document.getElementById('night-cover');
    const dayAnnounce = document.getElementById('day-announcement');
    const voteZone = document.getElementById('vote-zone');
    
    if (gameState.lovers && gameState.lovers.includes(myPlayerId)) {
        let other = gameState.lovers.find(id => id !== myPlayerId);
        if (currentPlayers[other]) {
            document.getElementById('my-lover-display').style.display = "block";
            document.getElementById('my-lover-display').textContent = `💘 En couple avec : ${currentPlayers[other].name}`;
        }
    }

    let isNight = ["nuit_debut", "cupidon", "voyante", "loups", "sorciere", "nuit_fin"].includes(gameState.phase);
    nightCover.style.display = isNight ? "flex" : "none";

    // Gestion de l'affichage unique (éviter le clignotement)
    if (currentHumainPhaseRendered !== gameState.phase) {
        currentHumainPhaseRendered = gameState.phase;
        voteZone.style.display = "none"; dayAnnounce.style.display = "none";
        document.getElementById('my-vote-status').textContent = "";

        if (["jour", "resultat_village", "resultat_chasseur", "resultat_election"].includes(gameState.phase)) {
            dayAnnounce.style.display = "block";
            if (gameState.phase === "resultat_election") {
                let mName = (gameState.maireId && gameState.maireId !== "none") ? currentPlayers[gameState.maireId]?.name : "Personne";
                dayAnnounce.textContent = `Le nouveau Maire est ${mName || "Personne"} !`;
            } else { dayAnnounce.textContent = annoncerMortsUI(gameState); }
        }

        // LE CORRECTIF POUR LE CHASSEUR EST ICI !
        let canVote = false;
        if (!currentPlayers[myPlayerId]?.isDead && (gameState.phase === "vote_village" || gameState.phase === "election_maire")) canVote = true;
        if (gameState.phase === "chasseur" && currentPlayers[myPlayerId]?.role === "🔫 Chasseur") canVote = true; // Le chasseur vote MORT

        if (canVote) {
            voteZone.style.display = "block";
            let title = "🗳️ Vote du Village";
            if (gameState.phase === "chasseur") title = "🔫 Ultimatum";
            if (gameState.phase === "election_maire") title = "🎖️ Élection du Maire";
            document.getElementById('vote-title').textContent = title;
            renderPlayerVoteButtonsCommon(gameState.phase === "chasseur" ? "chasseur" : (gameState.phase === "election_maire" ? "election_maire" : "village"), gameState); 
        }
    }
}

function renderNarratorUI() {
    renderNarratorPlayerList(); 
    const actionBox = document.getElementById('narrator-action-area');
    const scriptBox = document.getElementById('narrator-script');
    const nextBtn = document.getElementById('btn-narrator-next');
    const revoteBtn = document.getElementById('btn-narrator-revote');

    if (currentNarratorPhaseRendered !== gameState.phase) {
        currentNarratorPhaseRendered = gameState.phase;
        actionBox.innerHTML = ""; revoteBtn.style.display = "none";
        nextBtn.textContent = "Suivant ➡️"; 
        
        // Anti double-clic très important pour le Narrateur Humain
        nextBtn.onclick = (e) => {
            e.target.disabled = true; setTimeout(() => { if(e.target) e.target.disabled = false; }, 1500);
            handleNarratorNext();
        };

        switch(gameState.phase) {
            case "nuit_debut":
                scriptBox.textContent = `"La nuit tombe sur le village. Fermez les yeux."`; actionBox.innerHTML = "<i>Attendez le silence.</i>"; break;
            case "cupidon":
                scriptBox.textContent = `"Cupidon se réveille et désigne deux amoureux."`;
                actionBox.innerHTML = generateSelectAlive("cup-1", "Amoureux 1 :") + generateSelectAlive("cup-2", "Amoureux 2 :"); break;
            case "voyante":
                scriptBox.textContent = `"La voyante se réveille et me désigne un joueur."`; actionBox.innerHTML = generateSelectAlive("voy-target", "Joueur inspecté :");
                setTimeout(() => { document.getElementById('voy-target').onchange = (e) => {
                    let v = e.target.value; if(v !== "none") actionBox.innerHTML += `<div style="margin-top:10px; padding:10px; background:#e94560; border-radius:5px;">Montrez : <b>${currentPlayers[v].role}</b></div>`;
                }; }, 50); break;
            case "loups":
                scriptBox.textContent = `"Les loups se réveillent et désignent une victime."`; actionBox.innerHTML = generateSelectAlive("wolf-target", "Victime :"); break;
            case "sorciere":
                scriptBox.textContent = `"La sorcière se réveille. Je lui montre la victime."`;
                let wVictimName = (gameState.wolfTarget && gameState.wolfTarget !== "none") ? currentPlayers[gameState.wolfTarget]?.name : "Personne";
                let html = `<p>Victime : <b style="color:#e94560">${wVictimName || "Personne"}</b></p>`;
                if(!gameState.witchLifeUsed && wVictimName && wVictimName !== "Personne") html += `<label style="display:block; margin-bottom:10px;"><input type="checkbox" id="witch-revive"> 🧪 Ressusciter</label>`;
                if(!gameState.witchDeathUsed) html += generateSelectAlive("witch-kill", "☠️ Tuer avec la potion :");
                actionBox.innerHTML = html; break;
            case "nuit_fin":
                scriptBox.textContent = `(Résolution de la nuit...)`; break;
            case "jour":
                scriptBox.textContent = `"Le soleil se lève."`; actionBox.innerHTML = `<p>${annoncerMortsUI(gameState)}</p>`; break;
            case "election_maire":
                scriptBox.textContent = `"Villageois, élisez votre Maire ! Son vote compte double."`;
                revoteBtn.style.display = "block"; revoteBtn.onclick = () => update(ref(db, `rooms/${currentRoom}/votes`), null);
                nextBtn.textContent = "🎖️ Nommer le Maire"; break;
            case "resultat_election":
                scriptBox.textContent = `Le Maire a été élu.`; 
                let mName = (gameState.maireId && gameState.maireId !== "none") ? currentPlayers[gameState.maireId]?.name : "Personne";
                actionBox.innerHTML = `<p>Le nouveau Maire est <b>${mName || "Personne"}</b>.</p>`; break;
            case "chasseur":
                scriptBox.textContent = `"Le chasseur est mort ! Il a un dernier tir sur son téléphone."`; actionBox.innerHTML = "Laissez-le voter."; break;
            case "vote_village":
                scriptBox.textContent = `"C'est l'heure de voter sur vos téléphones."`;
                revoteBtn.style.display = "block"; revoteBtn.onclick = () => update(ref(db, `rooms/${currentRoom}/votes`), null);
                nextBtn.textContent = "⚖️ Clôturer le Vote"; break;
            case "resultat_village":
                scriptBox.textContent = `Le village a parlé.`; actionBox.innerHTML = `<p>${annoncerMortsUI(gameState)}</p>`; break;
            case "resultat_chasseur":
                scriptBox.textContent = `Le tir retentit.`; actionBox.innerHTML = `<p>${annoncerMortsUI(gameState)}</p>`; break;
        }
    }

    // Affichage des votes en direct sans détruire les boutons
    if (gameState.phase === "election_maire" || gameState.phase === "vote_village") {
        let voteHtml = `<p style="color:#ffbc00; font-weight:bold;">Votes en cours :</p><ul>`;
        let counts = {};
        for(let voter in currentVotes) { 
            let t = currentVotes[voter]; 
            if(typeof t === 'string' && t !== "skip" && t !== "none") {
                let weight = (gameState.maireId === voter) ? 2 : 1;
                counts[t] = (counts[t] || 0) + weight;
            }
        }
        for(let t in counts) {
            let p = currentPlayers[t];
            if (p) voteHtml += `<li>${p.name} : ${counts[t]} voix</li>`;
        }
        document.getElementById('narrator-action-area').innerHTML = voteHtml + `</ul>`;
    }
}

function handleNarratorNext() {
    let p = gameState.phase; let updates = {}; let next = "nuit_debut"; let newLog = gameState.nightLog || "";
    let deadThisTurn = [];

    if (p === "nuit_debut") {
        newLog = ""; updates[`rooms/${currentRoom}/gameState/lastDeaths`] = ["none"];
        next = getNextNightPhase(p, gameState);
    }
    else if (p === "cupidon") {
        let c1 = document.getElementById('cup-1').value; let c2 = document.getElementById('cup-2').value;
        if(c1 !== "none" && c2 !== "none") {
            updates[`rooms/${currentRoom}/gameState/lovers`] = [c1, c2]; updates[`rooms/${currentRoom}/gameState/cupidonDone`] = true;
            newLog += `\n🏹 Cupidon a lié ${currentPlayers[c1].name} et ${currentPlayers[c2].name}.`;
        }
        next = getNextNightPhase(p, gameState);
    }
    else if (p === "voyante") {
        let v = document.getElementById('voy-target')?.value;
        if(v && v!=="none") newLog += `\n👁️ Voyante a vu ${currentPlayers[v].name}.`;
        next = getNextNightPhase(p, gameState);
    }
    else if (p === "loups") {
        let w = document.getElementById('wolf-target').value; updates[`rooms/${currentRoom}/gameState/wolfTarget`] = w;
        if(w!=="none") newLog += `\n🐺 Loups attaquent ${currentPlayers[w].name}.`;
        next = getNextNightPhase(p, gameState);
    }
    else if (p === "sorciere") {
        let revive = document.getElementById('witch-revive') ? document.getElementById('witch-revive').checked : false;
        let kill = document.getElementById('witch-kill') ? document.getElementById('witch-kill').value : "none";
        
        if(revive) { 
            updates[`rooms/${currentRoom}/gameState/witchLifeUsed`] = true; updates[`rooms/${currentRoom}/gameState/wolfTarget`] = "none"; 
            newLog += `\n🧪 Sorcière a sauvé.`; 
        }
        if(kill !== "none") { 
            updates[`rooms/${currentRoom}/gameState/witchDeathUsed`] = true; updates[`rooms/${currentRoom}/gameState/witchTarget`] = kill; 
            newLog += `\n☠️ Sorcière a tué ${currentPlayers[kill].name}.`; 
        } else updates[`rooms/${currentRoom}/gameState/witchTarget`] = "none";
        
        if (gameState.wolfTarget && gameState.wolfTarget !== "none" && !revive) deadThisTurn.push(gameState.wolfTarget);
        if (kill !== "none") deadThisTurn.push(kill);
        
        applyDeathsAndMayor(deadThisTurn, gameState, updates, "gameState"); next = "jour";
    }
    else if (p === "jour") {
        let lastD = gameState.lastDeaths || [];
        if (lastD.some(id => id !== "none" && currentPlayers[id] && currentPlayers[id].role === "🔫 Chasseur")) {
            next = "chasseur"; updates[`rooms/${currentRoom}/gameState/nextPhaseAfterChasseur`] = (gameState.dayCount === 1 && gameState.hasMaire && gameState.maireId === "none") ? "election_maire" : "vote_village";
        } else next = (gameState.dayCount === 1 && gameState.hasMaire && gameState.maireId === "none") ? "election_maire" : "vote_village";
    }
    else if (p === "election_maire") {
        let winner = getHighestVotedId(gameState);
        updates[`rooms/${currentRoom}/gameState/maireId`] = winner || "none"; next = "resultat_election";
    }
    else if (p === "resultat_election") next = "vote_village";
    else if (p === "vote_village") {
        let highest = getHighestVotedId(gameState);
        if(highest && highest !== "skip" && highest !== "none") { 
            applyDeathsAndMayor([highest], gameState, updates, "gameState"); newLog += `\n⚖️ Village a tué ${currentPlayers[highest].name}.`; 
        } else updates[`rooms/${currentRoom}/gameState/lastDeaths`] = ["none"];
        next = "resultat_village";
    }
    else if (p === "resultat_village") {
        let lastD = gameState.lastDeaths || [];
        if (lastD.some(id => id !== "none" && currentPlayers[id] && currentPlayers[id].role === "🔫 Chasseur" && !gameState.chasseurA_Tire)) {
            next = "chasseur"; updates[`rooms/${currentRoom}/gameState/nextPhaseAfterChasseur`] = "nuit_debut";
        } else { next = "nuit_debut"; updates[`rooms/${currentRoom}/gameState/dayCount`] = (gameState.dayCount || 1) + 1; updates[`rooms/${currentRoom}/gameState/lastDeaths`] = ["none"]; }
    }
    else if (p === "chasseur") {
        updates[`rooms/${currentRoom}/gameState/chasseurA_Tire`] = true;
        let highest = getHighestVotedId(gameState);
        if(highest && highest !== "skip" && highest !== "none") { 
            applyDeathsAndMayor([highest], gameState, updates, "gameState"); newLog += `\n🔫 Chasseur a tué ${currentPlayers[highest].name}.`; 
        } else updates[`rooms/${currentRoom}/gameState/lastDeaths`] = ["none"];
        next = "resultat_chasseur";
    }
    else if (p === "resultat_chasseur") next = gameState.nextPhaseAfterChasseur;

    let winMsg = checkWinCondition(gameState.lovers, updates[`rooms/${currentRoom}/gameState/lastDeaths`] || []);
    if (winMsg && !["nuit_debut", "cupidon", "voyante", "loups", "sorciere"].includes(p)) {
        updates[`rooms/${currentRoom}/gameState/phase`] = "endgame"; updates[`rooms/${currentRoom}/gameState/winnerMsg`] = winMsg;
    } else updates[`rooms/${currentRoom}/gameState/phase`] = next;

    updates[`rooms/${currentRoom}/gameState/nightLog`] = newLog; updates[`rooms/${currentRoom}/votes`] = null; 
    update(ref(db), updates).catch(err => alert("Erreur serveur: " + err));
}

function renderNarratorPlayerList() {
    const list = document.getElementById('narrator-player-list'); if(!list) return; list.innerHTML = "";
    for (let id in currentPlayers) {
        if (id === myPlayerId) continue;
        const p = currentPlayers[id]; const li = document.createElement('li'); li.style.padding = "8px"; li.style.margin = "4px 0";
        let isMaire = (gameState.maireId === id) ? " 🎖️" : "";
        if(p.isDead) li.innerHTML = `<span style="text-decoration:line-through; color:#888;">${p.name}${isMaire} (${p.role})</span> <span style="color:#ff0000">Mort</span>`;
        else li.innerHTML = `<span>${p.name}${isMaire} <span style="color:#e94560; font-size: 0.8em;">[${p.role}]</span></span>`;
        list.appendChild(li);
    }
    document.getElementById('history-text').innerHTML = (gameState.nightLog || "Rien à signaler.").replace(/\n/g, "<br>");
}

// ==========================================
// UTILITAIRES PARTAGES (Sécurisés au max)
// ==========================================
function generateSelectAlive(id, label, defaultOpt = "Personne") {
    let html = `<label>${label}</label><select id="${id}" style="width:100%; margin-bottom:10px; padding:10px;"><option value="none">${defaultOpt}</option>`;
    for (let pid in currentPlayers) {
        if (!currentPlayers[pid].isDead && pid !== myPlayerId && currentPlayers[pid].role !== "🗣️ Narrateur") html += `<option value="${pid}">${currentPlayers[pid].name} (${currentPlayers[pid].role})</option>`;
    }
    return html + `</select>`;
}

function getHighestVotedId(stateObj) {
    if (!currentVotes || typeof currentVotes !== "object") return null;
    let counts = {};
    for (let voter in currentVotes) {
        let val = currentVotes[voter];
        if (!val || val === "none" || val === "skip") continue;
        if (typeof val === "object" && val.kill) val = val.kill; 
        if (Array.isArray(val)) val = val[0]; 

        if (typeof val === "string" && val !== "none" && val !== "skip") {
            let weight = (stateObj && stateObj.maireId === voter) ? 2 : 1;
            counts[val] = (counts[val] || 0) + weight;
        }
    }
    let highest = null, max = 0;
    for (let t in counts) { if (counts[t] > max) { max = counts[t]; highest = t; } }
    return highest;
}

function roleExists(roleName) { return Object.values(currentPlayers).some(p => p.role === roleName && !p.isDead); }

function propagateDeaths(deathsArray, lovers) {
    let finalDeaths = new Set(deathsArray); let added = true;
    while(added) {
        added = false;
        for (let d of finalDeaths) {
            if (lovers && lovers.includes(d)) {
                let other = lovers.find(l => l !== d);
                if (other && !finalDeaths.has(other)) { finalDeaths.add(other); added = true; }
            }
        }
    }
    return Array.from(finalDeaths);
}

function applyDeathsAndMayor(deathsArray, stateObj, updates, stateKey) {
    let finalDeaths = propagateDeaths(deathsArray, stateObj.lovers);
    let actualDeaths = [];
    finalDeaths.forEach(id => {
        if (id && id !== "none" && id !== "skip") {
            updates[`rooms/${currentRoom}/players/${id}/isDead`] = true; actualDeaths.push(id);
        }
    });
    if (stateObj.maireId && actualDeaths.includes(stateObj.maireId)) {
        let aliveIds = Object.keys(currentPlayers).filter(id => !currentPlayers[id].isDead && !actualDeaths.includes(id) && currentPlayers[id].role !== "🗣️ Narrateur" && currentPlayers[id].role !== "En attente");
        updates[`rooms/${currentRoom}/${stateKey}/maireId`] = aliveIds.length > 0 ? aliveIds[Math.floor(Math.random() * aliveIds.length)] : "none";
    }
    updates[`rooms/${currentRoom}/${stateKey}/lastDeaths`] = actualDeaths.length > 0 ? actualDeaths : ["none"];
    return actualDeaths;
}

function checkWinCondition(lovers, pendingDeaths = []) {
    let tempPlayers = JSON.parse(JSON.stringify(currentPlayers));
    pendingDeaths.forEach(id => { if(id !== "none" && tempPlayers[id]) tempPlayers[id].isDead = true; });

    let wolves = 0, villagers = 0, loversAlive = 0, totalAlive = 0;
    for(let id in tempPlayers) {
        if(!tempPlayers[id].isDead && tempPlayers[id].role && tempPlayers[id].role !== "🗣️ Narrateur" && tempPlayers[id].role !== "En attente") {
            totalAlive++;
            if(tempPlayers[id].role === "🐺 Loup-Garou") wolves++; else villagers++;
            if (lovers && lovers.includes(id)) loversAlive++;
        }
    }
    if (totalAlive === 0) return "Égalité ! Tout le monde est mort.";
    if (loversAlive === totalAlive && totalAlive === 2) return "💘 Les Amoureux gagnent !";
    if (wolves === 0) return "🧑‍🌾 Le Village a vaincu les loups !";
    if (wolves >= villagers) return "🐺 Les Loups-Garous contrôlent le village !";
    return null;
}

function getNextNightPhase(after, stateObj) {
    if (after === "nuit_debut" || after === "nuit") {
        if (roleExists("🏹 Cupidon") && !stateObj.cupidonDone) return "cupidon";
        if (roleExists("👁️ Voyante")) return "voyante"; return "loups";
    }
    if (after === "cupidon") { if (roleExists("👁️ Voyante")) return "voyante"; return "loups"; }
    if (after === "voyante") return "loups";
    if (after === "loups") return roleExists("🧙‍♀️ Sorcière") ? "sorciere" : "jour";
    return "jour";
}

function annoncerMortsUI(stateObj) {
    let deathsArray = stateObj.lastDeaths || [];
    if (!deathsArray || deathsArray.length === 0 || deathsArray.includes("none")) return "Personne n'est mort.";
    let text = "Mort(s) : ";
    deathsArray.forEach(id => {
        let p = currentPlayers[id];
        if (p) text += p.name + (stateObj.revealRoles ? ` (${p.role})` : "") + ". ";
    });
    return text;
}

// ==========================================
// RENDER BOUTONS VOTE JOUEURS
// ==========================================
function renderPlayerVoteButtonsCommon(type, stateObj) {
    const list = document.getElementById('vote-list'); const witchUI = document.getElementById('witch-options');
    list.innerHTML = ""; witchUI.style.display = "none"; selectedTargetIds = [];
    document.getElementById('btn-confirm-action').style.display = "none";

    if (type === "sorciere" && gameMode === "auto") {
        witchUI.style.display = "block"; document.getElementById('btn-confirm-action').style.display = "block";
        let victimId = stateObj.wolfVictim;
        let reviveSec = document.getElementById('witch-revive-section'); let checkRevive = document.getElementById('witch-revive-check'); checkRevive.checked = false;
        if (victimId && victimId !== "none" && !stateObj.witchLifeUsed) {
            reviveSec.style.display = "block"; document.getElementById('witch-victim-name').textContent = currentPlayers[victimId].name;
        } else reviveSec.style.display = "none";

        let killSec = document.getElementById('witch-kill-section');
        if (!stateObj.witchDeathUsed) {
            killSec.style.display = "block"; list.innerHTML = "";
            const skipBtn = document.createElement('button'); skipBtn.textContent = "Ne tuer personne";
            skipBtn.className = "target-btn"; skipBtn.style.border = "2px solid #e94560"; selectedTargetIds = ["skip"];
            skipBtn.onclick = () => selectTarget("skip", skipBtn, 1); list.appendChild(skipBtn);
            for (let id in currentPlayers) {
                if (id === myPlayerId || currentPlayers[id].isDead || currentPlayers[id].role === "🗣️ Narrateur") continue;
                const btn = document.createElement('button'); btn.textContent = currentPlayers[id].name; btn.className = "target-btn";
                btn.onclick = () => selectTarget(id, btn, 1); list.appendChild(btn);
            }
        } else { killSec.style.display = "none"; selectedTargetIds = ["skip"]; }

        document.getElementById('btn-confirm-action').onclick = () => {
            witchUI.style.display = "none"; list.innerHTML = ""; document.getElementById('btn-confirm-action').style.display = "none";
            set(ref(db, `rooms/${currentRoom}/votes/${myPlayerId}`), { revive: checkRevive.checked, kill: selectedTargetIds[0] === "skip" ? "none" : selectedTargetIds[0] });
            document.getElementById('my-vote-status').textContent = "Potions décidées. Chut...";
        }; return;
    }

    let maxSelections = type === "cupidon" ? 2 : 1;
    if (type === "village" || type === "election_maire") {
        const skipBtn = document.createElement('button'); skipBtn.textContent = (type === "election_maire") ? "Ne voter pour personne" : "Ne voter contre personne"; skipBtn.className = "target-btn";
        skipBtn.onclick = () => selectTarget("skip", skipBtn, maxSelections); list.appendChild(skipBtn);
    }

    for (let id in currentPlayers) {
        if (id === myPlayerId && type !== "chasseur" && type !== "cupidon" && type !== "election_maire") continue;
        if (currentPlayers[id].isDead || currentPlayers[id].role === "🗣️ Narrateur") continue;
        if (type === "loups" && currentPlayers[id].role === "🐺 Loup-Garou") continue;

        const btn = document.createElement('button'); btn.textContent = currentPlayers[id].name; btn.className = "target-btn";
        btn.onclick = () => selectTarget(id, btn, maxSelections); list.appendChild(btn);
    }

    document.getElementById('btn-confirm-action').onclick = () => {
        if (selectedTargetIds.length !== maxSelections && !selectedTargetIds.includes("skip")) return;
        document.getElementById('vote-list').innerHTML = ""; document.getElementById('btn-confirm-action').style.display = "none";

        if (currentPhaseName === "voyante" && gameMode === "auto") {
            document.getElementById('my-vote-status').textContent = `🔍 Tu as vu : ${currentPlayers[selectedTargetIds[0]].name} est ${currentPlayers[selectedTargetIds[0]].role}`;
            set(ref(db, `rooms/${currentRoom}/votes/${myPlayerId}`), "done");
        } else if (currentPhaseName === "cupidon" && gameMode === "auto") {
            set(ref(db, `rooms/${currentRoom}/votes/${myPlayerId}`), selectedTargetIds);
            document.getElementById('my-vote-status').textContent = "Couples formés.";
        } else {
            set(ref(db, `rooms/${currentRoom}/votes/${myPlayerId}`), selectedTargetIds[0]);
            document.getElementById('my-vote-status').textContent = "Choix validé.";
        }
    };
}

function selectTarget(id, btnElement, maxSelections) {
    if (id === "skip") {
        selectedTargetIds = ["skip"];
        document.querySelectorAll('.target-btn').forEach(b => { b.style.border = "2px solid transparent"; b.style.background = "#2a3a5a"; });
        btnElement.style.border = "2px solid #e94560"; btnElement.style.background = "#16213e";
    } else {
        if (selectedTargetIds.includes("skip")) selectedTargetIds = [];
        const index = selectedTargetIds.indexOf(id);
        if (index > -1) {
            selectedTargetIds.splice(index, 1);
            btnElement.style.border = "2px solid transparent"; btnElement.style.background = "#2a3a5a";
        } else {
            if (selectedTargetIds.length < maxSelections) {
                selectedTargetIds.push(id); btnElement.style.border = "2px solid #e94560"; btnElement.style.background = "#16213e";
            } else if (maxSelections === 1) {
                selectedTargetIds = [id];
                document.querySelectorAll('.target-btn').forEach(b => { b.style.border = "2px solid transparent"; b.style.background = "#2a3a5a"; });
                btnElement.style.border = "2px solid #e94560"; btnElement.style.background = "#16213e";
            }
        }
    }
    document.getElementById('btn-confirm-action').style.display = (selectedTargetIds.length === maxSelections || selectedTargetIds.includes("skip")) ? "block" : "none";
}

const roleCard = document.getElementById('role-card'), roleDisplay = document.getElementById('my-role-display'), roleInst = document.getElementById('role-instruction');
roleCard.onmousedown = roleCard.ontouchstart = () => { roleDisplay.style.display = "block"; roleInst.style.display = "none"; window.speechSynthesis.resume(); };
roleCard.onmouseup = roleCard.ontouchend = () => { roleDisplay.style.display = "none"; roleInst.style.display = "block"; };
