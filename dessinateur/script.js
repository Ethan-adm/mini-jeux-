const themes = {
    "basiques": { name: "🏠 Objets & Maison", items: [
        {word: "Une Maison", hint: "Un carré, un triangle au-dessus, un petit rectangle pour la porte."},
        {word: "Un Bonhomme de neige", hint: "Trois cercles de tailles différentes empilés."},
        {word: "Un Soleil", hint: "Un grand cercle avec des traits qui partent vers l'extérieur."},
        {word: "Une Glace", hint: "Un triangle pointe en bas avec un ou deux cercles au-dessus."},
        {word: "Un Sapin", hint: "Trois triangles empilés qui se chevauchent."},
        {word: "Un Smartphone", hint: "Un grand rectangle vertical avec un petit rond en bas."},
        {word: "Une Pizza", hint: "Un grand cercle avec plein de petits ronds à l'intérieur."},
        {word: "Une Lampe", hint: "Un triangle sur un trait vertical, posé sur un petit ovale."},
        {word: "Un Cintre", hint: "Un grand triangle plat avec un point d'interrogation en haut."},
        {word: "Une Clé", hint: "Un cercle avec un long rectangle qui a des petites dents au bout."},
        {word: "Une Fourchette", hint: "Un long rectangle très fin avec quatre petits traits parallèles en haut."},
        {word: "Un Miroir", hint: "Un grand ovale avec un cadre (un deuxième ovale autour)."},
        {word: "Un Lit", hint: "Un grand rectangle avec deux petits carrés (oreillers) en haut."}
    ]},
    "difficile": { name: "🚲 Difficile & Mécanique", items: [
        {word: "Un Vélo", hint: "Aligner deux cercles et les relier par des traits fins (un enfer)."},
        {word: "Un Chat", hint: "Un cercle pour la tête, deux triangles pour les oreilles, un ovale pour le corps."},
        {word: "Une Voiture", hint: "Un rectangle long, un petit rectangle au-dessus, deux cercles en bas."},
        {word: "Un Papillon", hint: "Un petit trait vertical au milieu, deux grands triangles de chaque côté."},
        {word: "Une Montre", hint: "Un cercle avec deux petits rectangles qui partent en haut et en bas."},
        {word: "Des Lunettes", hint: "Deux cercles reliés par un petit trait courbe."},
        {word: "Un Hamburger", hint: "Plusieurs ovales horizontaux empilés les uns sur les autres."},
        {word: "Un Ciseau", hint: "Deux cercles côte à côte avec deux longs triangles qui se croisent."},
        {word: "Une Manette", hint: "Un ovale horizontal avec deux petits cercles et une croix à l'intérieur."}
    ]},
    "nature": { name: "🌳 Nature & Nourriture", items: [
        {word: "Un Donut", hint: "Un grand cercle avec un petit cercle vide au milieu."},
        {word: "Une Pastèque", hint: "Un grand demi-cercle avec des petits points noirs à l'intérieur."},
        {word: "Un Fromage", hint: "Un triangle avec plein de petits ronds de tailles différentes."},
        {word: "Une Bouteille", hint: "Un grand rectangle, un petit rectangle au-dessus, et un petit cercle."},
        {word: "Un Oeuf au plat", hint: "Une forme de nuage plate avec un cercle parfait au milieu."},
        {word: "Une Cerise", hint: "Deux cercles reliés par deux traits qui se rejoignent en haut."},
        {word: "Un Champignon", hint: "Un demi-cercle posé sur un rectangle vertical."},
        {word: "Un Nuage", hint: "Plein de petits cercles qui se chevauchent à l'horizontale."},
        {word: "Un Arc-en-ciel", hint: "Cinq demi-cercles de tailles différentes les uns dans les autres."},
        {word: "Un Volcan", hint: "Un grand triangle avec un trou en haut et des traits qui coulent."},
        {word: "Une Montagne", hint: "Deux ou trois grands triangles avec des petits traits en haut (neige)."},
        {word: "Une Fleur", hint: "Un cercle central entouré de 5 ou 6 petits ovales."},
        {word: "Un Éclair", hint: "Un trait en zigzag avec une pointe en bas."}
    ]},
    "pop": { name: "🎮 Pop Culture", items: [
        {word: "Pac-Man", hint: "Un cercle avec un triangle manquant (une bouche)."},
        {word: "Mickey Mouse", hint: "Un grand cercle avec deux petits cercles sur les côtés en haut."},
        {word: "Bob l'Éponge", hint: "Un grand rectangle avec plein de petits cercles à l'intérieur."},
        {word: "Pokéball", hint: "Un cercle coupé en deux par un trait horizontal, avec un petit rond au milieu."},
        {word: "Sabre Laser", hint: "Un rectangle très fin et très long avec un manche décoré en bas."}
    ]},
    "voyage": { name: "🚢 Transport & Voyage", items: [
        {word: "Un Bateau", hint: "Un trapèze (bateau) avec un trait vertical et un triangle (voile)."},
        {word: "Un Train", hint: "Trois carrés à la suite avec deux petits cercles sous chaque carré."},
        {word: "Une Tente", hint: "Un grand triangle avec un trait vertical au milieu."},
        {word: "Un Phare", hint: "Un rectangle très haut avec un petit carré et des rayons en haut."},
        {word: "Une Fusée", hint: "Un long cylindre avec un triangle en haut et deux sur les côtés."},
        {word: "Une Valise", hint: "Un grand rectangle avec un petit demi-cercle (poignée) sur le dessus."}
    ]},
    "derapage": { name: "🔞 Risque de dérapage", items: [
        {word: "Bouteille de Champagne", hint: "Un long cylindre qui se termine par un goulot fin."},
        {word: "Un Soutien-gorge", hint: "Deux demi-cercles reliés par des traits fins (attention au malaise)."},
        {word: "Des Menottes", hint: "Deux cercles reliés par une chaîne (des petits traits)."},
        {word: "Un Cocktail", hint: "Un triangle avec une tige fine et un petit cercle (l'olive)."},
        {word: "Une Bouche (Lèvres)", hint: "Deux ovales horizontaux écrasés l'un contre l'autre."},
        {word: "Une Brosse à dents", hint: "Un rectangle très long avec plein de petits traits serrés sur un bout."}
    ]}
};

let currentPool = [];
let showHintsSetting = true;

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
        currentPool = currentPool.concat(themes[cb.value].items);
    });

    if (currentPool.length === 0) return alert("Choisis au moins un thème !");
    
    // On enregistre si l'utilisateur veut voir les astuces
    showHintsSetting = document.getElementById("toggle-hints").checked;
    
    // Mélange (Fisher-Yates pour être sûr !)
    for (let i = currentPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentPool[i], currentPool[j]] = [currentPool[j], currentPool[i]];
    }
    
    document.getElementById("setup-screen").classList.remove("active");
    document.getElementById("game-screen").classList.add("active");
    nextRound();
}

function nextRound() {
    if (currentPool.length === 0) return location.reload();
    
    const item = currentPool.shift();
    document.getElementById("secret-word-display").textContent = item.word;
    document.getElementById("geometry-hint").textContent = item.hint;
    
    // On cache ou on affiche le bloc d'astuces selon le réglage
    document.getElementById("hint-area").style.display = showHintsSetting ? "block" : "none";
    
    // Reset l'affichage pour le nouveau tour
    document.getElementById("secret-container").style.display = "none";
    document.getElementById("show-btn").style.display = "block";
    document.getElementById("next-btn").style.display = "none";
}

function revealSecret() {
    document.getElementById("secret-container").style.display = "block";
    document.getElementById("show-btn").style.display = "none";
    document.getElementById("next-btn").style.display = "block";
}
