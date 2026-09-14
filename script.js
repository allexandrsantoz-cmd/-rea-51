/* ============================================================
   AEROFILMES - NAVEGAÇÃO, MODAL, BUSCA, FILME SORTIDO E WATCHLIST
   ============================================================ */

const API_KEY = '57ccb7740aeac8418c4e316bc3b68ae9';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const LANGUAGE = 'pt-BR';

// Identifica a página atual pelo caminho da URL
const paginaAtualPath = window.location.pathname.split('/').pop() || 'index.html';

// Variáveis de controle
let paginaAPI = 1;
let carregando = false;
let endpointAtual = '';
let emModoBusca = false;

// 1. FUNÇÃO GENÉRICA DE BUSCA
async function buscarMidias(endpoint) {
  try {
    const separador = endpoint.includes('?') ? '&' : '?';
    const res = await fetch(`${BASE_URL}${endpoint}${separador}api_key=${API_KEY}&language=${LANGUAGE}`);
    if (!res.ok) throw new Error(`Erro: ${res.status}`);
    const dados = await res.json();
    return dados.results || [];
  } catch (erro) {
    console.error('Erro na API:', erro);
    return [];
  }
}

// 2. CRIAÇÃO DOS CARDS DE MÍDIA
function criarCard(item) {
  const card = document.createElement('article');
  card.classList.add('movie-card');
  const poster = item.poster_path ? `${IMG_BASE_URL}${item.poster_path}` : 'https://via.placeholder.com/500x750?text=Sem+Imagem';
  const titulo = item.title || item.name;

  card.innerHTML = `
    <div class="poster-container" onclick="abrirDetalhes(${item.id}, '${item.title ? 'movie' : 'tv'}')">
      <img src="${poster}" alt="${titulo}" class="movie-poster" loading="lazy">
    </div>
    <div class="movie-info">
      <h2 class="movie-title">${titulo}</h2>
      <div class="movie-actions">
        <button class="btn-action" onclick="abrirDetalhes(${item.id}, '${item.title ? 'movie' : 'tv'}')">Ver Detalhes</button>
        <button class="btn-action secondary" onclick="salvarmelist(${item.id})">+</button>
      </div>
    </div>
  `;
  return card;
}

// 3. LÓGICA DO FILME SORTIDO
async function sortearFilme() {
  try {
    const paginaAleatoria = Math.floor(Math.random() * 20) + 1;
    const filmes = await buscarMidias(`/discover/movie?sort_by=popularity.desc&page=${paginaAleatoria}`);
    
    if (filmes.length > 0) {
      const filmeSorteado = filmes[Math.floor(Math.random() * filmes.length)];
      abrirDetalhes(filmeSorteado.id, 'movie');
    } else {
      alert('Não foi possível sortear um filme agora. Tente novamente!');
    }
  } catch (erro) {
    console.error('Erro ao sortear filme:', erro);
  }
}

// 4. CARREGADOR ESPECÍFICO DE CADA PÁGINA
async function inicializarPagina() {
  const gridGeral = document.querySelector('.catalog-grid') || document.getElementById('catalogo-categoria');

  configurarFormularioPesquisa();

  // PÁGINA INICIAL (index.html)
  if (paginaAtualPath === 'index.html' || paginaAtualPath === '') {
    const [lancamentos, populares, recomendados] = await Promise.all([
      buscarMidias('/movie/now_playing'),
      buscarMidias('/movie/popular'),
      buscarMidias('/movie/top_rated')
    ]);

    const gridL = document.getElementById('catalogo-lancamentos');
    const gridP = document.getElementById('catalogo-populares');
    const gridR = document.getElementById('catalogo-recomendacoes');

    if (gridL) lancamentos.slice(0, 6).forEach(item => gridL.appendChild(criarCard(item)));
    if (gridP) populares.slice(0, 6).forEach(item => gridP.appendChild(criarCard(item)));
    if (gridR) recomendados.slice(0, 6).forEach(item => gridR.appendChild(criarCard(item)));
    return;
  }

  // PÁGINA DA WATCHLIST
  if (paginaAtualPath === 'melist.html') {
    await carregarmelist();
    return;
  }

  // PÁGINAS DE CATEGORIAS ESPECÍFICAS
  if (!gridGeral) return;
  gridGeral.innerHTML = '';

  switch (paginaAtualPath) {
    case 'filmes.html':
      endpointAtual = '/discover/movie?sort_by=popularity.desc';
      break;
    case 'series.html':
      endpointAtual = '/discover/tv?sort_by=popularity.desc';
      break;
    case 'animes.html':
      endpointAtual = '/discover/tv?with_genres=16&with_keywords=210024';
      break;
    case 'doc.html':
      endpointAtual = '/discover/movie?with_genres=99';
      break;
    case 'doramas.html':
      endpointAtual = '/discover/tv?with_genres=18&with_original_language=ko';
      break;
    case 'novel.html':
      endpointAtual = '/discover/tv?with_genres=10766';
      break;
    case 'curta.html':
      endpointAtual = '/discover/movie?with_genres=10751';
      break;
  }

  if (endpointAtual) {
    paginaAPI = 1;
    await carregarMaisItens();
    configurarObserverRolagem();
  }
}

// 5. CARREGADOR DA WATCHLIST (MINHA LISTA)
async function carregarmelist() {
  const gridWatchlist = document.getElementById('catalogo-melist') || document.querySelector('.catalog-grid');
  if (!gridWatchlist) return;

  gridWatchlist.innerHTML = '';
  const melistIds = JSON.parse(localStorage.getItem('melist')) || [];

  if (melistIds.length === 0) {
    gridWatchlist.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #fff;">
        <h3 style="font-size: 1.5rem; margin-bottom: 10px;">Sua lista está vazia!</h3>
        <p style="opacity: 0.8;">Navegue pelo catálogo e adicione os filmes ou séries que deseja assistir mais tarde.</p>
      </div>
    `;
    return;
  }

  for (const id of melistIds) {
    try {
      const res = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=${LANGUAGE}`);
      if (res.ok) {
        const item = await res.json();
        gridWatchlist.appendChild(criarCard(item));
      } else {
        const resTv = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=${LANGUAGE}`);
        if (resTv.ok) {
          const itemTv = await resTv.json();
          gridWatchlist.appendChild(criarCard(itemTv));
        }
      }
    } catch (erro) {
      console.error(`Erro ao carregar item ${id} da melist:`, erro);
    }
  }
}

// 6. BARRA DE PESQUISA
function configurarFormularioPesquisa() {
  const formPesquisa = document.querySelector('.form-pesquisa');
  if (!formPesquisa) return;

  formPesquisa.addEventListener('submit', async (e) => {
    e.preventDefault();
    const campo = document.getElementById('campo-pesquisa');
    if (!campo) return;

    const termo = campo.value.trim();
    if (!termo) return;

    await executarPesquisa(termo);
  });
}

async function executarPesquisa(termo) {
  const gridGeral = document.querySelector('.catalog-grid') || document.getElementById('catalogo-categoria');
  if (!gridGeral) return;

  emModoBusca = true;
  gridGeral.innerHTML = '';

  const resultados = await buscarMidias(`/search/multi?query=${encodeURIComponent(termo)}`);
  const resultadosFiltrados = resultados.filter(item => item.media_type === 'movie' || item.media_type === 'tv');

  if (resultadosFiltrados.length === 0) {
    gridGeral.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #fff;">
        <h3 style="font-size: 1.5rem; margin-bottom: 10px;">Nenhum resultado encontrado</h3>
        <p style="opacity: 0.8;">Não encontramos títulos para "<strong>${termo}</strong>". Tente buscar por outro termo.</p>
      </div>
    `;
    return;
  }

  resultadosFiltrados.forEach(item => gridGeral.appendChild(criarCard(item)));
}

// 7. ROLAGEM INFINITA
async function carregarMaisItens() {
  if (carregando || emModoBusca) return;
  carregando = true;

  const gridGeral = document.querySelector('.catalog-grid') || document.getElementById('catalogo-categoria');
  const resultados = await buscarMidias(`${endpointAtual}&page=${paginaAPI}`);

  if (resultados.length > 0 && gridGeral) {
    resultados.forEach(item => gridGeral.appendChild(criarCard(item)));
    paginaAPI++;
  }

  carregando = false;
}

function configurarObserverRolagem() {
  const sentinela = document.getElementById('sentinela-rolagem');
  if (!sentinela) return;

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !carregando && !emModoBusca) {
      carregarMaisItens();
    }
  }, { rootMargin: '300px' });

  observer.observe(sentinela);
}

// 8. MODAL DE DETALHES + PÔSTER, WATCHLIST, COMENTÁRIOS E NOTAS
async function abrirDetalhes(id, tipo = 'movie') {
  try {
    const res = await fetch(`${BASE_URL}/${tipo}/${id}?api_key=${API_KEY}&language=${LANGUAGE}`);
    const item = await res.json();
    
    const avaliacaoSalva = localStorage.getItem(`rating_${id}`) || '0';
    const comentariosSalvos = JSON.parse(localStorage.getItem(`comments_${id}`)) || [];
    const poster = item.poster_path ? `${IMG_BASE_URL}${item.poster_path}` : 'https://via.placeholder.com/500x750?text=Sem+Imagem';

    const modal = document.createElement('div');
    modal.id = 'modal-detalhes';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);z-index:2000;display:flex;justify-content:center;align-items:center;padding:20px;box-sizing:border-box;';

    modal.innerHTML = `
      <div style="background:var(--bg-deep-space, #111);border:2px solid var(--neon-blue, #00f0ff);border-radius:25px;max-width:700px;width:100%;max-height:90vh;overflow-y:auto;padding:25px;position:relative;color:#fff;box-shadow:0 0 20px var(--neon-blue, #00f0ff);">
        <button onclick="fecharModal()" style="position:absolute;top:15px;right:15px;background:var(--neon-pink, #ff007f);border:none;color:#fff;padding:5px 12px;border-radius:50%;cursor:pointer;font-weight:bold;">X</button>
        
        <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:15px;align-items:flex-start;">
          <img src="${poster}" alt="${item.title || item.name}" style="width:140px;border-radius:12px;box-shadow:0 0 10px rgba(0,0,0,0.5);">
          
          <div style="flex:1;min-width:200px;">
            <h2 style="margin-top:0;">${item.title || item.name}</h2>
            <p><strong>Lançamento:</strong> ${item.release_date || item.first_air_date || 'N/A'}</p>
            <p><strong>Nota:</strong> ⭐ ${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</p>
            
            <button onclick="salvarmelist(${item.id})" class="btn-action" style="margin-top:10px;">
              + Adicionar à Lista
            </button>
          </div>
        </div>

        <p><strong>Sinopse:</strong> ${item.overview || 'Sinopse não disponível.'}</p>
        
        <hr style="border-color:var(--glass-border, #333);margin:15px 0;">

        <h3>Sua Avaliação:</h3>
        <select onchange="salvarRating(${id}, this.value)" style="padding:8px;border-radius:10px;background:#000;color:var(--neon-aqua, #00f0ff);border:1px solid var(--neon-blue, #00f0ff);">
          <option value="0" ${avaliacaoSalva === '0' ? 'selected' : ''}>Selecione uma nota</option>
          <option value="1" ${avaliacaoSalva === '1' ? 'selected' : ''}>⭐ 1 - Ruim</option>
          <option value="3" ${avaliacaoSalva === '3' ? 'selected' : ''}>⭐⭐⭐ 3 - Bom</option>
          <option value="5" ${avaliacaoSalva === '5' ? 'selected' : ''}>⭐⭐⭐⭐⭐ 5 - Excelente</option>
        </select>

        <hr style="border-color:var(--glass-border, #333);margin:15px 0;">

        <h3>Comentários:</h3>
        <div id="lista-comentarios" style="max-height:150px;overflow-y:auto;margin-bottom:10px;text-align:left;">
          ${comentariosSalvos.length ? comentariosSalvos.map(c => `<p style="background:rgba(255,255,255,0.05);padding:8px;border-radius:8px;">💬 ${c}</p>`).join('') : '<p>Nenhum comentário ainda.</p>'}
        </div>
        
        <div style="display:flex;gap:10px;">
          <input type="text" id="input-comentario" placeholder="Escreva seu comentário..." style="flex:1;padding:8px;border-radius:10px;border:1px solid var(--glass-border, #333);background:rgba(0,0,0,0.5);color:#fff;">
          <button onclick="adicionarComentario(${id})" class="btn-action">Enviar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (err) {
    console.error('Erro ao abrir detalhes:', err);
  }
}

function fecharModal() {
  const m = document.getElementById('modal-detalhes');
  if (m) m.remove();
}

function salvarRating(id, nota) {
  localStorage.setItem(`rating_${id}`, nota);
}

function adicionarComentario(id) {
  const input = document.getElementById('input-comentario');
  const texto = input.value.trim();
  if (!texto) return;

  const comentarios = JSON.parse(localStorage.getItem(`comments_${id}`)) || [];
  comentarios.push(texto);
  localStorage.setItem(`comments_${id}`, JSON.stringify(comentarios));

  const lista = document.getElementById('lista-comentarios');
  lista.innerHTML += `<p style="background:rgba(255,255,255,0.05);padding:8px;border-radius:8px;">💬 ${texto}</p>`;
  input.value = '';
}

function salvarmelist(id) {
  let melist = JSON.parse(localStorage.getItem('melist')) || [];
  if (!melist.includes(id)) {
    melist.push(id);
    localStorage.setItem('melist', JSON.stringify(melist));
    alert('Adicionado à sua lista!');
  } else {
    alert('Este item já está na sua lista!');
  }
}

document.addEventListener('DOMContentLoaded', inicializarPagina);
