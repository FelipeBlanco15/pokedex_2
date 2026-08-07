/* ==========================================================================
   POKÉDEX PROJETO COMPLETO PARA PORTFÓLIO - LÓGICA JAVASCRIPT
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. ESTADO GLOBAL DA APLICAÇÃO (STATE)
// O objeto "state" funciona como a "memória" da nossa Pokédex.
// --------------------------------------------------------------------------
const state = {
    allPokemon: [],         // Guarda a lista com todos os Pokémon carregados
    currentOffset: 0,       // Posição atual para buscar mais Pokémon na API (Paginação)
    limit: 24,              // Quantos Pokémon carregam por vez (24 por página)
    isLoading: false,       // Evita clicar em "Carregar Mais" várias vezes juntas
    favorites: [],          // Guardará os IDs dos Pokémon favoritados [1, 25, 6, ...]
    showOnlyFavorites: false // Controla se estamos vendo apenas a lista de favoritos
};

// --------------------------------------------------------------------------
// 2. CAPTURA DOS ELEMENTOS DO HTML (DOM)
// Guardamos todos os elementos HTML importantes em variáveis para facilitar o uso.
// --------------------------------------------------------------------------
const DOM = {
    // Abas de Navegação no topo
    tabPokedexBtn: document.getElementById('tab-pokedex-btn'),
    tabGuideBtn: document.getElementById('tab-guide-btn'),
    pokedexSection: document.getElementById('pokedex-section'),
    guideSection: document.getElementById('guide-section'),

    // Elementos da Pokédex (App)
    pokemonGrid: document.getElementById('pokemon-grid'),
    loadingSpinner: document.getElementById('loading-spinner'),
    loadMoreBtn: document.getElementById('load-more-btn'),
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    typeSelect: document.getElementById('type-select'),
    favoritesToggleBtn: document.getElementById('favorites-toggle-btn'),
    favCountBadge: document.getElementById('fav-count'),
    statusMessage: document.getElementById('status-message'),

    // Modal de Detalhes
    modal: document.getElementById('pokemon-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    modalContent: document.getElementById('modal-content')
};

// --------------------------------------------------------------------------
// 3. INICIALIZAÇÃO DA APLICAÇÃO (DISPARADO ASSIM QUE O HTML CARREGA)
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Pokédex App Inicializada!');
    setupEventListeners();          // Ativa os cliques e digitações
    loadFavoritesFromStorage();     // Carrega os favoritos salvos do localStorage
    fetchPokemonList();             // Faz o primeiro pedido à PokéAPI
});

// --------------------------------------------------------------------------
// 4. MÓDULO DE CONSUMO DA POKÉAPI (FETCH & ASYNC/AWAIT)
// --------------------------------------------------------------------------

/**
 * Função assíncrona para buscar a lista de Pokémon na PokéAPI.
 */
async function fetchPokemonList() {
    if (state.isLoading) return; // Se já estiver carregando, cancela

    setLoading(true);

    try {
        const url = `https://pokeapi.co/api/v2/pokemon?limit=${state.limit}&offset=${state.currentOffset}`;
        console.log(`📡 Requisitando PokéAPI: ${url}`);

        // O 'fetch' faz a requisição HTTP para a API
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha ao conectar com a PokéAPI');

        // Converte o retorno bruto da API em um objeto JavaScript (JSON)
        const data = await response.json();

        // Faz requisições em paralelo (Promise.all) para buscar os detalhes completos de cada Pokémon
        const detailedPokemonPromises = data.results.map(item => fetchPokemonDetailsByUrl(item.url));
        const detailedPokemonList = await Promise.all(detailedPokemonPromises);

        // Adiciona os novos Pokémon carregados ao nosso array principal
        state.allPokemon = [...state.allPokemon, ...detailedPokemonList];
        state.currentOffset += state.limit;

        // Renderiza os cards na tela
        applyCurrentFilters();

    } catch (error) {
        console.error('❌ Erro ao buscar Pokémon:', error);
        showStatusMessage('Erro ao carregar dados da PokéAPI. Verifique sua conexão.', 'error');
    } finally {
        setLoading(false);
    }
}

/**
 * Busca detalhes como imagem, peso, altura, tipo e estatísticas de um Pokémon individual.
 */
async function fetchPokemonDetailsByUrl(url) {
    const response = await fetch(url);
    const data = await response.json();

    // Montamos um objeto limpo com exatamente o que precisamos
    return {
        id: data.id,
        name: data.name,
        // Usamos a arte oficial em HD (official-artwork)
        image: data.sprites.other['official-artwork'].front_default || data.sprites.front_default,
        shinyImage: data.sprites.other['official-artwork'].front_shiny || data.sprites.front_shiny,
        types: data.types.map(t => t.type.name),
        height: data.height / 10, // Converte para metros
        weight: data.weight / 10, // Converte para kg
        stats: data.stats.map(s => ({
            name: translateStatName(s.stat.name),
            value: s.base_stat
        })),
        cries: data.cries?.latest || null
    };
}

// --------------------------------------------------------------------------
// 5. MÓDULO DE RENDERIZAÇÃO NA TELA (MANIPULAÇÃO DO DOM)
// --------------------------------------------------------------------------

/**
 * Desenha a lista de Pokémon no HTML em formato de Cards.
 */
function renderPokemonCards(pokemonList) {
    DOM.pokemonGrid.innerHTML = ''; // Limpa a tela antes de desenhar

    if (pokemonList.length === 0) {
        showStatusMessage('Nenhum Pokémon encontrado com estes filtros.', 'info');
        return;
    }

    hideStatusMessage();

    pokemonList.forEach(pokemon => {
        const card = document.createElement('article');
        card.className = 'pokemon-card';
        card.setAttribute('data-id', pokemon.id);

        const formattedId = `#${String(pokemon.id).padStart(3, '0')}`;

        // Verifica se este Pokémon está na lista de favoritos
        const isFav = state.favorites.includes(pokemon.id);
        const favHeartClass = isFav ? 'fa-solid fa-heart active' : 'fa-regular fa-heart';

        // Gera os botões de tipo
        const typesHTML = pokemon.types.map(type =>
            `<span class="type-badge type-${type}">${translateTypeName(type)}</span>`
        ).join('');

        card.innerHTML = `
            <button class="card-fav-btn ${isFav ? 'is-fav' : ''}" title="Favoritar Pokémon" data-id="${pokemon.id}">
                <i class="${favHeartClass}"></i>
            </button>
            <span class="pokemon-id">${formattedId}</span>
            <div class="pokemon-img-wrapper">
                <img src="${pokemon.image}" alt="${pokemon.name}" class="pokemon-img" loading="lazy">
            </div>
            <h3 class="pokemon-name">${pokemon.name}</h3>
            <div class="pokemon-types">
                ${typesHTML}
            </div>
        `;

        // Evento 1: Clicar no botão de Coração (Favorito)
        const favBtn = card.querySelector('.card-fav-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita abrir o modal ao clicar no coração
            toggleFavorite(pokemon.id);
        });

        // Evento 2: Clicar no Card abre o Modal de Detalhes
        card.addEventListener('click', () => openPokemonModal(pokemon));

        DOM.pokemonGrid.appendChild(card);
    });
}

/**
 * Abre o Modal com as estatísticas completas do Pokémon.
 */
function openPokemonModal(pokemon) {
    const formattedId = `#${String(pokemon.id).padStart(3, '0')}`;
    const isFav = state.favorites.includes(pokemon.id);

    const typesHTML = pokemon.types.map(type =>
        `<span class="type-badge type-${type}">${translateTypeName(type)}</span>`
    ).join('');

    // Cria as barras de progresso animadas das estatísticas
    const statsHTML = pokemon.stats.map(stat => {
        const percentage = Math.min(100, (stat.value / 150) * 100);
        return `
            <div class="stat-row">
                <span class="stat-name">${stat.name}</span>
                <span class="stat-val">${stat.value}</span>
                <div class="stat-bar-outer">
                    <div class="stat-bar-inner" style="width: ${percentage}%;"></div>
                </div>
            </div>
        `;
    }).join('');

    DOM.modalContent.innerHTML = `
        <div class="modal-header">
            <span class="modal-id">${formattedId}</span>
            <h2 class="modal-title">${pokemon.name}</h2>
            <div class="pokemon-types" style="margin-top: 8px;">
                ${typesHTML}
            </div>
        </div>

        <div class="modal-artwork">
            <img id="modal-pokemon-img" src="${pokemon.image}" alt="${pokemon.name}">
        </div>

        <div style="display: flex; justify-content: space-around; text-align: center; margin: 16px 0;">
            <div>
                <small style="color: var(--text-muted);">Altura</small>
                <p><strong>${pokemon.height} m</strong></p>
            </div>
            <div>
                <small style="color: var(--text-muted);">Peso</small>
                <p><strong>${pokemon.weight} kg</strong></p>
            </div>
        </div>

        <div class="modal-stats">
            <h4 style="margin-bottom: 12px; font-size: 0.95rem;">Estatísticas Base</h4>
            ${statsHTML}
        </div>

        <!-- BOTÕES DOS DESAFIOS NO MODAL -->
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button id="modal-fav-btn" class="nav-tab-btn" style="background: rgba(255,71,87,0.15); color: var(--accent-red);">
                <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i> ${isFav ? 'Remover Favorito' : 'Adicionar Favorito'}
            </button>
            
            <button id="shiny-toggle-btn" class="nav-tab-btn" style="background: rgba(255,211,42,0.15); color: #ffd32a;">
                ✨ Ver Versão Shiny
            </button>
            
            ${pokemon.cries ? `
                <button id="cry-audio-btn" class="nav-tab-btn" style="background: rgba(46,213,115,0.15); color: #2ed573;">
                    🔊 Ouvir Som
                </button>
            ` : ''}
        </div>
    `;

    DOM.modal.classList.remove('hidden');

    // Listener 1: Alternar Favorito dentro do Modal
    document.getElementById('modal-fav-btn').addEventListener('click', () => {
        toggleFavorite(pokemon.id);
        openPokemonModal(pokemon); // Atualiza a tela do modal
    });

    // Listener 2: Alternar Versão Shiny (Desafio 3)
    document.getElementById('shiny-toggle-btn').addEventListener('click', () => toggleShinySprite(pokemon));

    // Listener 3: Tocar Áudio (Desafio 4)
    const cryBtn = document.getElementById('cry-audio-btn');
    if (cryBtn && pokemon.cries) {
        cryBtn.addEventListener('click', () => playPokemonCry(pokemon.cries, cryBtn));
    }
}

// --------------------------------------------------------------------------
// 🎯 RESOLUÇÃO DOS DESAFIOS DO PORTFÓLIO (INTEGRADOS E PRONTOS)
// --------------------------------------------------------------------------

/**
 * 🎯 DESAFIO 1: Filtro por Tipo de Pokémon
 * Filtra a lista com base no seletor de tipos (Fogo, Água, etc.).
 */
function handleTypeFilter() {
    applyCurrentFilters();
}

/**
 * Aplica os filtros combinados (Busca por Texto, Tipo Selecionado e Favoritos).
 */
function applyCurrentFilters() {
    const searchText = DOM.searchInput.value.toLowerCase().trim();
    const selectedType = DOM.typeSelect.value;

    let filtered = state.allPokemon;

    // 1. Filtra por Favoritos (se a aba de favoritos estiver ativa)
    if (state.showOnlyFavorites) {
        filtered = filtered.filter(pokemon => state.favorites.includes(pokemon.id));
    }

    // 2. Filtra por Tipo
    if (selectedType !== 'all') {
        filtered = filtered.filter(pokemon => pokemon.types.includes(selectedType));
    }

    // 3. Filtra por Texto (Nome ou ID)
    if (searchText.length > 0) {
        filtered = filtered.filter(pokemon =>
            pokemon.name.toLowerCase().includes(searchText) || String(pokemon.id) === searchText
        );
    }

    renderPokemonCards(filtered);
}

/**
 * 🎯 DESAFIO 2: Sistema de Favoritos com LocalStorage
 * Adiciona ou remove o ID do Pokémon do array de favoritos e salva no navegador.
 */
function toggleFavorite(pokemonId) {
    const index = state.favorites.indexOf(pokemonId);

    if (index > -1) {
        // Se já for favorito, remove
        state.favorites.splice(index, 1);
        console.log(`💔 Pokémon #${pokemonId} removido dos favoritos.`);
    } else {
        // Se não for, adiciona
        state.favorites.push(pokemonId);
        console.log(`❤️ Pokémon #${pokemonId} adicionado aos favoritos!`);
    }

    // Salva no LocalStorage em formato de texto JSON
    localStorage.setItem('pokedex_favs', JSON.stringify(state.favorites));

    // Atualiza o contador no botão
    DOM.favCountBadge.textContent = state.favorites.length;

    // Atualiza a tela
    applyCurrentFilters();
}

/**
 * Carrega a lista de favoritos do LocalStorage ao abrir a página.
 */
function loadFavoritesFromStorage() {
    const stored = localStorage.getItem('pokedex_favs');
    if (stored) {
        try {
            state.favorites = JSON.parse(stored);
            DOM.favCountBadge.textContent = state.favorites.length;
        } catch (e) {
            console.error('Erro ao ler favoritos do localStorage', e);
        }
    }
}

/**
 * 🎯 DESAFIO 3: Alternar Imagem entre Normal e Shiny
 */
function toggleShinySprite(pokemon) {
    const modalImg = document.getElementById('modal-pokemon-img');
    const shinyBtn = document.getElementById('shiny-toggle-btn');

    if (!modalImg || !pokemon.shinyImage) return;

    const isCurrentlyShiny = modalImg.src === pokemon.shinyImage;

    if (isCurrentlyShiny) {
        modalImg.src = pokemon.image;
        shinyBtn.style.background = 'rgba(255,211,42,0.15)';
        shinyBtn.textContent = '✨ Ver Versão Shiny';
    } else {
        modalImg.src = pokemon.shinyImage;
        shinyBtn.style.background = '#ffd32a';
        shinyBtn.style.color = '#000';
        shinyBtn.textContent = '🌟 Ver Versão Normal';
    }
}

/**
 * 🎯 DESAFIO 4: Reprodutor de Áudio dos Gritos dos Pokémon
 */
function playPokemonCry(cryUrl, buttonElement) {
    if (!cryUrl) return;

    const audio = new Audio(cryUrl);
    audio.volume = 0.4; // Volume ajustado a 40%

    if (buttonElement) {
        buttonElement.innerHTML = '🔊 Tocando...';
        buttonElement.style.opacity = '0.7';
    }

    audio.play().then(() => {
        setTimeout(() => {
            if (buttonElement) {
                buttonElement.innerHTML = '🔊 Ouvir Som';
                buttonElement.style.opacity = '1';
            }
        }, 1200);
    }).catch(err => console.error('Erro ao reproduzir áudio:', err));
}

// --------------------------------------------------------------------------
// 6. EVENTOS E NAVEGAÇÃO
// --------------------------------------------------------------------------
function setupEventListeners() {
    // Busca em tempo real
    DOM.searchInput.addEventListener('input', () => {
        if (DOM.searchInput.value.length > 0) {
            DOM.clearSearchBtn.classList.remove('hidden');
        } else {
            DOM.clearSearchBtn.classList.add('hidden');
        }
        applyCurrentFilters();
    });

    DOM.clearSearchBtn.addEventListener('click', () => {
        DOM.searchInput.value = '';
        DOM.clearSearchBtn.classList.add('hidden');
        applyCurrentFilters();
    });

    // Filtro por tipo
    DOM.typeSelect.addEventListener('change', handleTypeFilter);

    // Botão de Alternar Visualização Apenas Favoritos
    DOM.favoritesToggleBtn.addEventListener('click', () => {
        state.showOnlyFavorites = !state.showOnlyFavorites;

        if (state.showOnlyFavorites) {
            DOM.favoritesToggleBtn.style.background = 'var(--accent-red)';
            DOM.favoritesToggleBtn.style.color = '#fff';
        } else {
            DOM.favoritesToggleBtn.style.background = 'rgba(255, 71, 87, 0.1)';
            DOM.favoritesToggleBtn.style.color = 'var(--accent-red)';
        }
        applyCurrentFilters();
    });

    // Botão Carregar Mais
    DOM.loadMoreBtn.addEventListener('click', fetchPokemonList);

    // Fechar Modal
    DOM.closeModalBtn.addEventListener('click', closeModal);
    DOM.modal.addEventListener('click', (e) => {
        if (e.target === DOM.modal) closeModal();
    });

    // Alternar Abas (Pokédex vs Guia)
    DOM.tabPokedexBtn.addEventListener('click', () => switchTab('pokedex'));
    DOM.tabGuideBtn.addEventListener('click', () => switchTab('guide'));
}

function switchTab(tabName) {
    if (tabName === 'pokedex') {
        DOM.tabPokedexBtn.classList.add('active');
        DOM.tabGuideBtn.classList.remove('active');
        DOM.pokedexSection.classList.add('active');
        DOM.guideSection.classList.remove('active');
    } else {
        DOM.tabGuideBtn.classList.add('active');
        DOM.tabPokedexBtn.classList.remove('active');
        DOM.guideSection.classList.add('active');
        DOM.pokedexSection.classList.remove('active');
    }
}

function closeModal() {
    DOM.modal.classList.add('hidden');
}

function setLoading(isLoading) {
    state.isLoading = isLoading;
    if (isLoading) {
        DOM.loadingSpinner.classList.remove('hidden');
        DOM.loadMoreBtn.disabled = true;
        DOM.loadMoreBtn.style.opacity = '0.5';
    } else {
        DOM.loadingSpinner.classList.add('hidden');
        DOM.loadMoreBtn.disabled = false;
        DOM.loadMoreBtn.style.opacity = '1';
    }
}

function showStatusMessage(msg, type = 'info') {
    DOM.statusMessage.textContent = msg;
    DOM.statusMessage.className = `status-message status-${type}`;
    DOM.statusMessage.classList.remove('hidden');
}

function hideStatusMessage() {
    DOM.statusMessage.classList.add('hidden');
}

function translateTypeName(type) {
    const map = {
        normal: 'Normal', fire: 'Fogo', water: 'Água', grass: 'Planta',
        electric: 'Elétrico', ice: 'Gelo', fighting: 'Luta', poison: 'Veneno',
        ground: 'Terra', flying: 'Voador', psychic: 'Psíquico', bug: 'Inseto',
        rock: 'Pedra', ghost: 'Fantasma', dragon: 'Dragão', dark: 'Noturno',
        steel: 'Aço', fairy: 'Fada'
    };
    return map[type] || type;
}

function translateStatName(stat) {
    const map = {
        hp: 'HP', attack: 'Ataque', defense: 'Defesa',
        'special-attack': 'Atq. Esp', 'special-defense': 'Def. Esp', speed: 'Velocidade'
    };
    return map[stat] || stat;
}
