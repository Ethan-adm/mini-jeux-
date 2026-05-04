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
let currentVotesObj = {};
let currentAutoState = {}; 

let selectedTargetIds = []; // Array (Pour Cupidon qui choisit 2 personnes)
let currentPhaseName = "";

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
    if (name.toLowerCase() === "admin") { amIAdmin = true; name = "👑 Admin"; }

    currentRoom = room;
    const playerRef = ref(db, `rooms/${room}/players/${myPlayerId}`);
    onDisconnect(playerRef).remove(); 
    set(playerRef, { name: name, role: "En attente", isDead: false });

    if (amIAdmin) {
        set(ref(db, `rooms/${room}/status`), "lobby");
    }

    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('lobby-screen').classList.add('active');
    document.getElementById('display-room-code').textContent = room;

    if (amIAdmin) {
        document.getElementById('admin-panel').style.display = "block";
        document.getElementById('waiting-msg').style.display = "none";
    }

    // ECOUTE JOUEURS ET MORT
    onValue(ref(db, `rooms/${room}/players`), (snapshot) => {
        currentPlayers = snapshot.val() || {};
        if(document.getElementById('lobby-screen').classList.contains('active')) updateLobby(currentPlayers);
        if(document.getElementById('narrator-screen').classList.contains('active')) updateNarratorScreen(currentPlayers);

        // GESTION SPECIALE CHASSEUR MORT (Il reste sur l'écran pour tirer)
        if(currentPlayers[myPlayerId] && currentPlayers[myPlayerId].isDead) {
            if (currentAutoState.phase === "chasseur" && currentPlayers[myPlayerId].role === "🔫 Chasseur" && !currentAutoState.chasseurA_Tire) {
                document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
                document.getElementById('game-screen').classList.add('active');
            } else {
                document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
                document.getElementById('dead-screen').classList.add('active');
            }
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

    onValue(ref(db, `rooms/${room}/votes`), (snapshot) => {
        currentVotesObj = snapshot.val() || {};
        const count = Object.keys(currentVotesObj).length;
        document.getElementById('vote-progress').textContent = `${count} action(s) validée(s)`;
    });

    // ==========================================
    // MOTEUR DU MODE AUTOMATIQUE
    // ==========================================
    onValue(ref(db, `rooms/${room}/autoState`), (snapshot) => {
        if(gameMode !== "auto") return;
        currentAutoState = snapshot.val() || {};
        currentPhaseName = currentAutoState.phase || "start";
        
        const nightCover = document.getElementById('night-cover');
        const autoBox = document.getElementById('auto-narrator-display');
        const voteZone = document.getElementById('vote-zone');
        const voteSubtitle = document.getElementById('vote-subtitle');

        voteZone.style.display = "none";
        document.getElementById('my-vote-status').textContent = "";
        selectedTargetIds = []; 

        // VICTOIRE ?
        if (currentPhaseName === "endgame") {
            nightCover.style.display = 'none';
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('endgame-screen').classList.add('active');
            document.getElementById('endgame-winner').textContent = currentAutoState.winnerMsg;
            return;
        }

        // MAJ AMOUREUX
        if (currentAutoState.lovers && currentAutoState.lovers.includes(myPlayerId)) {
            let otherLoverId = currentAutoState.lovers.find(id => id !== myPlayerId);
            if (currentPlayers[otherLoverId]) {
                document.getElementById('my-lover-display').style.display = "block";
                document.getElementById('my-lover-display').textContent = `💘 En couple avec : ${currentPlayers[otherLoverId].name}`;
            }
        }

        if (currentPhaseName === "nuit") {
            nightCover.style.display = 'flex';
            autoBox.style.display = 'none';
            parler("La nuit tombe sur le village. Tout le monde s'endort.", currentPhaseName);
        } 
        else if (currentPhaseName === "cupidon") {
            parler("Cupidon se réveille, et désigne deux amoureux.", currentPhaseName);
            if (currentPlayers[myPlayerId].role === "🏹 Cupidon" && !currentPlayers[myPlayerId].isDead) {
                nightCover.style.display = 'none'; voteZone.style.display = "block";
                document.getElementById('vote-title').textContent = "🏹 Formez le couple";
                voteSubtitle.textContent = "Sélectionnez exactement 2 joueurs.";
                renderVoteButtons("cupidon");
            } else nightCover.style.display = 'flex';
        }
        else if (currentPhaseName === "voyante") {
            parler("La voyante se réveille, et choisit un joueur à inspecter.", currentPhaseName);
            if (currentPlayers[myPlayerId].role === "👁️ Voyante" && !currentPlayers[myPlayerId].isDead) {
                nightCover.style.display = 'none'; voteZone.style.display = "block";
                document.getElementById('vote-title').textContent = "👁️ Choisis qui inspecter";
                voteSubtitle.textContent = "Son rôle secret s'affichera ici.";
                renderVoteButtons("voyante");
            } else nightCover.style.display = 'flex';
        }
        else if (currentPhaseName === "loups") {
            parler("Les loups-garous se réveillent, et choisissent leur victime.", currentPhaseName);
            if (currentPlayers[myPlayerId].role === "🐺 Loup-Garou" && !currentPlayers[myPlayerId].isDead) {
                nightCover.style.display = 'none'; voteZone.style.display = "block";
                document.getElementById('vote-title').textContent = "🐺 Cible de la Meute";
                voteSubtitle.textContent = "Mettez-vous d'accord du regard ! Tous les loups doivent voter pour la même personne.";
                renderVoteButtons("loups");
            } else nightCover.style.display = 'flex';
        }
        else if (currentPhaseName === "sorciere") {
            parler("La sorcière se réveille. Elle a des potions...", currentPhaseName);
            if (currentPlayers[myPlayerId].role === "🧙‍♀️ Sorcière" && !currentPlayers[myPlayerId].isDead) {
                // REGLE : Sorcière attaquée ?
                if (currentAutoState.wolfVictim === myPlayerId && !currentAutoState.witchActsIfAttacked) {
                    nightCover.style.display = 'none'; autoBox.style.display = "block";
                    autoBox.textContent = "🩸 Les loups t'ont mortellement blessée. Tu es trop faible pour utiliser tes potions.";
                    set(ref(db, `rooms/${currentRoom}/votes/${myPlayerId}`), "skipped"); // Passe son tour
                } else {
                    nightCover.style.display = 'none'; voteZone.style.display = "block";
                    document.getElementById('vote-title').textContent = "🧙‍♀️ Tes Potions";
                    voteSubtitle.textContent = "";
                    renderVoteButtons("sorciere");
                }
            } else nightCover.style.display = 'flex';
        }
        else if (currentPhaseName === "jour" || currentPhaseName === "resultat_village") {
            nightCover.style.display = 'none'; autoBox.style.display = "block";
            let txt = annoncerMorts(currentAutoState.lastDeaths);
            autoBox.textContent = txt;
            if (currentPhaseName === "jour") parler("Le soleil se lève. " + txt, currentPhaseName);
            else parler(txt, currentPhaseName);
        }
        else if (currentPhaseName === "chasseur") {
            nightCover.style.display = 'none'; autoBox.style.display = "none";
            parler("Le chasseur est mort ! Il a un dernier tir pour emporter quelqu'un avec lui.", currentPhaseName);
            if (currentPlayers[myPlayerId].role === "🔫 Chasseur") {
                voteZone.style.display = "block";
                document.getElementById('vote-title').textContent = "🔫 Ultimatum du Chasseur";
                voteSubtitle.textContent = "Tu vas mourir. Tire sur quelqu'un avant de partir !";
                renderVoteButtons("chasseur");
            }
        }
        else if (currentPhaseName === "resultat_chasseur") {
            nightCover.style.display = 'none'; autoBox.style.display = "block";
            let txt = annoncerMorts(currentAutoState.lastDeaths);
            autoBox.textContent = txt;
            parler(txt, currentPhaseName);
        }
        else if (currentPhaseName === "vote_village") {
            nightCover.style.display = 'none'; autoBox.style.display = 'none';
            if (!currentPlayers[myPlayerId].isDead) {
                voteZone.style.display = "block";
                document.getElementById('vote-title').textContent = "🗳️ Tribunal du Village";
                voteSubtitle.textContent = "Débattez et votez pour éliminer un suspect.";
                renderVoteButtons("village");
                parler("C'est l'heure du vote. Le village doit éliminer un suspect.", currentPhaseName);
            }
        }
    });
});

function annoncerMorts(deathsArray) {
    if (!deathsArray || deathsArray.length === 0 || deathsArray.includes("none")) return "Personne n'est mort.";
    let text = "Tragédie ! Mort(s) : ";
    deathsArray.forEach(id => {
        let p = currentPlayers[id];
        if (p) {
            text += p.name;
            if (currentAutoState.revealRoles) text += ` (${p.role})`;
            text += ". ";
        }
    });
    return text;
}

function updateLobby(players) {
    const list = document.getElementById('player-list');
    list.innerHTML = "";
    document.getElementById('player-count').textContent = Object.keys(players).length;
    for (let id in players) {
        const li = document.createElement('li'); li.textContent = players[id].name;
        if (id === myPlayerId) { li.textContent += " (Toi)"; li.style.color = "#e94560"; }
        list.appendChild(li);
    }
}

// 3. LANCER ET DISTRIBUER
document.getElementById('start-game-btn').addEventListener('click', () => {
    const mode = document.getElementById('game-mode').value;
    const allIds = Object.keys(currentPlayers);
    let playersToAssign = mode === "humain" ? allIds.filter(id => id !== myPlayerId) : allIds;

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

    if (mode === "auto") {
        updates[`rooms/${currentRoom}/autoState`] = {
            phase: "start",
            cupidonDone: false,
            lovers: [],
            wolfVictim: "none",
            witchLifeUsed: false,
            witchDeathUsed: false,
            chasseurA_Tire: false,
            lastDeaths: ["none"],
            nextPhaseAfterChasseur: "vote_village",
            revealRoles: document.getElementById('reveal-roles-death').checked,
            witchActsIfAttacked: document.getElementById('rule-witch-attacked').checked
        };
    }
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
    // Code Narrateur Humain ignoré ici pour faire place
}

// ==========================================
// MOTEUR ADMIN : LA MACHINE D'ETAT & VICTOIRE
// ==========================================
function getHighestVotedId() {
    if (Object.keys(currentVotesObj).length === 0) return null;
    const counts = {};
    for (let voter in currentVotesObj) {
        let val = currentVotesObj[voter];
        if (typeof val === "string") counts[val] = (counts[val] || 0) + 1;
    }
    let highest = null, max = 0;
    for (let t in counts) { if (counts[t] > max) { max = counts[t]; highest = t; } }
    return highest;
}

function getWolfConsensus() {
    let votes = Object.values(currentVotesObj);
    if (votes.length === 0) return "none";
    let first = votes[0];
    let consensus = votes.every(v => v === first);
    return consensus ? first : "none"; // Si pas d'accord, personne ne meurt
}

function roleExists(roleName) { return Object.values(currentPlayers).some(p => p.role === roleName && !p.isDead); }

function propagateDeaths(deathsArray) {
    let finalDeaths = [...deathsArray];
    let lovers = currentAutoState.lovers || [];
    deathsArray.forEach(d => {
        if(lovers.includes(d)) {
            let other = lovers.find(l => l !== d);
            if(other && !finalDeaths.includes(other)) finalDeaths.push(other);
        }
    });
    return finalDeaths;
}

function checkWinCondition() {
    let wolves = 0, villagers = 0, loversAlive = 0, totalAlive = 0;
    for(let id in currentPlayers) {
        if(!currentPlayers[id].isDead && currentPlayers[id].role && currentPlayers[id].role !== "En attente") {
            totalAlive++;
            if(currentPlayers[id].role === "🐺 Loup-Garou") wolves++; else villagers++;
            if (currentAutoState.lovers && currentAutoState.lovers.includes(id)) loversAlive++;
        }
    }
    if (totalAlive === 0) return "Égalité ! Tout le monde est mort.";
    if (loversAlive === totalAlive && totalAlive === 2) return "💘 Les Amoureux gagnent !";
    if (wolves === 0) return "🧑‍🌾 Le Village gagne !";
    if (wolves >= villagers) return "🐺 Les Loups-Garous gagnent !";
    return null;
}

function getNextNightPhase(after) {
    if (after === "nuit") {
        if (roleExists("🏹 Cupidon") && !currentAutoState.cupidonDone) return "cupidon";
        if (roleExists("👁️ Voyante")) return "voyante";
        return "loups";
    }
    if (after === "cupidon") {
        if (roleExists("👁️ Voyante")) return "voyante";
        return "loups";
    }
    if (after === "voyante") return "loups";
    if (after === "loups") return roleExists("🧙‍♀️ Sorcière") ? "sorciere" : "jour";
    return "jour";
}

document.getElementById('btn-next-phase').addEventListener('click', () => {
    let phase = currentAutoState.phase;
    let nextPhase = "nuit";
    let updates = {};
    let deadThisTurn = [];

    let winMsg = checkWinCondition();
    if (winMsg && phase !== "start" && phase !== "nuit" && phase !== "voyante" && phase !== "loups" && phase !== "sorciere" && phase !== "cupidon") {
        updates[`rooms/${currentRoom}/autoState/phase`] = "endgame";
        updates[`rooms/${currentRoom}/autoState/winnerMsg`] = winMsg;
        update(ref(db), updates);
        return;
    }

    if (phase === "start" || phase === "resultat_village" || phase === "resultat_chasseur" && currentAutoState.nextPhaseAfterChasseur === "nuit") {
        nextPhase = "nuit";
    }
    else if (phase === "nuit" || phase === "cupidon" || phase === "voyante") {
        if (phase === "cupidon") {
            let loverIds = Object.values(currentVotesObj)[0] || [];
            updates[`rooms/${currentRoom}/autoState/lovers`] = loverIds;
            updates[`rooms/${currentRoom}/autoState/cupidonDone`] = true;
        }
        nextPhase = getNextNightPhase(phase);
    }
    else if (phase === "loups") {
        let victim = getWolfConsensus();
        updates[`rooms/${currentRoom}/autoState/wolfVictim`] = victim;
        nextPhase = getNextNightPhase("loups");
    }
    else if (phase === "sorciere") {
        let wolfVictim = currentAutoState.wolfVictim;
        let witchId = Object.keys(currentPlayers).find(id => currentPlayers[id].role === "🧙‍♀️ Sorcière");
        let witchVote = witchId ? currentVotesObj[witchId] : null;

        if (wolfVictim && wolfVictim !== "none" && (!witchVote || !witchVote.revive)) deadThisTurn.push(wolfVictim);
        if (witchVote && witchVote.kill && witchVote.kill !== "none") {
            deadThisTurn.push(witchVote.kill);
            updates[`rooms/${currentRoom}/autoState/witchDeathUsed`] = true;
        }
        if (witchVote && witchVote.revive) updates[`rooms/${currentRoom}/autoState/witchLifeUsed`] = true;

        deadThisTurn = propagateDeaths(deadThisTurn);
        deadThisTurn.forEach(id => updates[`rooms/${currentRoom}/players/${id}/isDead`] = true);
        updates[`rooms/${currentRoom}/autoState/lastDeaths`] = deadThisTurn.length > 0 ? deadThisTurn : ["none"];
        nextPhase = "jour";
    }
    else if (phase === "jour") {
        let lastD = currentAutoState.lastDeaths || [];
        let chasseurMort = lastD.some(id => currentPlayers[id] && currentPlayers[id].role === "🔫 Chasseur");
        if (chasseurMort) {
            nextPhase = "chasseur";
            updates[`rooms/${currentRoom}/autoState/nextPhaseAfterChasseur`] = "vote_village";
        } else nextPhase = "vote_village";
    }
    else if (phase === "vote_village") {
        let victim = getHighestVotedId();
        if (victim && victim !== "skip") {
            deadThisTurn.push(victim);
            deadThisTurn = propagateDeaths(deadThisTurn);
            deadThisTurn.forEach(id => updates[`rooms/${currentRoom}/players/${id}/isDead`] = true);
        }
        updates[`rooms/${currentRoom}/autoState/lastDeaths`] = deadThisTurn.length > 0 ? deadThisTurn : ["none"];
        nextPhase = "resultat_village";
    }
    else if (phase === "resultat_village") {
        let lastD = currentAutoState.lastDeaths || [];
        let chasseurMort = lastD.some(id => currentPlayers[id] && currentPlayers[id].role === "🔫 Chasseur" && !currentAutoState.chasseurA_Tire);
        if (chasseurMort) {
            nextPhase = "chasseur";
            updates[`rooms/${currentRoom}/autoState/nextPhaseAfterChasseur`] = "nuit";
        } else nextPhase = "nuit";
    }
    else if (phase === "chasseur") {
        updates[`rooms/${currentRoom}/autoState/chasseurA_Tire`] = true;
        let victim = getHighestVotedId();
        if (victim && victim !== "skip") {
            deadThisTurn.push(victim);
            deadThisTurn = propagateDeaths(deadThisTurn);
            deadThisTurn.forEach(id => updates[`rooms/${currentRoom}/players/${id}/isDead`] = true);
        }
        updates[`rooms/${currentRoom}/autoState/lastDeaths`] = deadThisTurn.length > 0 ? deadThisTurn : ["none"];
        nextPhase = "resultat_chasseur";
    }
    else if (phase === "resultat_chasseur") {
        nextPhase = currentAutoState.nextPhaseAfterChasseur;
    }

    updates[`rooms/${currentRoom}/autoState/phase`] = nextPhase;
    updates[`rooms/${currentRoom}/votes`] = null; 
    update(ref(db), updates);
});

// ==========================================
// INTERFACE DE VOTE DES JOUEURS
// ==========================================
function renderVoteButtons(type) {
    const list = document.getElementById('vote-list');
    const witchUI = document.getElementById('witch-options');
    list.innerHTML = ""; witchUI.style.display = "none";
    selectedTargetIds = [];
    
    document.getElementById('btn-confirm-action').style.display = "none";

    // === SORCIERE ===
    if (type === "sorciere") {
        witchUI.style.display = "block";
        const btnConfirm = document.getElementById('btn-confirm-action');
        btnConfirm.style.display = "block";

        let victimId = currentAutoState.wolfVictim;
        let reviveSec = document.getElementById('witch-revive-section');
        let checkRevive = document.getElementById('witch-revive-check');
        checkRevive.checked = false;

        if (victimId && victimId !== "none" && !currentAutoState.witchLifeUsed) {
            reviveSec.style.display = "block";
            document.getElementById('witch-victim-name').textContent = currentPlayers[victimId].name;
        } else reviveSec.style.display = "none";

        let killSec = document.getElementById('witch-kill-section');
        if (!currentAutoState.witchDeathUsed) {
            killSec.style.display = "block";
            list.innerHTML = "";
            const skipBtn = document.createElement('button');
            skipBtn.textContent = "Ne tuer personne";
            skipBtn.className = "target-btn"; skipBtn.style.border = "2px solid #e94560";
            selectedTargetIds = ["skip"];
            skipBtn.onclick = () => selectTarget("skip", skipBtn, 1);
            list.appendChild(skipBtn);

            for (let id in currentPlayers) {
                if (id === myPlayerId || currentPlayers[id].isDead) continue;
                const btn = document.createElement('button');
                btn.textContent = currentPlayers[id].name;
                btn.className = "target-btn";
                btn.onclick = () => selectTarget(id, btn, 1);
                list.appendChild(btn);
            }
        } else {
            killSec.style.display = "none";
            selectedTargetIds = ["skip"]; 
        }

        btnConfirm.onclick = () => {
            witchUI.style.display = "none"; list.innerHTML = ""; btnConfirm.style.display = "none";
            set(ref(db, `rooms/${currentRoom}/votes/${myPlayerId}`), { 
                revive: checkRevive.checked, 
                kill: selectedTargetIds[0] === "skip" ? "none" : selectedTargetIds[0] 
            });
            document.getElementById('my-vote-status').textContent = "Potions décidées. Chut...";
        };
        return;
    }

    // === AUTRES (Village, Chasseur, Cupidon, Loups) ===
    let maxSelections = type === "cupidon" ? 2 : 1;

    if (type === "village") {
        const skipBtn = document.createElement('button');
        skipBtn.textContent = "Ne voter contre personne";
        skipBtn.className = "target-btn";
        skipBtn.onclick = () => selectTarget("skip", skipBtn, maxSelections);
        list.appendChild(skipBtn);
    }

    for (let id in currentPlayers) {
        if (id === myPlayerId && type !== "chasseur" && type !== "cupidon") continue;
        if (currentPlayers[id].isDead) continue;
        if (type === "loups" && currentPlayers[id].role === "🐺 Loup-Garou") continue;

        const btn = document.createElement('button');
        btn.textContent = currentPlayers[id].name;
        btn.className = "target-btn";
        btn.onclick = () => selectTarget(id, btn, maxSelections);
        list.appendChild(btn);
    }

    document.getElementById('btn-confirm-action').onclick = () => {
        if (selectedTargetIds.length !== maxSelections && !selectedTargetIds.includes("skip")) return;
        document.getElementById('vote-list').innerHTML = ""; 
        document.getElementById('btn-confirm-action').style.display = "none";

        if (currentPhaseName === "voyante") {
            const roleSecret = currentPlayers[selectedTargetIds[0]].role;
            document.getElementById('my-vote-status').textContent = `🔍 Tu as vu : ${currentPlayers[selectedTargetIds[0]].name} est ${roleSecret}`;
            set(ref(db, `rooms/${currentRoom}/votes/${myPlayerId}`), "done");
        } else if (currentPhaseName === "cupidon") {
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
                selectedTargetIds.push(id);
                btnElement.style.border = "2px solid #e94560"; btnElement.style.background = "#16213e";
            } else if (maxSelections === 1) {
                selectedTargetIds = [id];
                document.querySelectorAll('.target-btn').forEach(b => { b.style.border = "2px solid transparent"; b.style.background = "#2a3a5a"; });
                btnElement.style.border = "2px solid #e94560"; btnElement.style.background = "#16213e";
            }
        }
    }
    
    if (selectedTargetIds.length === maxSelections || selectedTargetIds.includes("skip")) {
        document.getElementById('btn-confirm-action').style.display = "block";
    } else {
        document.getElementById('btn-confirm-action').style.display = "none";
    }
}

const roleCard = document.getElementById('role-card'), roleDisplay = document.getElementById('my-role-display'), roleInst = document.getElementById('role-instruction');
const show = () => { roleDisplay.style.display = "block"; roleInst.style.display = "none"; window.speechSynthesis.resume(); };
const hide = () => { roleDisplay.style.display = "none"; roleInst.style.display = "block"; };
roleCard.addEventListener('mousedown', show); roleCard.addEventListener('touchstart', show);
roleCard.addEventListener('mouseup', hide); roleCard.addEventListener('touchend', hide);
