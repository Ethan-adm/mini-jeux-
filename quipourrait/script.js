// La base de données
const themes = {
    "chill": { name: "😇 Classique & Chill", questions: ["devenir président de la République ?", "oublier l'anniversaire de sa propre mère ?", "pleurer devant une publicité avec un chien ?", "se perdre dans sa propre ville ?", "gagner à l'EuroMillions et ne rien dire à personne ?", "partir vivre dans une ferme avec des chèvres ?", "devenir une star de la télé-réalité ?", "manger un plat périmé par flemme de cuisiner ?", "rester bloqué dans un ascenseur et paniquer ?", "devenir centenaire ?"] },
    "travail": { name: "💼 Réussite & Travail", questions: ["devenir milliardaire avant 40 ans ?", "se faire virer dès son premier jour de boulot ?", "devenir le patron de tout le monde ici ?", "faire un burn-out parce qu'il travaille trop ?", "inventer un truc totalement inutile mais devenir riche avec ?", "travailler en pyjama toute sa vie ?"] },
    "survie": { name: "🧟 Survie & Absurde", questions: ["être le premier à mourir dans un film d'horreur ?", "survivre seul sur une île déserte pendant un an ?", "rejoindre une secte sans faire exprès ?", "se battre avec un pigeon pour un morceau de pain ?", "devenir un tueur en série et ne jamais se faire prendre ?", "être en fait un alien infiltré sur Terre ?", "provoquer une apocalypse zombie par maladresse ?", "partir vivre dans l'espace et ne jamais revenir ?"] },
    "argent": { name: "💰 Argent & Ambition", questions: ["demander un remboursement de 50 centimes à un ami ?", "dépenser tout son salaire en une seule journée ?", "devenir un gourou de la crypto-monnaie et tout perdre ?", "garder un ticket de caisse pendant 5 ans au cas où ?", "ouvrir un bar de plage à l'autre bout du monde ?", "gagner un procès contre une multinationale ?"] },
    "aventure": { name: "✈️ Aventure & Voyage", questions: ["partir en voyage sur un coup de tête avec un parfait inconnu ?", "se faire arrêter à la douane pour un truc stupide ?", "rater son avion parce qu'il faisait du shopping au Duty Free ?", "finir par vivre dans une grotte ou une cabane au Canada ?", "perdre son passeport le premier jour des vacances ?", "manger un insecte grillé juste pour la photo ?"] },
    "gaffeur": { name: "🤡 Maladresse & Honte", questions: ["se prendre une porte vitrée devant tout le monde ?", "dire 'Je t'aime' à un serveur qui lui dit 'Bon appétit' ?", "faire brûler de l'eau en essayant de cuisiner des pâtes ?", "se tromper de prénom au lit ?", "partir de chez lui en chaussons sans s'en rendre compte ?", "envoyer un message médisant sur quelqu'un à la personne concernée ?", "casser un objet de valeur dans un magasin et s'enfuir ?"] },
    "drama": { name: "💔 Amour & Drama", questions: ["'ghoster' quelqu'un après 3 rendez-vous parfaits ?", "stalker l'ex de son ex jusqu'à 4h du matin ?", "se marier avec quelqu'un juste pour son argent ?", "sortir avec une célébrité et ne jamais nous le dire ?", "pleurer au mariage d'un(e) ex ?", "tomber amoureux d'un personnage de fiction ?", "présenter son nouveau plan cul à ses parents dès la première semaine ?", "se remettre avec son ex pour la 10ème fois ?"] },
    "digital": { name: "📱 Digital & Réseaux Sociaux", questions: ["devenir influenceur pour un produit totalement débile ?", "liker par accident une photo d'il y a 3 ans en stalkant quelqu'un ?", "passer 12h par jour sur TikTok sans s'en rendre compte ?", "lancer sa propre chaîne YouTube de tutoriels inutiles ?", "répondre 'Vu' à un message important et oublier de répondre ?", "avoir un faux compte pour espionner ses ennemis ?", "se faire pirater son compte parce que son mot de passe est '1234' ?"] },
    "alcool": { name: "🍻 Soirée & Alcool", questions: ["vomir avant même que la soirée commence vraiment ?", "perdre son téléphone et ses clés en une seule soirée ?", "finir la soirée en train de dormir dans la baignoire ?", "envoyer un message vocal de 5 minutes à son ex à 3h du mat' ?", "danser sur une table et la casser ?", "essayer de soudoyer un videur avec 5 euros ?", "s'endormir dans le bus/métro et finir au terminus ?", "faire un cul-sec sur un truc qu'il ne connaît pas ?", "finir la soirée en mangeant un kebab tout seul sur un trottoir ?"] },
    "trash": { name: "🔞 Hot & Trash (+18)", questions: ["ouvrir un compte OnlyFans en secret ?", "faire un plan à trois avec des inconnus ?", "se faire griller par ses parents en plein acte ?", "envoyer un 'nude' à la mauvaise personne ?", "coucher avec le/la petit(e) ami(e) d'un(e) ex ?", "avoir un sex-toy caché dans son sac à main/dos ?", "simuler un orgasme de manière pas du tout crédible ?", "faire un strip-tease pour obtenir un verre gratuit ?", "être le plus doué au lit (selon la légende) ?", "avoir déjà testé le plus de positions différentes ?"] },
    "undercover": { name: "🕵️‍♂️ Mode Undercover", questions: ["être un agent secret dans la vraie vie sans qu'on le sache ?", "mener une double vie avec deux familles différentes ?", "tricher à un jeu de société sans jamais se faire prendre ?", "mentir sur son âge pendant des années ?", "garder un secret d'État sous la torture ?"] }
};

let currentQuestionsPool = [];
let audioCtx;

window.onload = function() {
    const themeList = document.getElementById("theme-list");
    for (const [key, data] of Object.entries(themes)) {
        const div = document.createElement("div");
        div.className = "theme-item";
        div.innerHTML = `<input type="checkbox" class="theme-checkbox custom-checkbox" value="${key}" checked> <label>${data.name}</label>`;
        themeList.appendChild(div);
    }
};

// Son basique pour le décompte
function playBeep(freq, type, duration) {
    if(!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function startGame() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const checkedBoxes = document.querySelectorAll('.theme-checkbox:checked');
    currentQuestionsPool = [];
    
    checkedBoxes.forEach(box => {
        currentQuestionsPool = currentQuestionsPool.concat(themes[box.value].questions);
    });

    if (currentQuestionsPool.length === 0) {
        alert("Coche au moins un thème !");
        return;
    }

    // Mélanger les questions
    for (let i = currentQuestionsPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentQuestionsPool[i], currentQuestionsPool[j]] = [currentQuestionsPool[j], currentQuestionsPool[i]];
    }

    switchScreen("setup-screen", "game-screen");
    nextQuestion();
}

function nextQuestion() {
    if (currentQuestionsPool.length === 0) {
        document.getElementById("question-display").textContent = "Fini ! Vous avez fait le tour.";
        document.getElementById("countdown-btn").style.display = "none";
        document.getElementById("next-btn").style.display = "none";
        return;
    }

    // Prendre la première question et l'enlever de la liste
    const q = currentQuestionsPool.shift();
    
    const display = document.getElementById("question-display");
    display.textContent = "... " + q;
    
    // Animation d'apparition
    display.classList.remove("pop-anim");
    void display.offsetWidth; // Force le reflow du navigateur
    display.classList.add("pop-anim");

    // Reset l'interface
    document.getElementById("timer-display").style.display = "none";
    document.getElementById("countdown-btn").style.display = "block";
    document.getElementById("next-btn").style.display = "none";
}

function startCountdown() {
    document.getElementById("countdown-btn").style.display = "none";
    const timerDisplay = document.getElementById("timer-display");
    timerDisplay.style.display = "block";
    
    let count = 3;
    timerDisplay.textContent = count;
    playBeep(400, 'sine', 0.2); // Bip court

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            timerDisplay.textContent = count;
            playBeep(400, 'sine', 0.2); // Bip court
            
            // Animation du chiffre
            timerDisplay.classList.remove("pop-anim");
            void timerDisplay.offsetWidth;
            timerDisplay.classList.add("pop-anim");
        } else {
            clearInterval(interval);
            timerDisplay.textContent = "POINTEZ ! 👈";
            playBeep(800, 'square', 0.5); // Bip long aigu
            
            // Vibre si possible
            if (navigator.vibrate) navigator.vibrate(500);
            
            document.getElementById("next-btn").style.display = "block";
        }
    }, 1000);
}

function switchScreen(hideId, showId) {
    document.getElementById(hideId).classList.remove("active");
    document.getElementById(showId).classList.add("active");
}

