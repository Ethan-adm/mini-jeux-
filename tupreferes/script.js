const themes = {
    "absurde": { name: "🤡 Absurde & Marrant", pairs: [
        ["Avoir des mains à la place des pieds", "Avoir des pieds à la place des mains"],
        ["Devoir chanter tout ce que tu dis", "Devoir danser chaque fois que tu marches"],
        ["Avoir un nez de 30 cm", "Avoir des oreilles de lapin permanentes"],
        ["Avoir le rire de Mickey Mouse", "Avoir la voix de Batman (très grave)"],
        ["Toujours sentir l'oignon", "Toujours sentir le chien mouillé"],
        ["Avoir une corne de licorne", "Avoir une queue de dinosaure"],
        ["Devoir crier 'C'est faux !' après chaque phrase", "Devoir applaudir chaque fois que quelqu'un finit de parler"]
    ]},
    "tech": { name: "📱 Monde Moderne & Tech", pairs: [
        ["Ne plus avoir Internet", "Ne plus avoir de Smartphone (mais ordi OK)"],
        ["Avoir 0 abonné sur tous tes réseaux", "Avoir 1 million d'abonnés mais tout le monde te déteste"],
        ["Publier ta dernière photo de galerie sur Instagram", "Publier ton dernier message envoyé sur LinkedIn"],
        ["Que ton téléphone tombe dans les toilettes", "Que ton téléphone explose (plus de données)"],
        ["Devoir utiliser Internet Explorer toute ta vie", "Devoir utiliser un Nokia 3310 toute ta vie"]
    ]},
    "hardcore": { name: "💀 Hardcore (Dilemmes)", pairs: [
        ["Connaître la date de ta mort", "Connaître la cause de ta mort"],
        ["Être immortel mais tout le monde meurt autour de toi", "Vivre jusqu'à 50 ans mais être ultra riche"],
        ["Voyager dans le passé (tu ne peux rien changer)", "Voyager dans le futur (tu ne peux pas revenir)"],
        ["Être la personne la plus intelligente du monde", "Être la personne la plus heureuse du monde"],
        ["Sauver ton chien d'un incendie", "Sauver un inconnu d'un incendie"],
        ["Ne plus jamais pouvoir dormir", "Ne plus jamais pouvoir manger"]
    ]},
    "pouvoirs": { name: "🦸 Super-Pouvoirs (Nuls)", pairs: [
        ["Pouvoir voler mais seulement à 10 cm du sol", "Être invisible mais seulement quand tu cries"],
        ["Lire dans les pensées des animaux", "Parler toutes les langues mais avec un accent ridicule"],
        ["Pouvoir te téléporter mais arriver tout nu", "Pouvoir arrêter le temps mais tu vieillis 2x plus vite"]
    ]},
    "degoût": { name: "🤢 Le Dégoût Absolu", pairs: [
        ["Devoir boire un verre de ketchup cul-sec", "Devoir manger une cuillère de mayonnaise toutes les heures"],
        ["Avoir des dents en bois", "Avoir des ongles en fromage"],
        ["Se brosser les dents avec du jus d'orange", "Se laver les cheveux avec de l'huile de friture"],
        ["Avoir une haleine de poisson permanent", "Avoir une odeur de pieds sous les bras"],
        ["Manger un ver de terre vivant", "Manger une pizza à la banane et au thon"]
    ]},
    "genance": { name: "🎭 Vie Sociale & Gênance", pairs: [
        ["Faire un 'prout' bruyant pendant un enterrement", "Faire un 'prout' bruyant pendant un premier rendez-vous"],
        ["Que tes parents racontent tes hontes à ton boss", "Que ton boss raconte tes erreurs à tes parents"],
        ["Te tromper de destinataire et envoyer 'Je t'aime' à ton banquier", "Envoyer un nude à ton groupe de famille"],
        ["Porter un t-shirt avec ta propre tête dessus tous les jours", "Devoir marcher à quatre pattes en public"],
        ["Que tout le monde rigole quand tu es sérieux", "Que tout le monde pleure quand tu fais une blague"]
    ]},
    "argent": { name: "💰 Argent & Carrière", pairs: [
        ["Gagner 10 000€ par jour mais tu ne peux plus voir tes amis", "Être au SMIC mais être entouré des gens que tu aimes"],
        ["Avoir le job de tes rêves mais un patron odieux", "Avoir un job de merde mais un patron génial"],
        ["Être très riche mais mourir à 40 ans", "Être pauvre mais vivre jusqu'à 100 ans"],
        ["Pouvoir voler de l'argent sans jamais être pris", "Pouvoir rendre tout le monde riche sauf toi"],
        ["Travailler 100h par semaine pour être PDG", "Travailler 10h par semaine pour être stagiaire à vie"]
    ]},
    "scifi": { name: "⚡ Paradoxes & SF", pairs: [
        ["Pouvoir parler à ton 'toi' de 10 ans", "Pouvoir parler à ton 'toi' de 50 ans"],
        ["Vivre dans une réalité virtuelle parfaite (mais fausse)", "Vivre dans un monde post-apocalyptique (mais réel)"],
        ["Avoir un bouton 'Pause' pour le monde entier", "Avoir un bouton 'Retour rapide' de 10 secondes"],
        ["Être la première personne sur Mars (seul)", "Être la dernière personne sur Terre"],
        ["Savoir quand tout le monde va mourir", "Savoir quand tout le monde ment"]
    ]},
    "latenight": { name: "🍻 Late Night (+18)", pairs: [
        ["Que tes parents voient ton historique web", "Voir l'historique web de tes parents"],
        ["Ne plus jamais boire d'alcool", "Ne plus jamais faire l'amour"],
        ["Sortir avec ton ex", "Sortir avec l'ex de ton/ta meilleur(e) ami(e)"],
        ["Être infidèle sans être capté", "Être fidèle mais tout le monde pense que tu trompes"],
        ["Que tout le monde puisse lire tes SMS", "Que tout le monde puisse entendre tes pensées"],
        ["Vivre nu dans la jungle pendant 1 mois", "Vivre habillé en clown en ville pendant 1 an"],
        ["Devoir embrasser la personne à ta gauche", "Devoir envoyer 'Je t'aime' à ton ex"]
    ]},
    "hot": { name: "🔞 Hot & Piquant", pairs: [
        ["Avoir un chien qui parle mais qui ne dit que tes secrets", "Avoir un chat qui te juge à voix haute 24h/24"],
        ["Devoir combattre un canard de la taille d'un cheval", "Devoir combattre 100 chevaux de la taille d'un canard"],
        ["Faire l'amour dans un cimetière", "Faire l'amour dans le bureau de ton patron"],
        ["Être menotté à ton pire ennemi pendant 24h", "Être menotté à ton ex pendant 48h"],
        ["Que ton partenaire crie le nom de son ex", "Que ton partenaire rigole sans s'arrêter pendant l'acte"],
        ["Ne plus pouvoir faire de bisous", "Ne plus pouvoir faire de câlins"]
    ]}
};

let currentPool = [];
let challengeMode = false;

window.onload = function() {
    const list = document.getElementById("theme-list");
    for (const [key, data] of Object.entries(themes)) {
        const div = document.createElement("div");
        div.className = "theme-item";
        div.innerHTML = `<input type="checkbox" class="theme-checkbox custom-checkbox" value="${key}" checked> <label>${data.name}</label>`;
        list.appendChild(div);
    }
};

function startGame() {
    const checked = document.querySelectorAll('.theme-checkbox:checked');
    currentPool = [];
    checked.forEach(cb => {
        currentPool = currentPool.concat(themes[cb.value].pairs);
    });

    if (currentPool.length === 0) return alert("Choisis au moins un thème !");
    
    challengeMode = document.getElementById("challenge-mode").checked;
    
    // Mélange
    currentPool.sort(() => Math.random() - 0.5);
    
    document.getElementById("setup-screen").classList.remove("active");
    document.getElementById("game-screen").classList.add("active");
    nextDilemma();
}

function nextDilemma() {
    if (currentPool.length === 0) return location.reload();
    
    const pair = currentPool.shift();
    document.getElementById("display-a").textContent = pair[0];
    document.getElementById("display-b").textContent = pair[1];
    
    document.getElementById("result-zone").style.display = "none";
    document.querySelector(".option-a").style.opacity = "1";
    document.querySelector(".option-b").style.opacity = "1";
    document.querySelector(".option-a").style.border = "none";
    document.querySelector(".option-b").style.border = "2px solid #e94560";
}

function selectOption(choice) {
    // Si on clique, on révèle le résultat
    document.getElementById("result-zone").style.display = "block";
    
    // Feedback visuel du choix
    if (choice === 'A') {
        document.querySelector(".option-b").style.opacity = "0.3";
        document.querySelector(".option-a").style.border = "4px solid #fff";
    } else {
        document.querySelector(".option-a").style.opacity = "0.3";
        document.querySelector(".option-b").style.border = "4px solid #fff";
    }

    if (challengeMode) {
        // En mode défi, on laisse les autres voter pour voir si le joueur a raison
        alert("Tu as choisi l'option " + choice + ". Maintenant, est-ce que la majorité est d'accord ?");
    }
}

