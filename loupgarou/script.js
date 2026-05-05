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

// SECURITÉ : Empêche l'écran de fin de s'afficher dès la connexion
let isGameActive = false; 

// Variables d'état
let autoState = {};    // Pour le mode Auto
let gameState = {};    // Pour le mode Humain
let selectedTargetIds = []; 

// VOIX (Mode Auto uniquement)
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
    set(playerRef, { name: displayName, role: "En attente", isDead: false });

    if (wantsToAdmin) {
        set(ref(db, `rooms/${room}/adminId`), myPlayerId);
        set(ref(db, `rooms/${room}/status`), "lobby");
    }

    // ECOUTES DE BASE
    onValue(ref(db, `rooms/${room}/adminId`), (snap) => {
        adminIdGlobal = snap.val();
        amIAdmin = (adminIdGlobal === myPlayerId);
        document.getElementById('admin-panel').style.display = amIAdmin ? "block" : "none";
        document.getElementById('waiting-msg').style.display = amIAdmin ? "none" : "block";
        updateLobby();
    });

    onValue(ref(db, `rooms/${room}/narratorId`), (snap) => {
        amINarrator = (snap.val() === myPlayerId);
    });

    onValue(ref(db, `rooms/${room}/players`), (snap) => {
        currentPlayers = snap.val() || {};
        if (!currentPlayers[myPlayerId] && document.getElementById('lobby-screen').classList.contains('active')) {
            alert("Vous avez été expulsé."); location.reload();
        }
        if(document.getElementById('lobby-screen').classList.contains('active')) updateLobby();
        if(amINarrator && document.getElementById('narrator-screen').classList.contains('active')) renderNarratorPlayerList();
        checkScreenState();
    });

    onValue(ref(db, `rooms/${room}/votes`), (snap) => {
        currentVotes = snap.val() || {};
        if (gameMode === "auto") {
            document.getElementById('vote-progress').textContent = `${Object.keys(currentVotes).length} action(s)`;
        } else if (gameMode === "humain" && amINarrator && gameState.phase === "vote_village") {
            renderNarratorUI();
        }
    });

    // ECOUTE DU STATUT (LE VERROU DE SÉCURITÉ)
    onValue(ref(db, `rooms/${room}/status`), (snap) => {
        let val = snap.val();
        if (val === "lobby" || !val) {
            isGameActive = false;
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('lobby-screen').classList.add('active');
            document.getElementById('vote-zone').style.display = "none";
            document.getElementById('night-cover').style.display = "none";
        } else if (val === "role_reveal" || val === "started") {
            isGameActive = true;
            onValue(ref(db, `rooms/${room}/mode`), (modeSnap) => {
                gameMode = modeSnap.val();
            }, {onlyOnce: true});
        }
    });

    // ECOUTE MOTEURS DE JEU
    onValue(ref(db, `rooms/${room}/autoState`), (snap) => {
        if(gameMode !== "auto" || !isGameActive) return;
        autoState = snap.val() || {};
        if (autoState.phase) handleAutoPhase();
    });

    onValue(ref(db, `rooms/${room}/gameState`), (snap) => {
        if(gameMode !== "humain" || !isGameActive) return;
        gameState = snap.val() || {};
        if (!gameState.phase) return;

        if (gameState.phase !== "lobby" && document.getElementById('lobby-screen').classList.contains('active')) {
            document.getElementById('lobby-screen').classList.remove('active');
            if (amINarrator) document.getElementById('narrator-screen').classList.add('active');
            else document.getElementById('game-screen').classList.add('active');
        }

        checkScreenState();
        if (amINarrator) renderNarratorUI();
        else renderPlayerUIHumain();
    });
});

// AFFICHER LE SELECTEUR NARRATEUR
document.getElementById('game-mode').addEventListener('change', (e) => {
    document.getElementById('narrator-select-row').style.display = e.target.value === "humain" ? "flex" : "none";
});

function updateLobby() {
    const list = document.getElementById('player-list');
    const narratorSelect = document.getElementById('narrator-id');
    list.innerHTML = ""; if(narratorSelect) narratorSelect.innerHTML = "";
    document.getElementById('player-count').textContent = Object.keys(currentPlayers).length;
    
    for (let id in currentPlayers) {
        const p = currentPlayers[id];
        const li = document.createElement('li'); 
        li.textContent = (id === adminIdGlobal ? "👑 " : "") + p.name + (id === myPlayerId ? " (Toi)" : "");
        if(id === myPlayerId) li.style.color = "#e94560";

        if (amIAdmin && id !== myPlayerId) {
            const btn = document.createElement('button'); btn.textContent = "❌"; btn.className = "kick-btn";
            btn.onclick = () => remove(ref(db, `rooms/${currentRoom}/players/${id}`));
            li.appendChild(btn);
        }

        if(narratorSelect) {
            const opt = document.createElement('option'); opt.value = id; opt.textContent = p.name;
            if (id === myPlayerId) opt.selected = true;
            narratorSelect.appendChild(opt);
        }
        list.appendChild(li);
    }
}

// 3. LANCER LE JEU
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
    
    updates[`rooms/${currentRoom}/status`] = "role_reveal";
    updates[`rooms/${currentRoom}/mode`] = mode;
    updates[`rooms/${currentRoom}/votes`] = null;

    if (mode === "humain") {
        updates[`rooms/${currentRoom}/narratorId`] = narratorId;
        updates[`rooms/${currentRoom}/players/${narratorId}/role`] = "🗣️ Narrateur";
        updates[`rooms/${currentRoom}/gameState`] = {
            phase: "nuit_debut", cupidonDone: false, lovers: [], nightLog: "",
            wolfTarget: "none", witchLifeUsed: false, witchDeathUsed: false,
            deathsToAnnounce: [], revealRoles: document.getElementById('reveal-roles-death').checked
        };
    } else {
        updates[`rooms/${currentRoom}/autoState`] = {
            phase: "start", cupidonDone: false, lovers: [], wolfVictim: "none",
            witchLifeUsed: false, witchDeathUsed: false, chasseurA_Tire: false,
            lastDeaths: ["none"], nextPhaseAfterChasseur: "vote_village",
            revealRoles: document.getElementById('reveal-roles-death').checked,
            witchActsIfAttacked: document.getElementById('rule-witch-attacked').checked
        };
    }
    update(ref(db), updates);
});

// BOUTON REFAIRE UNE PARTIE (RESET DU SALON)
document.getElementById('btn-restart').addEventListener('click', () => {
    if (amIAdmin) {
        update(ref(db, `rooms/${currentRoom}`), {
            status: "lobby", autoState: null, gameState: null, votes: null
        });
    }
    location.reload();
});

// ==========================================
// MOTEUR 1 : NARRATEUR AUTO (EN LIGNE)
// ==========================================
function handleAutoPhase() {
    if (!isGameActive) return;

    let pName = autoState.phase;
    const nightCover = document.getElementById('night-cover');
    const dayAnnounce = document.getElementById('day-announcement');
    const voteZone = document.getElementById('vote-zone');
    const voteSubtitle = document.getElementById('vote-subtitle');

    if (document.getElementById('lobby-screen').classList.contains('active')) {
        document.getElementById('lobby-screen').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        document.getElementById('my-role-display').textContent = currentPlayers[myPlayerId].role;
        if (amIAdmin) document.getElementById('admin-auto-bar').style.display = "flex";
    }

    voteZone.style.display = "none";
    document.getElementById('my-vote-status').textContent = "";
    selectedTargetIds = []; 
    checkScreenState(); 

    if (pName === "endgame") {
        nightCover.style.display = 'none';
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('endgame-screen').classList.add('active');
        document.getElementById('endgame-winner').textContent = autoState.winnerMsg;
        return;
    }

    if (autoState.lovers && autoState.lovers.includes(myPlayerId)) {
        let otherLoverId = autoState.lovers.find(id => id !== myPlayerId);
        if (currentPlayers[otherLoverId]) {
            document.getElementById('my-lover-display').style.display = "block";
            document.getElementById('my-lover-display').textContent = `💘 En couple avec : ${currentPlayers[otherLoverId].name}`;
        }
    }

    if (pName === "nuit") {
        nightCover.style.display = 'flex'; dayAnnounce.style.display = 'none';
        parler("La nuit tombe sur le village.", pName);
    } 
    else if (pName === "cupidon") {
        parler("Cupidon désigne deux amoureux.", pName);
        if (currentPlayers[myPlayerId] && currentPlayers[myPlayerId].role === "🏹 Cupidon" && !currentPlayers[myPlayerId].isDead) {
            nightCover.style.display = 'none'; voteZone.style.display = "block";
            document.getElementById('vote-title').textContent = "🏹 Formez le couple";
            voteSubtitle.textContent = "Sélectionnez 2 joueurs.";
            renderPlayerVoteButtonsAuto("cupidon");
        } else nightCover.style.display = 'flex';
    }
    else if (pName === "voyante") {
        parler("La voyante choisit un joueur à inspecter.", pName);
        if (currentPlayers[myPlayerId] && currentPlayers[myPlayerId].role === "👁️ Voyante" && !currentPlayers[myPlayerId].isDead) {
            nightCover.style.display = 'none'; voteZone.style.display = "block";
            document.getElementById('vote-title').textContent = "👁️ Choisis qui inspecter";
            voteSubtitle.textContent = "Son rôle secret s'affichera ici.";
            renderPlayerVoteButtonsAuto("voyante");
        } else nightCover.style.display = 'flex';
    }
    else if (pName === "loups") {
        parler("Les loups-garous choisissent leur victime.", pName);
        if (currentPlayers[myPlayerId] && currentPlayers[myPlayerId].role === "🐺 Loup-Garou" && !currentPlayers[myPlayerId].isDead) {
            nightCover.style.display = 'none'; voteZone.style.display = "block";
            document.getElementById('vote-title').textContent = "🐺 Cible de la Meute";
            voteSubtitle.textContent = "Mettez-vous d'accord !";
            renderPlayerVoteButtonsAuto("loups");
        } else nightCover.style.display = 'flex';
    }
    else if (pName === "sorciere") {
        parler("La sorcière se réveille.", pName);
        if (currentPlayers[myPlayerId] && currentPlayers[myPlayerId].role === "🧙‍♀️ Sorcière" && !currentPlayers[myPlayerId].isDead) {
            if (autoState.wolfVictim === myPlayerId && !autoState.witchActsIfAttacked) {
                nightCover.style.display = 'none'; dayAnnounce.style.display = "block";
                dayAnnounce.textContent = "🩸 Les loups t'ont attaquée ! Tu es trop faible pour tes potions.";
                set(ref(db, `rooms/${currentRoom}/votes/${myPlayerId}`), "skip"); 
            } else {
                nightCover.style.display = 'none'; voteZone.style.display = "block";
                document.getElementById('vote-title').textContent = "🧙‍♀️ Tes Potions";
                voteSubtitle.textContent = "";
                renderPlayerVoteButtonsAuto("sorciere");
            }
        } else nightCover.style.display = 'flex';
    }
    else if (pName === "jour" || pName === "resultat_village") {
        nightCover.style.display = 'none'; dayAnnounce.style.display = "block";
        let txt = annoncerMortsAuto(autoState.lastDeaths);
        dayAnnounce.textContent = txt;
        parler((pName === "jour" ? "Le soleil se lève. " : "") + txt, pName);
    }
    else if (pName === "chasseur") {
        nightCover.style.display = 'none'; dayAnnounce.style.display = "none";
        parler("Le chasseur est mort ! Il a un dernier tir.", pName);
        if (currentPlayers[myPlayerId] && currentPlayers[myPlayerId].role === "🔫 Chasseur") {
            voteZone.style.display = "block";
            document.getElementById('vote-title').textContent = "🔫 Ultimatum du Chasseur";
            voteSubtitle.textContent = "Tire sur quelqu'un avant de partir !";
            renderPlayerVoteButtonsAuto("chasseur");
        }
    }
    else if (pName === "resultat_chasseur") {
        nightCover.style.display = 'none'; dayAnnounce.style.display = "block";
        let txt = annoncerMortsAuto(autoState.lastDeaths);
        dayAnnounce.textContent = txt;
        parler(txt, pName);
    }
    else if (pName === "vote_village") {
        nightCover.style.display = 'none'; dayAnnounce.style.display = 'none';
        if (currentPlayers[myPlayerId] && !currentPlayers[myPlayerId].isDead) {
            voteZone.style.display = "block";
            document.getElementById('vote-title').textContent = "🗳️ Tribunal du Village";
            voteSubtitle.textContent = "Votez pour éliminer un suspect.";
            renderPlayerVoteButtonsAuto("village");
            parler("C'est l'heure du vote.", pName);
        }
    }
}

document.getElementById('btn-next-phase').addEventListener('click', () => {
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
    let phase = autoState.phase;
    let nextPhase = "nuit";
    let updates = {};
    let deadThisTurn = [];

    let winMsg = checkWinCondition(autoState.lovers);
    if (winMsg && !["start", "nuit", "voyante", "loups", "sorciere", "cupidon"].includes(phase)) {
        updates[`rooms/${currentRoom}/autoState/phase`] = "endgame";
        updates[`rooms/${currentRoom}/autoState/winnerMsg`] = winMsg;
        update(ref(db), updates); return;
    }

    if (phase === "start" || phase === "resultat_village" || phase === "resultat_chasseur" && autoState.nextPhaseAfterChasseur === "nuit") nextPhase = "nuit";
    else if (phase === "nuit" || phase === "cupidon" || phase === "voyante") {
        if (phase === "cupidon") {
            let loverIds = Object.values(currentVotes)[0] || [];
            updates[`rooms/${currentRoom}/autoState/lovers`] = loverIds;
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
        let wolfVictim = autoState.wolfVictim;
        let witchId = Object.keys(currentPlayers).find(id => currentPlayers[id].role === "🧙‍♀️ Sorcière");
        let witchVote = witchId ? currentVotes[witchId] : null;

        if (wolfVictim && wolfVictim !== "none" && (!witchVote || !witchVote.revive)) deadThisTurn.push(wolfVictim);
        if (witchVote && witchVote.kill && witchVote.kill !== "none") {
            deadThisTurn.push(witchVote.kill); updates[`rooms/${currentRoom}/autoState/witchDeathUsed`] = true;
        }
        if (witchVote && witchVote.revive) updates[`rooms/${currentRoom}/autoState/witchLifeUsed`] = true;

        deadThisTurn = propagateDeaths(deadThisTurn, autoState.lovers);
        deadThisTurn.forEach(id => updates[`rooms/${currentRoom}/players/${id}/isDead`] = true);
        updates[`rooms/${currentRoom}/autoState/lastDeaths`] = deadThisTurn.length > 0 ? deadThisTurn : ["none"];
        nextPhase = "jour";
    }
    else if (phase === "jour") {
        let lastD = autoState.lastDeaths || [];
        if (lastD.some(id => currentPlayers[id] && currentPlayers[id].role === "🔫 Chasseur")) {
            nextPhase = "chasseur"; updates[`rooms/${currentRoom}/autoState/nextPhaseAfterChasseur`] = "vote_village";
        } else nextPhase = "vote_village";
    }
    else if (phase === "vote_village") {
        let victim = getHighestVotedId();
        if (victim && victim !== "skip") {
            deadThisTurn.push(victim); deadThisTurn = propagateDeaths(deadThisTurn, autoState.lovers);
            deadThisTurn.forEach(id => updates[`rooms/${currentRoom}/players/${id}/isDead`] = true);
        }
        updates[`rooms/${currentRoom}/autoState/lastDeaths`] = deadThisTurn.length > 0 ? deadThisTurn : ["none"];
        nextPhase = "resultat_village";
    }
    else if (phase === "resultat_village") {
        let lastD = autoState.lastDeaths || [];
        if (lastD.some(id => currentPlayers[id] && currentPlayers[id].role === "🔫 Chasseur" && !autoState.chasseurA_Tire)) {
            nextPhase = "chasseur"; updates[`rooms/${currentRoom}/autoState/nextPhaseAfterChasseur`] = "nuit";
        } else nextPhase = "nuit";
    }
    else if (phase === "chasseur") {
        updates[`rooms/${currentRoom}/autoState/chasseurA_Tire`] = true;
        let victim = getHighestVotedId();
        if (victim && victim !== "skip") {
            deadThisTurn.push(victim); deadThisTurn = propagateDeaths(deadThisTurn, autoState.lovers);
            deadThisTurn.forEach(id => updates[`rooms/${currentRoom}/players/${id}/isDead`] = true);
        }
        updates[`rooms/${currentRoom}/autoState/lastDeaths`] = deadThisTurn.length > 0 ? deadThisTurn : ["none"];
        nextPhase = "resultat_chasseur";
    }
    else if (phase === "resultat_chasseur") nextPhase = autoState.nextPhaseAfterChasseur;

    updates[`rooms/${currentRoom}/autoState/phase`] = nextPhase;
    updates[`rooms/${currentRoom}/votes`] = null; 
    update(ref(db), updates);
}

// ==========================================
// MOTEUR 2 : NARRATEUR HUMAIN (PRESENTIEL)
// ==========================================
function renderPlayerUIHumain() {
    if (!document.getElementById('game-screen').classList.contains('active')) return;
    if (!isGameActive) return;

    const nightCover = document.getElementById('night-cover');
    const dayAnnounce = document.getElementById('day-announcement');
    const voteZone = document.getElementById('vote-zone');
    
    voteZone.style.display = "none"; dayAnnounce.style.display = "none";
    document.getElementById('my-role-display').textContent = currentPlayers[myPlayerId].role;

    if (gameState.lovers && gameState.lovers.includes(myPlayerId)) {
        let other = gameState.lovers.find(id => id !== myPlayerId);
        if (currentPlayers[other]) {
            document.getElementById('my-lover-display').style.display = "block";
            document.getElementById('my-lover-display').textContent = `💘 En couple avec : ${currentPlayers[other].name}`;
        }
    }

    if (["nuit_debut", "cupidon", "voyante", "loups", "sorciere", "nuit_fin"].includes(gameState.phase)) nightCover.style.display = "flex";
    else nightCover.style.display = "none";

    if (gameState.phase === "jour" || gameState.phase === "resultat_village" || gameState.phase === "resultat_chasseur") {
        dayAnnounce.style.display = "block";
        dayAnnounce.textContent = buildDeathMessageHumain(gameState.deathsToAnnounce);
    }

    if ((gameState.phase === "vote_village" || gameState.phase === "chasseur") && !currentPlayers[myPlayerId].isDead) {
        if (gameState.phase === "chasseur" && currentPlayers[myPlayerId].role !== "🔫 Chasseur") return; 
        voteZone.style.display = "block";
        document.getElementById('vote-title').textContent = gameState.phase === "chasseur" ? "🔫 Ultimatum" : "🗳️ Vote du Village";
        renderPlayerVoteButtonsAuto(gameState.phase === "chasseur" ? "chasseur" : "village"); 
    }
}

function buildDeathMessageHumain(deaths) {
    if (!deaths || deaths.length === 0 || deaths.includes("none")) return "Personne n'est mort.";
    let t = "Mort(s) : ";
    deaths.forEach(id => {
        let p = currentPlayers[id];
        if (p) t += p.name + (gameState.revealRoles ? ` (${p.role})` : "") + ". ";
    });
    return t;
}

function renderNarratorUI() {
    if (!isGameActive) return;

    renderNarratorPlayerList();
    const scriptBox = document.getElementById('narrator-script');
    const actionBox = document.getElementById('narrator-action-area');
    const nextBtn = document.getElementById('btn-narrator-next');
    const revoteBtn = document.getElementById('btn-narrator-revote');
    
    actionBox.innerHTML = ""; revoteBtn.style.display = "none";
    nextBtn.textContent = "Suivant ➡️"; nextBtn.onclick = handleNarratorNext;

    if (gameState.phase === "endgame") {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('endgame-screen').classList.add('active');
        document.getElementById('endgame-winner').textContent = gameState.winnerMsg;
        return;
    }

    switch(gameState.phase) {
        case "nuit_debut":
            scriptBox.textContent = `"La nuit tombe sur le village. Fermez les yeux."`;
            actionBox.innerHTML = "<i>Attendez que tout le monde ait les yeux fermés.</i>"; break;
        case "cupidon":
            scriptBox.textContent = `"Cupidon se réveille et désigne deux amoureux."`;
            actionBox.innerHTML = generateSelectAlive("cup-1", "Amoureux 1 :") + generateSelectAlive("cup-2", "Amoureux 2 :"); break;
        case "voyante":
            scriptBox.textContent = `"La voyante se réveille et me désigne un joueur."`;
            actionBox.innerHTML = generateSelectAlive("voy-target", "Joueur inspecté :");
            setTimeout(() => {
                document.getElementById('voy-target').onchange = (e) => {
                    let v = e.target.value;
                    if(v !== "none") actionBox.innerHTML += `<div style="margin-top:10px; padding:10px; background:#e94560; border-radius:5px;">Rôle à montrer : <b>${currentPlayers[v].role}</b></div>`;
                };
            }, 50); break;
        case "loups":
            scriptBox.textContent = `"Les loups-garous se réveillent et désignent une victime."`;
            actionBox.innerHTML = generateSelectAlive("wolf-target", "Victime des loups :"); break;
        case "sorciere":
            scriptBox.textContent = `"La sorcière se réveille. Je lui montre la victime."`;
            let wVictimName = (gameState.wolfTarget && gameState.wolfTarget !== "none") ? currentPlayers[gameState.wolfTarget].name : "Personne";
            let html = `<p>Victime des loups : <b style="color:#e94560">${wVictimName}</b></p>`;
            if(!gameState.witchLifeUsed && wVictimName !== "Personne") html += `<label style="display:block; margin-bottom:10px;"><input type="checkbox" id="witch-revive"> 🧪 Ressusciter</label>`;
            if(!gameState.witchDeathUsed) html += generateSelectAlive("witch-kill", "☠️ Tuer avec la potion de mort :");
            actionBox.innerHTML = html; break;
        case "nuit_fin":
            scriptBox.textContent = `(Résolution de la nuit en cours...)`; break;
        case "jour":
            scriptBox.textContent = `"Le soleil se lève sur le village."`;
            actionBox.innerHTML = `<p>${buildDeathMessageHumain(gameState.deathsToAnnounce)}</p>`; break;
        case "chasseur":
            scriptBox.textContent = `"Le chasseur est mort ! Il a un dernier tir sur son téléphone."`;
            actionBox.innerHTML = "Laissez le chasseur voter sur son écran."; break;
        case "vote_village":
            scriptBox.textContent = `"Le village débat. C'est l'heure de voter sur vos téléphones."`;
            let voteHtml = `<p style="color:#ffbc00; font-weight:bold;">Votes en cours :</p><ul>`;
            let counts = {};
            for(let voter in currentVotes) { let t = currentVotes[voter]; if(t !== "skip") counts[t] = (counts[t] || 0) + 1; }
            for(let t in counts) voteHtml += `<li>${currentPlayers[t].name} : ${counts[t]} voix</li>`;
            actionBox.innerHTML = voteHtml + `</ul>`;
            revoteBtn.style.display = "block"; revoteBtn.onclick = () => update(ref(db, `rooms/${currentRoom}/votes`), null);
            nextBtn.textContent = "⚖️ Clôturer le Vote"; break;
        case "resultat_village":
            scriptBox.textContent = `Le village a parlé.`;
            actionBox.innerHTML = `<p>${buildDeathMessageHumain(gameState.deathsToAnnounce)}</p>`; break;
        case "resultat_chasseur":
            scriptBox.textContent = `Le tir du chasseur retentit.`;
            actionBox.innerHTML = `<p>${buildDeathMessageHumain(gameState.deathsToAnnounce)}</p>`; break;
    }
}

function handleNarratorNext() {
    let p = gameState.phase;
    let updates = {}; let next = "nuit_debut"; let newLog = gameState.nightLog || "";

    let addDeath = (id) => {
        if(!id || id==="none" || id==="skip") return;
        if(!updates[`rooms/${currentRoom}/gameState/deathsToAnnounce`]) updates[`rooms/${currentRoom}/gameState/deathsToAnnounce`] = [];
        updates[`rooms/${currentRoom}/gameState/deathsToAnnounce`].push(id);
        updates[`rooms/${currentRoom}/players/${id}/isDead`] = true;
        if(gameState.lovers && gameState.lovers.includes(id)) {
            let other = gameState.lovers.find(l => l !== id);
            if(other) {
                updates[`rooms/${currentRoom}/gameState/deathsToAnnounce`].push(other);
                updates[`rooms/${currentRoom}/players/${other}/isDead`] = true;
                newLog += `\n💔 ${currentPlayers[other].name} meurt de chagrin.`;
            }
        }
    };

    if (p === "nuit_debut") {
        newLog = ""; updates[`rooms/${currentRoom}/gameState/deathsToAnnounce`] = [];
        next = getNextNightPhase(p, gameState);
    }
    else if (p === "cupidon") {
        let c1 = document.getElementById('cup-1').value; let c2 = document.getElementById('cup-2').value;
        if(c1 !== "none" && c2 !== "none") {
            updates[`rooms/${currentRoom}/gameState/lovers`] = [c1, c2]; updates[`rooms/${currentRoom}/gameState/cupidonDone`] = true;
            newLog += `🏹 Cupidon a lié ${currentPlayers[c1].name} et ${currentPlayers[c2].name}.`;
        }
        next = getNextNightPhase(p, gameState);
    }
    else if (p === "voyante") {
        let v = document.getElementById('voy-target')?.value;
        if(v && v!=="none") newLog += `\n👁️ Voyante a vu ${currentPlayers[v].name}.`;
        next = getNextNightPhase(p, gameState);
    }
    else if (p === "loups") {
        let w = document.getElementById('wolf-target').value;
        updates[`rooms/${currentRoom}/gameState/wolfTarget`] = w;
        if(w!=="none") newLog += `\n🐺 Loups attaquent ${currentPlayers[w].name}.`;
        next = getNextNightPhase(p, gameState);
    }
    else if (p === "sorciere") {
        let revive = document.getElementById('witch-revive') ? document.getElementById('witch-revive').checked : false;
        let kill = document.getElementById('witch-kill') ? document.getElementById('witch-kill').value : "none";
        if(revive) { updates[`rooms/${currentRoom}/gameState/witchLifeUsed`] = true; updates[`rooms/${currentRoom}/gameState/wolfTarget`] = "none"; newLog += `\n🧪 Sorcière a sauvé.`; }
        if(kill !== "none") { updates[`rooms/${currentRoom}/gameState/witchDeathUsed`] = true; updates[`rooms/${currentRoom}/gameState/witchTarget`] = kill; newLog += `\n☠️ Sorcière a tué ${currentPlayers[kill].name}.`; } 
        else updates[`rooms/${currentRoom}/gameState/witchTarget`] = "none";
        next = "nuit_fin";
    }
    else if (p === "nuit_fin") {
        updates[`rooms/${currentRoom}/gameState/deathsToAnnounce`] = [];
        if(gameState.wolfTarget && gameState.wolfTarget!=="none") addDeath(gameState.wolfTarget);
        if(gameState.witchTarget && gameState.witchTarget!=="none") addDeath(gameState.witchTarget);
        next = "jour";
    }
    else if (p === "jour" || p === "resultat_village") {
        let deaths = gameState.deathsToAnnounce || [];
        if (deaths.some(id => currentPlayers[id] && currentPlayers[id].role === "🔫 Chasseur")) {
            next = "chasseur"; updates[`rooms/${currentRoom}/gameState/nextPhaseAfterChasseur`] = (p === "jour") ? "vote_village" : "nuit_debut";
        }
        else if (p === "jour") next = "vote_village";
        else next = "nuit_debut";
    }
    else if (p === "vote_village") {
        let highest = getHighestVotedId(); updates[`rooms/${currentRoom}/votes`] = null; updates[`rooms/${currentRoom}/gameState/deathsToAnnounce`] = [];
        if(highest) { addDeath(highest); newLog += `\n⚖️ Village a tué ${currentPlayers[highest].name}.`; }
        next = "resultat_village";
    }
    else if (p === "chasseur") {
        let highest = getHighestVotedId(); updates[`rooms/${currentRoom}/votes`] = null; updates[`rooms/${currentRoom}/gameState/deathsToAnnounce`] = [];
        if(highest) { addDeath(highest); newLog += `\n🔫 Chasseur a tué ${currentPlayers[highest].name}.`; }
        next = "resultat_chasseur";
    }
    else if (p === "resultat_chasseur") next = gameState.nextPhaseAfterChasseur;

    // CHECK VICTOIRE
    let tempPlayers = JSON.parse(JSON.stringify(currentPlayers));
    let deathsToCheck = updates[`rooms/${currentRoom}/gameState/deathsToAnnounce`] || [];
    deathsToCheck.forEach(id => { if(tempPlayers[id]) tempPlayers[id].isDead = true; });
    
    let wolves = 0, villagers = 0, loversAlive = 0, totalAlive = 0;
    for(let id in tempPlayers) {
        if(!tempPlayers[id].isDead && tempPlayers[id].role && tempPlayers[id].role !== "🗣️ Narrateur" && tempPlayers[id].role !== "En attente") {
            totalAlive++; if(tempPlayers[id].role === "🐺 Loup-Garou") wolves++; else villagers++;
            if (gameState.lovers && gameState.lovers.includes(id)) loversAlive++;
        }
    }
    
    let winMsg = null;
    if (totalAlive === 0) winMsg = "Égalité ! Le village est anéanti.";
    else if (loversAlive === totalAlive && totalAlive === 2) winMsg = "💘 Les Amoureux ont triomphé !";
    else if (wolves === 0) winMsg = "🧑‍🌾 Le Village a éradiqué les loups !";
    else if (wolves >= villagers) winMsg = "🐺 Les Loups-Garous ont dévoré le village !";

    if (winMsg && !["nuit_debut", "cupidon", "voyante", "loups", "sorciere"].includes(p)) {
        updates[`rooms/${currentRoom}/gameState/phase`] = "endgame";
        updates[`rooms/${currentRoom}/gameState/winnerMsg`] = winMsg;
    } else updates[`rooms/${currentRoom}/gameState/phase`] = next;

    updates[`rooms/${currentRoom}/gameState/nightLog`] = newLog;
    update(ref(db), updates);
}

function renderNarratorPlayerList() {
    const list = document.getElementById('narrator-player-list'); if(!list) return;
    list.innerHTML = "";
    for (let id in currentPlayers) {
        if (id === myPlayerId) continue;
        const p = currentPlayers[id]; const li = document.createElement('li'); li.style.padding = "8px"; li.style.margin = "4px 0";
        if(p.isDead) li.innerHTML = `<span style="text-decoration:line-through; color:#888;">${p.name} (${p.role})</span> <span style="color:#ff0000">Mort</span>`;
        else li.innerHTML = `<span>${p.name} <span style="color:#e94560; font-size: 0.8em;">[${p.role}]</span></span>`;
        list.appendChild(li);
    }
    document.getElementById('history-text').innerHTML = (gameState.nightLog || "Rien à signaler.").replace(/\n/g, "<br>");
}

function generateSelectAlive(id, label, defaultOpt = "Personne") {
    let html = `<label>${label}</label><select id="${id}" style="width:100%; margin-bottom:10px; padding:10px;"><option value="none">${defaultOpt}</option>`;
    for (let pid in currentPlayers) {
        if (!currentPlayers[pid].isDead && pid !== myPlayerId && currentPlayers[pid].role !== "🗣️ Narrateur") html += `<option value="${pid}">${currentPlayers[pid].name} (${currentPlayers[pid].role})</option>`;
    }
    return html + `</select>`;
}

// ==========================================
// UTILITAIRES PARTAGES
// ==========================================
function getHighestVotedId() {
    if (Object.keys(currentVotes).length === 0) return null;
    const counts = {};
    for (let voter in currentVotes) {
        let val = currentVotes[voter];
        if (typeof val === "string" && val !== "skip") counts[val] = (counts[val] || 0) + 1;
    }
    let highest = null, max = 0;
    for (let t in counts) { if (counts[t] > max) { max = counts[t]; highest = t; } }
    return highest;
}

function roleExists(roleName) { return Object.values(currentPlayers).some(p => p.role === roleName && !p.isDead); }

function propagateDeaths(deathsArray, lovers) {
    let finalDeaths = new Set(deathsArray);
    let added = true;
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

function checkWinCondition(lovers) {
    let wolves = 0, villagers = 0, loversAlive = 0, totalAlive = 0;
    for(let id in currentPlayers) {
        if(!currentPlayers[id].isDead && currentPlayers[id].role && currentPlayers[id].role !== "🗣️ Narrateur" && currentPlayers[id].role !== "En attente") {
            totalAlive++;
            if(currentPlayers[id].role === "🐺 Loup-Garou") wolves++; else villagers++;
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

function annoncerMortsAuto(deathsArray) {
    if (!deathsArray || deathsArray.length === 0 || deathsArray.includes("none")) return "Personne n'est mort.";
    let text = "Mort(s) : ";
    deathsArray.forEach(id => {
        let p = currentPlayers[id];
        if (p) text += p.name + (autoState.revealRoles ? ` (${p.role})` : "") + ". ";
    });
    return text;
}

function checkScreenState() {
    if (!isGameActive) return;
    if (!document.getElementById('game-screen').classList.contains('active') && !document.getElementById('dead-screen').classList.contains('active')) return; 
    
    if (currentPlayers[myPlayerId] && currentPlayers[myPlayerId].isDead) {
        let isChasseurTurn = (gameMode === "auto" && currentPhaseName === "chasseur" && !autoState.chasseurA_Tire) || 
                             (gameMode === "humain" && gameState.phase === "chasseur");
                             
        if (currentPlayers[myPlayerId].role === "🔫 Chasseur" && isChasseurTurn) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('game-screen').classList.add('active');
        } else {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('dead-screen').classList.add('active');
        }
    }
}

// ==========================================
// RENDER BOUTONS VOTE JOUEUR (PARTAGE)
// ==========================================
function renderPlayerVoteButtonsAuto(type) {
    const list = document.getElementById('vote-list');
    const witchUI = document.getElementById('witch-options');
    list.innerHTML = ""; witchUI.style.display = "none";
    selectedTargetIds = [];
    document.getElementById('btn-confirm-action').style.display = "none";

    if (type === "sorciere") {
        witchUI.style.display = "block";
        const btnConfirm = document.getElementById('btn-confirm-action');
        btnConfirm.style.display = "block";

        let victimId = autoState.wolfVictim;
        let reviveSec = document.getElementById('witch-revive-section');
        let checkRevive = document.getElementById('witch-revive-check'); checkRevive.checked = false;

        if (victimId && victimId !== "none" && !autoState.witchLifeUsed) {
            reviveSec.style.display = "block"; document.getElementById('witch-victim-name').textContent = currentPlayers[victimId].name;
        } else reviveSec.style.display = "none";

        let killSec = document.getElementById('witch-kill-section');
        if (!autoState.witchDeathUsed) {
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

        btnConfirm.onclick = () => {
            witchUI.style.display = "none"; list.innerHTML = ""; btnConfirm.style.display = "none";
            set(ref(db, `rooms/${currentRoom}/votes/${myPlayerId}`), { revive: checkRevive.checked, kill: selectedTargetIds[0] === "skip" ? "none" : selectedTargetIds[0] });
            document.getElementById('my-vote-status').textContent = "Potions décidées. Chut...";
        };
        return;
    }

    let maxSelections = type === "cupidon" ? 2 : 1;
    if (type === "village") {
        const skipBtn = document.createElement('button'); skipBtn.textContent = "Ne voter contre personne"; skipBtn.className = "target-btn";
        skipBtn.onclick = () => selectTarget("skip", skipBtn, maxSelections); list.appendChild(skipBtn);
    }

    for (let id in currentPlayers) {
        if (id === myPlayerId && type !== "chasseur" && type !== "cupidon") continue;
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
