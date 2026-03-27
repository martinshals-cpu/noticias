document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchForm = document.getElementById('search-form');
    const topicInput = document.getElementById('topic');
    const categorySelect = document.getElementById('category');
    const natCheckbox = document.getElementById('scope-national');
    const intCheckbox = document.getElementById('scope-international');
    
    const resultsGrid = document.getElementById('results-grid');
    const loader = document.getElementById('loader');
    const apiStatus = document.getElementById('api-status');
    const resultsTitle = document.getElementById('results-title');
    
    // Modal Elements
    const apiModal = document.getElementById('api-modal');
    const btnSettings = document.getElementById('btn-settings');
    const closeModal = document.getElementById('close-modal');
    const saveApiKeyBtn = document.getElementById('save-api-key');
    const useMockBtn = document.getElementById('use-mock-btn');
    const apiKeyInput = document.getElementById('api-key');
    
    // Check for saved API key
    let savedApiKey = localStorage.getItem('gnews_api_key');
    let usingMockData = false;
    
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    } else {
        // Show modal on first load if no key & not yet used mock
        setTimeout(() => {
            apiModal.classList.remove('hidden');
        }, 800);
    }
    
    // Event Listeners for Modal
    btnSettings.addEventListener('click', () => {
        apiModal.classList.remove('hidden');
    });
    
    closeModal.addEventListener('click', () => {
        apiModal.classList.add('hidden');
    });
    
    saveApiKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gnews_api_key', key);
            savedApiKey = key;
            usingMockData = false;
            apiModal.classList.add('hidden');
            
            // Re-run search if form is filled
            if (topicInput.value.trim()) {
                searchForm.dispatchEvent(new Event('submit'));
            }
        } else {
            alert('Por favor, insira uma chave API válida.');
        }
    });

    useMockBtn.addEventListener('click', () => {
        usingMockData = true;
        apiModal.classList.add('hidden');
        // Re-run search
        if (topicInput.value.trim()) {
            searchForm.dispatchEvent(new Event('submit'));
        }
    });

    // Ensure at least one checkbox is checked
    natCheckbox.addEventListener('change', () => {
        if (!natCheckbox.checked && !intCheckbox.checked) {
            intCheckbox.checked = true;
        }
    });

    intCheckbox.addEventListener('change', () => {
        if (!natCheckbox.checked && !intCheckbox.checked) {
            natCheckbox.checked = true;
        }
    });

    // Handle Form Submit
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const topic = topicInput.value.trim();
        const category = categorySelect.value;
        const isNational = natCheckbox.checked;
        const isInternational = intCheckbox.checked;
        
        if (!savedApiKey && !usingMockData) {
            apiModal.classList.remove('hidden');
            return;
        }

        fetchNews(topic, category, isNational, isInternational);
    });

    // Fetch News Function
    async function fetchNews(query, category, national, international) {
        // Prepare UI
        resultsGrid.innerHTML = '';
        loader.classList.remove('hidden');
        apiStatus.className = 'status-badge waiting';
        apiStatus.textContent = 'A pesquisar...';
        resultsTitle.textContent = `Resultados para "${query}"`;

        if (usingMockData) {
            // Simulate network delay for mock data
            setTimeout(() => {
                showMockData(query, national, international);
            }, 1200);
            return;
        }

        try {
            // Build the GNews API URL
            // Reference: https://gnews.io/docs/v4
            let url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&apikey=${savedApiKey}&max=12`;
            
            // Only add category if it's not "general" to broaden search
            if (category !== 'general') {
                url += `&category=${category}`;
            }

            // Scope logic
            if (national && !international) {
                // National restricted to Portugal
                url += '&country=pt&lang=pt';
            } else if (!national && international) {
                // International (avoid PT)
                url += '&lang=en';
            } else {
                // Both - generic search
            }

            const response = await fetch(url);
            const data = await response.json();

            loader.classList.add('hidden');

            if (!response.ok) {
                throw new Error(data.errors ? data.errors[0] : 'Erro desconhecido na API.');
            }

            displayResults(data.articles);
            
            apiStatus.className = 'status-badge success';
            apiStatus.textContent = `${data.articles.length} resultados encontrados`;
            
        } catch (error) {
            loader.classList.add('hidden');
            apiStatus.className = 'status-badge error';
            apiStatus.textContent = 'Erro ao buscar notícias';
            
            // Si o erro for de API Key, apagar
            if (error.message.toLowerCase().includes('apikey')) {
               localStorage.removeItem('gnews_api_key');
               savedApiKey = null;
            }
            
            resultsGrid.innerHTML = `
                <div class="empty-state" style="color: var(--danger);">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>Ocorreu um erro: ${error.message}</p>
                    <p style="font-size: 0.85rem; opacity: 0.8; margin-top: 10px;">Verifique a sua API Key ou use a opção de testes.</p>
                    <button class="btn-secondary mt-3" onclick="document.getElementById('api-modal').classList.remove('hidden')">Verificar Configurações</button>
                </div>
            `;
        }
    }

    // Display Results
    function displayResults(articles) {
        if (!articles || articles.length === 0) {
            resultsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-folder-open"></i>
                    <p>Nenhuma notícia encontrada para estes termos.</p>
                </div>
            `;
            return;
        }

        articles.forEach(article => {
            // Format date
            const date = new Date(article.publishedAt);
            const formattedDate = new Intl.DateTimeFormat('pt-PT', { 
                day: '2-digit', month: 'short', year: 'numeric' 
            }).format(date);

            // Default image if none
            const defaultImage = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=600&auto=format&fit=crop';
            const imageUrl = article.image || defaultImage;

            const card = document.createElement('a');
            card.href = article.url;
            card.target = '_blank';
            card.className = 'article-card';
            
            card.innerHTML = `
                <img src="${imageUrl}" alt="Imagem da notícia" class="article-img" onerror="this.src='${defaultImage}'">
                <div class="article-content">
                    <div class="article-meta">
                        <span>${formattedDate}</span>
                        <span class="source">${article.source.name}</span>
                    </div>
                    <h3 class="article-title">${article.title}</h3>
                    <p class="article-desc">${article.description || 'Sem descrição disponível para este artigo. Clique em ler mais para conferir na fonte oficial.'}</p>
                    <div class="article-footer">
                        <span class="read-more">Ler artigo <i class="fa-solid fa-arrow-right"></i></span>
                    </div>
                </div>
            `;
            
            resultsGrid.appendChild(card);
        });
    }

    // Mock Data Generator for testing without API Key
    function showMockData(query, national, international) {
        loader.classList.add('hidden');
        apiStatus.className = 'status-badge success';
        apiStatus.textContent = 'Modo de Teste: 3 resultados (Simulação)';

        const scopeLabel = national && !international ? "PT" : (international && !national ? "INT" : "PT/INT");

        const mockArticles = [
            {
                title: `As últimas novidades sobre ${query} reveladas num estudo inovador`,
                description: `Especialistas discutem o impacto de ${query} nos próximos meses e as alterações previstas para a indústria.`,
                image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
                publishedAt: new Date().toISOString(),
                source: { name: 'Tech Jornal ' + scopeLabel },
                url: '#'
            },
            {
                title: `Mercados reagem às notícias globais sobre ${query}`,
                description: `Investidores estão atentos às flutuações após o anúncio surpresa na manhã de hoje relacionado a ${query}.`,
                image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=600&auto=format&fit=crop',
                publishedAt: new Date(Date.now() - 86400000).toISOString(),
                source: { name: 'Económico ' + scopeLabel },
                url: '#'
            },
            {
                title: `Análise profunda: Porquê que ${query} está nas tendências?`,
                description: `Uma análise detalhada dos motivos que levaram a este tópico a ganhar imensa popularidade nas últimas semanas.`,
                image: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=600&auto=format&fit=crop',
                publishedAt: new Date(Date.now() - 172800000).toISOString(),
                source: { name: 'Revista Notícias ' + scopeLabel },
                url: '#'
            }
        ];

        displayResults(mockArticles);
    }
});
