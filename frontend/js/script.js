// Espera o DOM carregar completamente antes de executar o script
document.addEventListener('DOMContentLoaded', () => {
    // --- Constantes & Estado Global ---
    const LOCAL_STORAGE_BASE_KEY = 'abaplay.v3';
    const API_BASE_URL = 'https://abaplay-backend.onrender.com/api'; // Certifique-se que esta URL está correta

    // Variáveis de estado global
    let allProgramsData = {}; // Armazena os dados de programs.json
    let currentActiveArea = 'Psicologia'; // Área terapêutica padrão
    let patients = []; // Lista de pacientes (para terapeutas)
    let selectedPatient = null; // Paciente selecionado pelo terapeuta
    let selectedProgramForProgress = null; // Programa selecionado para ver/registrar progresso
    let currentView = 'clients-view'; // View padrão ao carregar
    let progressChartInstance = null; // Instância do gráfico de progresso de um programa
    let consolidatedChartInstances = {}; // Instâncias dos gráficos para relatórios consolidados
    let isAuthenticated = false; // Estado de autenticação
    let currentUser = null; // Dados do usuário logado (incluindo role e associated_patient_id)
    let authToken = null; // Token JWT

    // --- Seletores de Elementos DOM ---
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginErrorMessage = document.getElementById('login-error-message');
    const appMainInterface = document.getElementById('app-main-interface');

    const topNavLinks = document.querySelectorAll('nav .nav-link');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const hamburgerIcon = document.getElementById('hamburger-icon');
    const closeIcon = document.getElementById('close-icon');
    const mobileNavLinks = document.querySelectorAll('#mobile-menu .nav-link-mobile');
    const mobileLogoutButton = document.getElementById('mobile-logout-button');

    const views = document.querySelectorAll('#main-content-area .view');
    const mainContentArea = document.getElementById('main-content-area');

    const loggedInUsernameSpan = document.getElementById('logged-in-username');
    const userAvatarDiv = document.getElementById('user-avatar');
    const mobileLoggedInUsernameSpan = document.getElementById('mobile-logged-in-username');
    const mobileUserAvatarDiv = document.getElementById('mobile-user-avatar');
    const logoutButton = document.getElementById('logout-button');

    const currentClientIndicator = document.getElementById('current-client-indicator');
    const mobileCurrentClientIndicator = document.getElementById('mobile-current-client-indicator');

    const contextualSidebar = document.getElementById('contextual-sidebar');
    const sidebarSections = contextualSidebar.querySelectorAll('.sidebar-section');
    const clientSidebarSection = document.getElementById('sidebar-content-clients');
    const clientListUl = document.getElementById('client-list');
    const noClientsMessageLi = clientListUl.querySelector('.no-clients-message');
    const clientSearchInput = document.getElementById('client-search');
    const showAddClientFormBtn = document.getElementById('show-add-client-form-btn');
    const patientCountIndicator = document.getElementById('patient-count-indicator');

    const addClientPanel = document.getElementById('add-client-panel');
    const addClientForm = document.getElementById('add-client-form');
    const addClientFormTitle = addClientPanel.querySelector('h2');
    const addClientFormSubmitBtn = addClientForm.querySelector('button[type="submit"]');
    const closeAddClientPanelBtn = document.getElementById('close-add-client-panel-btn');
    const clientNameInput = document.getElementById('client-name');
    const clientDobInput = document.getElementById('client-dob');
    const clientDiagnosisInput = document.getElementById('client-diagnosis');
    const clientNotesInput = document.getElementById('client-notes');

    const clientDetailsPanel = document.getElementById('client-details-panel');
    const noClientSelectedPlaceholder = document.getElementById('no-client-selected-placeholder');
    const triggerAddClientFormBtn = document.getElementById('trigger-add-client-form-btn');
    const detailClientNameSpan = document.getElementById('detail-client-name');
    const detailClientIdSpan = document.getElementById('detail-client-id');
    const detailClientDobSpan = document.getElementById('detail-client-dob');
    const detailClientDiagnosisSpan = document.getElementById('detail-client-diagnosis');
    const detailClientNotesSpan = document.getElementById('detail-client-notes');
    const assignedProgramsListUl = document.getElementById('assigned-programs-list');
    const noAssignedProgramsLi = assignedProgramsListUl.querySelector('.no-assigned-programs');
    const editClientBtn = document.getElementById('edit-client-btn');
    const deleteClientBtn = document.getElementById('delete-client-btn');
    const generateClientGradePdfBtn = document.getElementById('generate-client-grade-pdf');
    const generateClientRecordPdfBtn = document.getElementById('generate-client-record-pdf');
    const generateConsolidatedReportBtn = document.getElementById('generate-consolidated-report-btn');

    const programSidebarSection = document.getElementById('sidebar-content-programs');
    const programSearchInput = document.getElementById('program-search');
    const programCategoriesContainer = document.getElementById('program-categories');
    const programLibraryListDiv = document.getElementById('program-library-list');
    const noProgramsMessage = document.getElementById('no-programs-message');
    const programViewPlaceholder = document.getElementById('program-view-placeholder');
    const programSidebarTitle = programSidebarSection.querySelector('h3');

    const sessionProgressSectionDiv = document.getElementById('session-progress-section');
    const progressDetailsAreaDiv = document.getElementById('progress-details-area');

    const notesView = document.getElementById('notes-view');
    const notesViewTextarea = document.getElementById('notes-textarea');
    const saveNotesBtn = document.getElementById('save-notes-btn');
    const notesPlaceholder = notesView.querySelector('.notes-placeholder');

    const dashboardView = document.getElementById('dashboard-view'); // View geral do terapeuta
    const clientDashboardContent = document.getElementById('client-dashboard-content'); // Conteúdo específico do cliente no dashboard do terapeuta
    const generalDashboardContent = document.getElementById('dashboard-content'); // Conteúdo do dashboard geral do terapeuta

    const parentDashboardView = document.getElementById('parent-dashboard-view'); // Nova view para pais
    const parentDashboardContent = document.getElementById('parent-dashboard-content'); // Conteúdo do dashboard dos pais

    const consolidatedReportModal = document.getElementById('consolidated-report-modal');
    const consolidatedReportTitle = document.getElementById('consolidated-report-title');
    const consolidatedReportPrintTitle = document.getElementById('consolidated-report-print-title');
    const consolidatedReportClientNamePrint = document.getElementById('consolidated-report-client-name-print');
    const consolidatedReportClientIdPrint = document.getElementById('consolidated-report-client-id-print');
    const consolidatedChartsContainer = document.getElementById('consolidated-charts-container');
    const printConsolidatedReportBtn = document.getElementById('print-consolidated-report-btn');
    const closeModalBtns = consolidatedReportModal.querySelectorAll('.close-modal-btn, #close-consolidated-modal-btn');


    // --- Funções Utilitárias de Autenticação ---
    function saveAuthToken(token) { localStorage.setItem(`${LOCAL_STORAGE_BASE_KEY}_token`, token); authToken = token; }
    function getAuthToken() { return localStorage.getItem(`${LOCAL_STORAGE_BASE_KEY}_token`); }
    function removeAuthToken() { localStorage.removeItem(`${LOCAL_STORAGE_BASE_KEY}_token`); authToken = null; }
    function saveUserData(userData) { localStorage.setItem(`${LOCAL_STORAGE_BASE_KEY}_user`, JSON.stringify(userData)); currentUser = userData; }
    function getUserData() { const userDataJson = localStorage.getItem(`${LOCAL_STORAGE_BASE_KEY}_user`); try { return userDataJson ? JSON.parse(userDataJson) : null; } catch (e) { console.error("Erro ao analisar dados do usuário:", e); removeUserData(); return null; } }
    function removeUserData() { localStorage.removeItem(`${LOCAL_STORAGE_BASE_KEY}_user`); currentUser = null; }

    // --- Inicialização ---
    function initializeApp() {
        console.log("ABAplay v3.9.1 (Parent Nav Cleanup) - Inicializando...");
        loginForm.addEventListener('submit', handleLogin);
        logoutButton.addEventListener('click', handleLogout);
        mobileLogoutButton.addEventListener('click', handleLogout);

        if (mobileMenuButton) {
            mobileMenuButton.addEventListener('click', () => toggleMobileMenu());
        }
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                handleNavClick(e);
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    toggleMobileMenu(false); // Fecha o menu após o clique
                }
            });
        });
         // Fechar menu mobile se clicar fora
        document.addEventListener('click', (event) => {
            const isClickInsideMenu = mobileMenu && mobileMenu.contains(event.target);
            const isClickOnMenuButton = mobileMenuButton && mobileMenuButton.contains(event.target);
            if (mobileMenu && !mobileMenu.classList.contains('hidden') && !isClickInsideMenu && !isClickOnMenuButton) {
                toggleMobileMenu(false);
            }
        });
        
        closeModalBtns.forEach(btn => btn.addEventListener('click', closeConsolidatedReportModal));
        consolidatedReportModal.addEventListener('click', (e) => { 
            if (e.target === consolidatedReportModal) { // Fecha se clicar no backdrop
                closeConsolidatedReportModal();
            }
        });
        
        printConsolidatedReportBtn.addEventListener('click', () => { 
            if (currentUser && currentUser.role === 'terapeuta' && selectedPatient) {
                generateConsolidatedReportPDF(selectedPatient); // Função de PDF para terapeutas
            } else if (currentUser && currentUser.role === 'pai' && parentDashboardView && !parentDashboardView.classList.contains('hidden')) {
                // Para pais, a impressão será da view do dashboard deles
                // Futuramente, chamará generateParentReportPDF(data)
                window.print(); 
            } else {
                alert("Selecione um cliente ou esteja na tela de acompanhamento para imprimir.");
            }
        });

        tryRestoringSession();
    }

    // --- Tentativa de Restaurar Sessão ---
    function tryRestoringSession() {
        authToken = getAuthToken();
        currentUser = getUserData();
        if (authToken && currentUser) {
            console.log(`Sessão restaurada para ${currentUser.username} (Role: ${currentUser.role}).`);
            isAuthenticated = true;
            startAuthenticatedSession();
        } else {
            console.log("Nenhuma sessão ativa. Exibindo login.");
            showLoginScreen();
        }
    }

    // --- Controle de Estado da Interface ---
    function showLoginScreen() { isAuthenticated = false; currentUser = null; authToken = null; loginModal.classList.remove('hidden'); appMainInterface.classList.add('hidden'); loginForm.reset(); loginErrorMessage.textContent = ''; if(usernameInput) usernameInput.focus(); if (mobileMenu) mobileMenu.classList.add('hidden'); if(hamburgerIcon) hamburgerIcon.classList.remove('hidden'); if(closeIcon) closeIcon.classList.add('hidden');}
    function showMainAppScreen() { loginModal.classList.add('hidden'); appMainInterface.classList.remove('hidden'); appMainInterface.classList.add('flex'); }

    // --- Lógica do Menu Mobile ---
    function toggleMobileMenu(forceState) {
        if (!mobileMenu || !hamburgerIcon || !closeIcon) return;
        const isOpen = typeof forceState !== 'undefined' ? !forceState : mobileMenu.classList.contains('hidden');

        if (isOpen) { // Abrir menu
            mobileMenu.classList.remove('hidden');
            hamburgerIcon.classList.add('hidden');
            closeIcon.classList.remove('hidden');
            mobileMenuButton.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden'; // Previne scroll do body
            if (contextualSidebar && window.innerWidth < 768) contextualSidebar.classList.add('hidden'); // Esconde sidebar se aberta
        } else { // Fechar menu
            mobileMenu.classList.add('hidden');
            hamburgerIcon.classList.remove('hidden');
            closeIcon.classList.add('hidden');
            mobileMenuButton.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = ''; // Restaura scroll do body
            if (currentUser && currentUser.role === 'terapeuta') { // Só mostra sidebar contextual para terapeutas
                updateContextualSidebar(currentView, currentActiveArea);
            }
        }
    }

    // --- Autenticação ---
    async function handleLogin(e) {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        loginErrorMessage.textContent = '';
        const submitButton = loginForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Entrando...';
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify({ username, password }), });
            const data = await response.json();
            if (response.ok) {
                console.log('Login bem-sucedido:', data);
                isAuthenticated = true;
                saveAuthToken(data.token);
                saveUserData(data.user);
                startAuthenticatedSession();
            } else {
                console.warn('Falha no login:', data.errors?.[0]?.msg || response.statusText);
                loginErrorMessage.textContent = data.errors?.[0]?.msg || `Erro ${response.status}`;
                passwordInput.value = '';
                usernameInput.select();
            }
        } catch (error) {
            console.error('Erro de rede no login:', error);
            loginErrorMessage.textContent = 'Erro de conexão.';
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
        }
    }

    function handleLogout() {
        console.log(`Logout para: ${currentUser?.username}`);
        isAuthenticated = false;
        removeAuthToken();
        removeUserData();
        patients = [];
        selectedPatient = null;
        selectedProgramForProgress = null;
        currentView = 'clients-view'; 
        currentActiveArea = 'Psicologia';
        if (progressChartInstance) progressChartInstance.destroy();
        Object.values(consolidatedChartInstances).forEach(chart => chart.destroy());
        progressChartInstance = null;
        consolidatedChartInstances = {};
        resetUIForLogout();
        showLoginScreen();
        console.log("Sessão encerrada.");
    }

    // --- Inicialização Pós-Login ---
    async function startAuthenticatedSession() {
        if (!isAuthenticated || !currentUser) {
            console.error("Tentativa de iniciar sessão sem autenticação.");
            showLoginScreen();
            return;
        }
        showMainAppScreen();
        updateUserInfoDisplay();
        await loadProgramsData();
        setupMainEventListeners();

        if (currentUser.role === 'pai') {
            console.log("Usuário é um PAI. Carregando dashboard do pai...");
            currentView = 'parent-dashboard-view';
            hideTherapistFeatures(); // Esconde funcionalidades de terapeuta e ajusta nav para pais
            await loadParentDashboardData();
        } else if (currentUser.role === 'terapeuta') {
            console.log("Usuário é um TERAPEUTA. Carregando interface de terapeuta...");
            currentView = 'clients-view';
            showTherapistFeatures(); // Mostra funcionalidades de terapeuta
            await loadUserPatientsFromAPI();
            renderClientList();
            updatePatientCountDisplay();
            updateCurrentClientIndicator();
            if (patients.length > 0) {
                displayNoClientSelected(); 
            } else {
                displayNoClientSelected();
            }
        } else {
            console.error("Papel de usuário desconhecido:", currentUser.role);
            handleLogout();
            return;
        }
        // A view inicial é definida acima, agora chamamos switchView para renderizar
        switchView(currentView, { area: currentActiveArea });
        console.log(`Sessão iniciada para ${currentUser.username}. Papel: ${currentUser.role}. View inicial: ${currentView}. Área ativa: ${currentActiveArea}`);
    }

    // --- Funções para adaptar UI baseada no papel ---
    function hideTherapistFeatures() { // Chamado quando o usuário é 'pai'
        const viewsToHideForParents = ['clients-view', 'notes-view', 'programs-view', 'dashboard-view', 'tip-guide-view'];
        
        topNavLinks.forEach(link => {
            const view = link.dataset.view;
            if (viewsToHideForParents.includes(view)) {
                link.classList.add('hidden');
            }
            if (view === 'parent-dashboard-view') {
                link.classList.remove('hidden'); // Garante que "Acompanhamento" seja visível
            }
        });
        mobileNavLinks.forEach(link => {
            const view = link.dataset.view;
            if (viewsToHideForParents.includes(view)) {
                link.classList.add('hidden');
            }
            if (view === 'parent-dashboard-view') {
                link.classList.remove('hidden'); // Garante que "Acompanhamento" seja visível
            }
        });
        
        if (contextualSidebar) contextualSidebar.classList.add('hidden');
        if (currentClientIndicator) currentClientIndicator.textContent = `Acompanhamento`;
        if (mobileCurrentClientIndicator) mobileCurrentClientIndicator.textContent = `Acompanhamento`;
        if (patientCountIndicator) patientCountIndicator.classList.add('hidden');
        if (showAddClientFormBtn) showAddClientFormBtn.classList.add('hidden');
    }

    function showTherapistFeatures() { // Chamado quando o usuário é 'terapeuta'
        const viewsToShowForTherapists = ['clients-view', 'notes-view', 'programs-view', 'dashboard-view', 'tip-guide-view'];

        topNavLinks.forEach(link => {
            const view = link.dataset.view;
            const area = link.dataset.area;
            if ((viewsToShowForTherapists.includes(view) && view !== 'programs-view') || (view === 'programs-view' && area)) {
                link.classList.remove('hidden');
            }
            if (view === 'parent-dashboard-view') {
                link.classList.add('hidden'); // Esconde "Acompanhamento" para terapeutas
            }
        });
        mobileNavLinks.forEach(link => {
            const view = link.dataset.view;
            const area = link.dataset.area;
            if ((viewsToShowForTherapists.includes(view) && view !== 'programs-view') || (view === 'programs-view' && area)) {
                link.classList.remove('hidden');
            }
            if (view === 'parent-dashboard-view') {
                link.classList.add('hidden');
            }
        });
        if (contextualSidebar) contextualSidebar.classList.remove('hidden');
        if (patientCountIndicator) patientCountIndicator.classList.remove('hidden');
        if (showAddClientFormBtn) showAddClientFormBtn.classList.remove('hidden');
    }
    
    // --- Carregar dados para o dashboard do pai ---
    async function loadParentDashboardData() {
        if (!currentUser || currentUser.role !== 'pai' || !currentUser.associated_patient_id) {
            console.error("Não é possível carregar dados do dashboard do pai: usuário inválido ou sem paciente associado.");
            if (parentDashboardContent) parentDashboardContent.innerHTML = '<div class="placeholder-container text-red-500"><i class="fas fa-exclamation-circle"></i><p>Erro ao carregar dados da criança.</p></div>';
            return;
        }

        console.log(`Buscando dados para o paciente associado ID: ${currentUser.associated_patient_id}`);
        if (parentDashboardContent) parentDashboardContent.innerHTML = '<div class="text-center py-10 placeholder-container"><i class="fas fa-spinner fa-spin text-3xl text-indigo-600"></i><p class="mt-2 text-gray-600">Carregando dados do progresso...</p></div>';

        try {
            const response = await fetch(`${API_BASE_URL}/parent/dashboard-data`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json(); 
                console.log("Dados do dashboard do pai recebidos:", data);
                if (data && data.patient) {
                    renderParentConsolidatedView(data.patient, data.sessionData || [], data.assigned_program_ids || []);
                } else {
                    throw new Error("Dados do paciente não retornados pela API.");
                }
            } else if (response.status === 401 || response.status === 403) {
                alert("Sessão expirada ou acesso negado. Faça login novamente.");
                handleLogout();
            } else {
                const errorData = await response.json().catch(() => ({ error: "Erro desconhecido ao buscar dados." }));
                console.error(`Erro ${response.status} ao buscar dados do dashboard do pai:`, errorData.error);
                if (parentDashboardContent) parentDashboardContent.innerHTML = `<div class="placeholder-container text-red-500"><i class="fas fa-exclamation-circle"></i><p>Falha ao carregar dados: ${errorData.error}</p></div>`;
            }
        } catch (error) {
            console.error("Erro de rede ao buscar dados do dashboard do pai:", error);
            if (parentDashboardContent) parentDashboardContent.innerHTML = '<div class="placeholder-container text-red-500"><i class="fas fa-exclamation-circle"></i><p>Erro de conexão ao carregar dados.</p></div>';
        }
    }

    function renderParentConsolidatedView(patientData, sessionDataArray, assignedProgramIdsArray) {
        if (!parentDashboardContent || !patientData) {
            console.error("Elemento parentDashboardContent ou dados do paciente não encontrados para renderização.");
            if(parentDashboardContent) parentDashboardContent.innerHTML = '<div class="placeholder-container text-red-500"><i class="fas fa-exclamation-circle"></i><p>Não foi possível exibir os dados.</p></div>';
            return;
        }
    
        parentDashboardContent.innerHTML = ''; 
        Object.values(consolidatedChartInstances).forEach(chart => chart.destroy());
        consolidatedChartInstances = {};
    
        const header = document.createElement('div');
        header.className = 'mb-6 p-4 bg-white rounded-lg shadow border border-gray-200';
        header.innerHTML = `
            <h1 class="text-2xl font-semibold text-gray-800 mb-2">Acompanhamento de ${patientData.name}</h1>
            <p class="text-sm text-gray-600">Progresso nos programas de intervenção.</p>
            <p class="text-xs text-gray-500 mt-1">ID do Paciente: ${patientData.id}</p>
        `;
        parentDashboardContent.appendChild(header);
    
        const chartsGrid = document.createElement('div');
        chartsGrid.id = 'parent-charts-grid'; 
        chartsGrid.className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5';
        parentDashboardContent.appendChild(chartsGrid);
    
        if (!assignedProgramIdsArray || assignedProgramIdsArray.length === 0) {
            chartsGrid.innerHTML = '<p class="text-center text-gray-500 py-6 col-span-full placeholder-container"><i class="fas fa-folder-open"></i><span>Nenhum programa atribuído para visualização.</span></p>';
            return;
        }
    
        const assignedProgramsDetails = assignedProgramIdsArray.map(id => getProgramById(id)).filter(p => p).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
    
        if (assignedProgramsDetails.length === 0) {
            chartsGrid.innerHTML = '<p class="text-center text-gray-500 py-6 col-span-full placeholder-container"><i class="fas fa-exclamation-triangle"></i><span>Detalhes dos programas atribuídos não puderam ser carregados.</span></p>';
            return;
        }
    
        assignedProgramsDetails.forEach((program, index) => {
            const chartId = `parent-consolidated-chart-${program.id}-${index}`; 
            const wrapper = document.createElement('div');
            wrapper.className = 'parent-consolidated-chart-wrapper border border-gray-200 rounded-md p-4 bg-gray-50 flex flex-col items-center shadow-sm';
            wrapper.innerHTML = `
                <h4 class="text-sm font-medium text-gray-600 mb-2 text-center">${program.title} <span class="text-xs text-gray-500">(${program.tag || 'N/A'})</span></h4>
                <div class="w-full h-48 sm:h-56 relative"> <canvas id="${chartId}"></canvas> </div>
                <p class="no-data-message text-xs text-gray-500 italic mt-2 hidden">Nenhum dado de sessão para este programa.</p>`;
            chartsGrid.appendChild(wrapper);
            renderSingleConsolidatedChartForParent(sessionDataArray, program.id, chartId);
        });
    }
    
    function renderSingleConsolidatedChartForParent(allPatientSessions, programId, canvasId) {
        const canvas = document.getElementById(canvasId);
        const canvasContainer = canvas?.parentElement;
        const noDataMsg = canvasContainer?.parentElement.querySelector('.no-data-message'); 
    
        if (!canvas || !canvasContainer || !noDataMsg) {
            console.warn(`Elementos do gráfico consolidado do pai não encontrados para ${canvasId}`);
            return;
        }
    
        const programSpecificSessions = (allPatientSessions || [])
            .filter(session => String(session.program_id || session.programId) === String(programId))
            .sort((a, b) => new Date(a.session_date || a.date) - new Date(b.session_date || b.date))
            .map(s => ({ ...s, score: parseFloat(s.score) }));
    
        if (programSpecificSessions.length === 0) {
            noDataMsg.classList.remove('hidden');
            canvasContainer.style.display = 'none';
            return;
        }
        noDataMsg.classList.add('hidden');
        canvasContainer.style.display = 'block';
    
        const dates = programSpecificSessions.map(session => formatDate(session.session_date || session.date, 'short'));
        const scores = programSpecificSessions.map(session => session.score);
        const pointStyles = programSpecificSessions.map(session => (session.is_baseline || session.isBaseline) ? 'rect' : 'circle');
        const pointBackgroundColors = programSpecificSessions.map(session => (session.is_baseline || session.isBaseline) ? '#fbbf24' : '#4f46e5'); 
        const pointRadii = programSpecificSessions.map(session => (session.is_baseline || session.isBaseline) ? 3 : 2.5); 
    
        const ctx = canvas.getContext('2d');
        const primaryColor = '#4f46e5', baselineColor = '#fbbf24', primaryLight = 'rgba(79, 70, 229, 0.05)', textColor = '#4b5563', gridColor = '#e5e7eb';
    
        if (consolidatedChartInstances[canvasId]) {
            consolidatedChartInstances[canvasId].destroy();
        }
    
        consolidatedChartInstances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Pontuação (%)',
                    data: scores,
                    borderColor: primaryColor,
                    backgroundColor: primaryLight,
                    pointStyle: pointStyles,
                    pointBackgroundColor: pointBackgroundColors,
                    pointRadius: pointRadii,
                    pointBorderColor: '#fff', 
                    fill: true,
                    tension: 0.1, 
                    borderWidth: 1.5,
                    pointHoverRadius: pointRadii.map(r => r + 2)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { color: textColor, font: { size: 9 } }, grid: { color: gridColor, drawBorder: false } },
                    x: { ticks: { color: textColor, font: { size: 9 }, maxRotation: 0, autoSkipPadding: 10 }, grid: { display: false } }
                },
                plugins: {
                    legend: { display: false }, 
                    tooltip: {
                        backgroundColor: '#1f2937', titleColor: '#fff', bodyColor: '#fff', padding: 8, cornerRadius: 3, displayColors: true,
                        borderColor: (tooltipItem) => { const index = tooltipItem.tooltip.dataPoints[0].dataIndex; if (index < 0 || index >= programSpecificSessions.length) return primaryColor; return (programSpecificSessions[index]?.is_baseline || programSpecificSessions[index]?.isBaseline) ? baselineColor : primaryColor; },
                        borderWidth: 1,
                        callbacks: {
                            title: (tooltipItems) => { const index = tooltipItems[0].dataIndex; if(index < 0 || index >= programSpecificSessions.length) return ''; const session = programSpecificSessions[index]; const prefix = (session.is_baseline || session.isBaseline) ? '[Linha de Base] ' : ''; return `${prefix}${formatDate(session.session_date || session.date)}`; },
                            label: (context) => `Pontuação: ${context.parsed.y}%`,
                            labelColor: function(context) { const index = context.dataIndex; if(index < 0 || index >= programSpecificSessions.length) return { borderColor: primaryColor, backgroundColor: primaryColor }; const isBaseline = programSpecificSessions[index].is_baseline || programSpecificSessions[index].isBaseline; return { borderColor: isBaseline ? baselineColor : primaryColor, backgroundColor: isBaseline ? baselineColor : primaryColor, borderWidth: 2, borderRadius: isBaseline ? 0 : '50%' }; },
                        }
                    }
                }
            }
        });
    }


    // --- Configuração de Listeners ---
    function setupMainEventListeners() {
        topNavLinks.forEach(link => { link.removeEventListener('click', handleNavClick); link.addEventListener('click', handleNavClick); });
        
        if (currentUser && currentUser.role === 'terapeuta') {
            if (clientSearchInput) { clientSearchInput.removeEventListener('input', handleClientSearch); clientSearchInput.addEventListener('input', handleClientSearch); }
            if (showAddClientFormBtn) { showAddClientFormBtn.removeEventListener('click', handleShowAddClientForm); showAddClientFormBtn.addEventListener('click', handleShowAddClientForm); }
            if (closeAddClientPanelBtn) { closeAddClientPanelBtn.removeEventListener('click', handleCloseAddClientPanel); closeAddClientPanelBtn.addEventListener('click', handleCloseAddClientPanel); }
            if (triggerAddClientFormBtn) { triggerAddClientFormBtn.removeEventListener('click', handleTriggerAddClientForm); triggerAddClientFormBtn.addEventListener('click', handleTriggerAddClientForm); }
            if (clientListUl) { clientListUl.removeEventListener('click', handleClientListClick); clientListUl.addEventListener('click', handleClientListClick); }
            if (addClientForm) { addClientForm.removeEventListener('submit', handleAddOrEditClientSubmit); addClientForm.addEventListener('submit', handleAddOrEditClientSubmit); }
            if (editClientBtn) { editClientBtn.removeEventListener('click', handleEditClient); editClientBtn.addEventListener('click', handleEditClient); }
            if (deleteClientBtn) { deleteClientBtn.removeEventListener('click', handleDeleteClient); deleteClientBtn.addEventListener('click', handleDeleteClient); }
            
            if (generateClientGradePdfBtn) { generateClientGradePdfBtn.removeEventListener('click', handleGenerateGradePdf); generateClientGradePdfBtn.addEventListener('click', handleGenerateGradePdf); }
            if (generateClientRecordPdfBtn) { generateClientRecordPdfBtn.removeEventListener('click', handleGenerateRecordPdf); generateClientRecordPdfBtn.addEventListener('click', handleGenerateRecordPdf); }
            if (generateConsolidatedReportBtn) { generateConsolidatedReportBtn.removeEventListener('click', openConsolidatedReportModal); generateConsolidatedReportBtn.addEventListener('click', openConsolidatedReportModal); }
            
            if (programSearchInput) { programSearchInput.removeEventListener('input', handleProgramSearch); programSearchInput.addEventListener('input', handleProgramSearch); }
            if (saveNotesBtn) { saveNotesBtn.removeEventListener('click', handleSaveNotes); saveNotesBtn.addEventListener('click', handleSaveNotes); }
        }
    }

    // Handlers de Eventos
    function handleNavClick(e) {
        e.preventDefault();
        if (!isAuthenticated) return;

        const link = e.currentTarget;
        const viewId = link.dataset.view;
        const area = link.dataset.area;
        let effectiveViewId = viewId;
        let areaToSwitch = area || currentActiveArea;

        if (currentUser.role === 'pai') {
            // Pais só devem ver 'parent-dashboard-view'. Qualquer outra é redirecionada.
            if (effectiveViewId !== 'parent-dashboard-view') {
                effectiveViewId = 'parent-dashboard-view';
            }
            areaToSwitch = null; // Pais não têm "áreas" de programas
        } else if (currentUser.role === 'terapeuta') {
            if (effectiveViewId === 'parent-dashboard-view') { // Terapeutas não acessam o dashboard do pai
                effectiveViewId = 'dashboard-view'; // Redireciona para o dashboard geral/do cliente
            }
        }
        
        if (effectiveViewId) {
            if (areaToSwitch && currentUser.role === 'terapeuta') {
                currentActiveArea = areaToSwitch;
            }
            switchView(effectiveViewId, { area: currentUser.role === 'terapeuta' ? currentActiveArea : null });
            if (link.classList.contains('nav-link-mobile') && mobileMenu && !mobileMenu.classList.contains('hidden')) {
                toggleMobileMenu(false);
            }
        }
    }
    
    function handleClientSearch(e) { if (isAuthenticated && currentUser.role === 'terapeuta') renderClientList(e.target.value); }
    function handleShowAddClientForm() { if (isAuthenticated && currentUser.role === 'terapeuta' && showAddClientFormBtn && !showAddClientFormBtn.disabled) { resetAddClientForm(); addClientPanel.classList.remove('hidden'); clientDetailsPanel.classList.add('hidden'); noClientSelectedPlaceholder.classList.add('hidden'); clientNameInput.focus(); if (window.innerWidth < 768 && contextualSidebar) { contextualSidebar.classList.add('hidden'); } } }
    function handleCloseAddClientPanel() { if (isAuthenticated && currentUser.role === 'terapeuta') { addClientPanel.classList.add('hidden'); if (selectedPatient) { clientDetailsPanel.classList.remove('hidden'); } else { noClientSelectedPlaceholder.classList.remove('hidden'); } updateContextualSidebar(currentView, currentActiveArea); } }
    function handleClientListClick(e) { if (isAuthenticated && currentUser.role === 'terapeuta') { const clientItem = e.target.closest('.client-item'); if (clientItem && clientItem.dataset.clientId) { const clickedClientId = clientItem.dataset.clientId; const patientToSelect = patients.find(p => String(p.id) === clickedClientId); if (patientToSelect) { selectPatient(patientToSelect); if (window.innerWidth < 768 && contextualSidebar) { contextualSidebar.classList.add('hidden'); } } else { console.warn(`Paciente ID ${clickedClientId} não encontrado.`); } } } }
    function handleTriggerAddClientForm() { if (currentUser.role === 'terapeuta' && showAddClientFormBtn) showAddClientFormBtn.click(); }
    function handleEditClient() { if (isAuthenticated && selectedPatient && currentUser.role === 'terapeuta') editClient(); }
    function handleDeleteClient() { if (isAuthenticated && selectedPatient && currentUser.role === 'terapeuta') deleteClient(); }
    function handleGenerateGradePdf() { if (isAuthenticated && selectedPatient && currentUser.role === 'terapeuta') { generateProgramGradePDF(selectedPatient); } else { alert("Selecione um cliente para gerar a Grade de Programas."); } }
    function handleGenerateRecordPdf() { if (isAuthenticated && selectedPatient && currentUser.role === 'terapeuta') { generateWeeklyRecordSheetPDF(selectedPatient); } else { alert("Selecione um cliente para gerar a Folha de Registro."); } }
    function handleProgramSearch(e) { if (isAuthenticated && currentUser.role === 'terapeuta') { const activeProgramLink = programCategoriesContainer.querySelector('a.program-link.active'); const programId = activeProgramLink ? activeProgramLink.dataset.programId : null; filterAndDisplayPrograms(currentActiveArea, programId, e.target.value); } }


    // --- Reset da UI para Logout ---
    function resetUIForLogout() {
        loggedInUsernameSpan.textContent = 'Usuário';
        userAvatarDiv.textContent = '--';
        logoutButton.classList.add('hidden');
        
        currentClientIndicator.textContent = 'Nenhum cliente selecionado';
        currentClientIndicator.classList.add('italic', 'text-gray-500');
        currentClientIndicator.classList.remove('font-medium', 'text-indigo-700');
        currentClientIndicator.classList.remove('hidden'); 

        if (mobileLoggedInUsernameSpan) mobileLoggedInUsernameSpan.textContent = 'Usuário';
        if (mobileUserAvatarDiv) mobileUserAvatarDiv.textContent = '--';
        if (mobileCurrentClientIndicator) {
            mobileCurrentClientIndicator.textContent = 'Nenhum cliente selecionado';
            mobileCurrentClientIndicator.classList.add('italic', 'text-gray-500');
            mobileCurrentClientIndicator.classList.remove('font-medium', 'text-indigo-700');
        }
        if (mobileMenu) mobileMenu.classList.add('hidden');
        if (hamburgerIcon) hamburgerIcon.classList.remove('hidden');
        if (closeIcon) closeIcon.classList.add('hidden');

        if (clientListUl) clientListUl.innerHTML = '';
        if (noClientsMessageLi && clientListUl) {
            noClientsMessageLi.classList.remove('hidden');
            clientListUl.appendChild(noClientsMessageLi);
        }
        if(assignedProgramsListUl) assignedProgramsListUl.innerHTML = '';
        if(noAssignedProgramsLi && assignedProgramsListUl) {
             noAssignedProgramsLi.classList.remove('hidden');
             assignedProgramsListUl.appendChild(noAssignedProgramsLi);
        }
        if(programLibraryListDiv) programLibraryListDiv.innerHTML = '';
        if(programViewPlaceholder) programViewPlaceholder.classList.remove('hidden');
        if(noProgramsMessage) noProgramsMessage.classList.add('hidden');
        if(programCategoriesContainer) programCategoriesContainer.innerHTML = '';

        if(clientDetailsPanel) clientDetailsPanel.classList.add('hidden');
        if(noClientSelectedPlaceholder) noClientSelectedPlaceholder.classList.remove('hidden');
        if(addClientPanel) addClientPanel.classList.add('hidden');
        if(progressDetailsAreaDiv) progressDetailsAreaDiv.innerHTML = `<div class="text-center text-gray-500 py-6"><i class="fas fa-tasks text-3xl mb-3 text-gray-400"></i><p class="text-sm">Selecione um programa atribuído na lista ao lado para registrar uma sessão ou ver o gráfico de progresso.</p></div>`;

        if(clientSearchInput) clientSearchInput.value = '';
        if(programSearchInput) programSearchInput.value = '';
        updatePatientCountDisplay(); 
        if(patientCountIndicator) patientCountIndicator.classList.add('hidden');

        if (notesViewTextarea) notesViewTextarea.value = '';
        if (notesViewTextarea) notesViewTextarea.disabled = true;
        if (saveNotesBtn) saveNotesBtn.disabled = true;
        if (notesPlaceholder) notesPlaceholder.classList.remove('hidden');

        if (generalDashboardContent) generalDashboardContent.classList.remove('hidden'); 
        if (generalDashboardContent && generalDashboardContent.querySelector('.placeholder-container')) {
             generalDashboardContent.querySelector('.placeholder-container').classList.remove('hidden');
        } else if (generalDashboardContent) { 
            generalDashboardContent.innerHTML = `<div class="placeholder-container"><i class="fas fa-chart-pie"></i><p>Visão geral da aplicação.</p></div>`;
        }
        if (clientDashboardContent) clientDashboardContent.classList.add('hidden');
        if (clientDashboardContent) clientDashboardContent.innerHTML = '';
        if (parentDashboardView) parentDashboardView.classList.add('hidden');
        if (parentDashboardContent) parentDashboardContent.innerHTML = '<div class="text-center py-10 placeholder-container"><i class="fas fa-spinner fa-spin text-3xl text-indigo-600"></i><p class="mt-2 text-gray-600">Carregando dados de progresso...</p></div>';


        if(showAddClientFormBtn) {
            showAddClientFormBtn.disabled = true;
            showAddClientFormBtn.title = '';
            showAddClientFormBtn.classList.remove('hidden'); 
        }

        views.forEach(view => view.classList.add('hidden'));
        topNavLinks.forEach(link => {
            link.classList.remove('active');
            link.classList.remove('hidden'); 
        });
        mobileNavLinks.forEach(link => {
            link.classList.remove('active');
            link.classList.remove('hidden'); 
        });

        const defaultNavLinkDesktop = document.querySelector('nav .nav-link[data-view="clients-view"]');
        if(defaultNavLinkDesktop) defaultNavLinkDesktop.classList.add('active');
        const defaultNavLinkMobile = document.querySelector('#mobile-menu .nav-link-mobile[data-view="clients-view"]');
        if(defaultNavLinkMobile) defaultNavLinkMobile.classList.add('active');

        if (contextualSidebar) {
            contextualSidebar.classList.remove('hidden'); 
            contextualSidebar.classList.add('md:block');
             if (window.innerWidth < 768) { 
                contextualSidebar.classList.add('hidden');
            }
        }
        if(sidebarSections) sidebarSections.forEach(section => { section.classList.toggle('hidden', section.id !== 'sidebar-content-clients'); });
    }

    // --- Atualizações da UI ---
    function updateUserInfoDisplay() {
        if (currentUser) {
            const initials = (currentUser.full_name || currentUser.username || ' ').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
            const displayName = currentUser.full_name || currentUser.username || 'Usuário';
            const roleDisplay = currentUser.role === 'pai' ? ' (Responsável)' : (currentUser.role === 'terapeuta' ? ' (Terapeuta)' : '');
            
            if(loggedInUsernameSpan) loggedInUsernameSpan.textContent = `${displayName}${roleDisplay}`;
            if(userAvatarDiv) userAvatarDiv.textContent = initials;
            if(logoutButton) logoutButton.classList.remove('hidden');
            if (mobileLoggedInUsernameSpan) mobileLoggedInUsernameSpan.textContent = `${displayName}${roleDisplay}`;
            if (mobileUserAvatarDiv) mobileUserAvatarDiv.textContent = initials;
        }
    }
    function updateCurrentClientIndicator() { 
        if (!isAuthenticated || (currentUser && currentUser.role !== 'terapeuta')) {
            if(currentClientIndicator) currentClientIndicator.classList.add('hidden');
            if(mobileCurrentClientIndicator) mobileCurrentClientIndicator.classList.add('hidden');
            return;
        }
        if(currentClientIndicator) currentClientIndicator.classList.remove('hidden');
        if(mobileCurrentClientIndicator) mobileCurrentClientIndicator.classList.remove('hidden');

        const defaultText = 'Nenhum cliente selecionado';
        const activeClasses = ['font-medium', 'text-indigo-700'];
        const inactiveClasses = ['italic', 'text-gray-500'];
        const updateIndicator = (indicatorElement) => {
            if (!indicatorElement) return;
            const clientName = selectedPatient ? `Cliente: ${selectedPatient.name}` : defaultText;
            indicatorElement.textContent = clientName;
            inactiveClasses.forEach(cls => indicatorElement.classList.toggle(cls, !selectedPatient));
            activeClasses.forEach(cls => indicatorElement.classList.toggle(cls, !!selectedPatient));
        };
        updateIndicator(currentClientIndicator);
        updateIndicator(mobileCurrentClientIndicator);
    }
    function updatePatientCountDisplay() { 
        if (isAuthenticated && currentUser && currentUser.role === 'terapeuta') {
            const limit = currentUser.max_patients || 0;
            if(patientCountIndicator) {
                patientCountIndicator.textContent = `Pacientes: ${patients.length} / ${limit}`;
                patientCountIndicator.classList.remove('hidden');
            }
            if(showAddClientFormBtn) {
                const canAddMore = patients.length < limit;
                showAddClientFormBtn.disabled = !canAddMore;
                showAddClientFormBtn.title = canAddMore ? 'Adicionar novo cliente' : `Limite de ${limit} pacientes atingido`;
            }
        } else {
            if(patientCountIndicator) patientCountIndicator.classList.add('hidden');
            if(showAddClientFormBtn) {
                showAddClientFormBtn.disabled = true;
                showAddClientFormBtn.title = '';
            }
        }
    }

    // --- Carregamento e Salvamento de Dados ---
    async function loadProgramsData() {
        try {
            const response = await fetch('data/programs.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            allProgramsData = await response.json();
            console.log("Dados de programas carregados:", Object.keys(allProgramsData).length, "áreas encontradas.");
            if (!allProgramsData[currentActiveArea] && currentUser?.role === 'terapeuta') {
                console.warn(`Área ativa inicial "${currentActiveArea}" não encontrada nos dados de programas. Verifique programs.json.`);
                const firstArea = Object.keys(allProgramsData)[0];
                if (firstArea) {
                    currentActiveArea = firstArea;
                    console.log(`Área ativa definida para: ${currentActiveArea}`);
                } else {
                    console.error("Nenhuma área terapêutica encontrada em programs.json.");
                    allProgramsData = {};
                }
            }
        } catch (error) {
            console.error('Erro fatal ao carregar programas:', error);
            allProgramsData = {};
        }
    }
    function getProgramById(programId) {
        if (!allProgramsData || typeof allProgramsData !== 'object') return null;
        for (const areaKey in allProgramsData) {
            if (allProgramsData.hasOwnProperty(areaKey) && Array.isArray(allProgramsData[areaKey])) {
                const program = allProgramsData[areaKey].find(p => p.id === programId);
                if (program) return program;
            }
        }
        console.warn(`Programa com ID "${programId}" não encontrado em nenhuma área.`);
        return null;
    }
    async function loadUserPatientsFromAPI() {
        if (!isAuthenticated || !authToken || currentUser?.role !== 'terapeuta') {
            console.warn("Tentativa de carregar pacientes sem ser terapeuta ou sem autenticação.");
            patients = [];
            if (currentUser?.role === 'terapeuta') { 
                 renderClientList(); 
                 updatePatientCountDisplay(); 
            }
            return;
        }
        console.log("Carregando pacientes da API para terapeuta...");
        try {
            const response = await fetch(`${API_BASE_URL}/patients`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
            });
            if (response.ok) {
                const data = await response.json();
                patients = (data.patients || []).map(p => ({
                    ...p,
                    assigned_program_ids: Array.isArray(p.assigned_program_ids) ? p.assigned_program_ids : [],
                    sessionData: Array.isArray(p.sessionData) ? p.sessionData : []
                }));
                console.log(`Pacientes carregados:`, patients.length);
            } else if (response.status === 401 || response.status === 403) {
                console.error("Erro ao carregar pacientes: Token inválido/expirado.", response.status);
                alert("Sessão expirada. Faça login novamente.");
                handleLogout(); 
                patients = [];
            } else {
                const errorData = await response.json().catch(() => ({ errors: [{ msg: response.statusText }] }));
                console.error(`Erro ${response.status} ao carregar pacientes:`, errorData.errors?.[0]?.msg || response.statusText);
                patients = [];
            }
        } catch (error) {
            console.error("Erro de rede ao carregar pacientes:", error);
            patients = [];
        }
        if (currentUser?.role === 'terapeuta') {
            renderClientList(); 
            updatePatientCountDisplay();
        }
    }

    // --- Gerenciamento de Visão ---
    function switchView(viewId, context = {}) {
        if (!isAuthenticated) return;
        
        let effectiveViewId = viewId;
        const areaFromContext = context.area;

        if (currentUser.role === 'pai') {
            if (effectiveViewId !== 'parent-dashboard-view') {
                effectiveViewId = 'parent-dashboard-view';
            }
            currentActiveArea = null; // Pais não têm área ativa de programa
        } else if (currentUser.role === 'terapeuta') {
            if (effectiveViewId === 'parent-dashboard-view') {
                effectiveViewId = 'dashboard-view';
            }
            if (effectiveViewId === 'programs-view' && areaFromContext) {
                currentActiveArea = areaFromContext;
            }
        }
        
        console.log(`Mudando visão para: ${effectiveViewId}, Área Ativa (se aplicável): ${currentActiveArea || 'N/A'}`, context);
        currentView = effectiveViewId;

        topNavLinks.forEach(link => {
            const linkView = link.dataset.view;
            const linkArea = link.dataset.area;
            let isActive = linkView === currentView;
            if (linkView === 'programs-view' && currentUser.role === 'terapeuta') {
                isActive = isActive && linkArea === currentActiveArea;
            } else if (linkView === 'parent-dashboard-view' && currentUser.role === 'pai' && currentView === 'parent-dashboard-view') {
                isActive = true; // Link "Acompanhamento" ativo para pais na sua view
            }
            link.classList.toggle('active', isActive);
        });
        mobileNavLinks.forEach(link => {
            const linkView = link.dataset.view;
            const linkArea = link.dataset.area;
            let isActive = linkView === currentView;
            if (linkView === 'programs-view' && currentUser.role === 'terapeuta') {
                isActive = isActive && linkArea === currentActiveArea;
            } else if (linkView === 'parent-dashboard-view' && currentUser.role === 'pai' && currentView === 'parent-dashboard-view') {
                isActive = true;
            }
            link.classList.toggle('active', isActive);
        });

        views.forEach(view => { view.classList.toggle('hidden', view.id !== currentView); });
        
        // Garante que a view correta do dashboard do pai seja mostrada/escondida
        if (parentDashboardView) {
            parentDashboardView.classList.toggle('hidden', currentView !== 'parent-dashboard-view');
        }

        updateContextualSidebar(currentView, currentActiveArea);
        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
            toggleMobileMenu(false);
        }

        // Chama handlers específicos da view
        switch (currentView) {
            case 'clients-view': if (currentUser.role === 'terapeuta') handleClientViewSwitch(context); break;
            case 'programs-view': if (currentUser.role === 'terapeuta') handleProgramViewSwitch(context); break;
            case 'notes-view': if (currentUser.role === 'terapeuta') handleNotesViewSwitch(); break;
            case 'dashboard-view': if (currentUser.role === 'terapeuta') renderDashboard(); break; // Dashboard do terapeuta
            case 'parent-dashboard-view': if (currentUser.role === 'pai') loadParentDashboardData(); break; // Dashboard do pai
            case 'tip-guide-view': break; // Guia de dicas é uma view estática, mas já verificamos o acesso
        }
        if (mainContentArea) mainContentArea.scrollTop = 0;
    }

    function updateContextualSidebar(viewId, activeArea) {
        let targetSidebarId = '';
        
        if (currentUser.role === 'pai') {
            if (contextualSidebar) contextualSidebar.classList.add('hidden');
            if(sidebarSections) sidebarSections.forEach(section => section.classList.add('hidden'));
            return; 
        }

        // Se for terapeuta, a sidebar deve ser visível
        if (contextualSidebar) contextualSidebar.classList.remove('hidden');

        switch (viewId) {
            case 'clients-view': 
            case 'dashboard-view': // Dashboard do terapeuta usa a sidebar de clientes
            case 'notes-view': 
                targetSidebarId = 'sidebar-content-clients'; 
                break;
            case 'programs-view': 
                targetSidebarId = 'sidebar-content-programs'; 
                break;
            case 'tip-guide-view': 
                targetSidebarId = 'sidebar-content-tip-guide'; 
                break;
            default: 
                targetSidebarId = 'sidebar-content-clients'; // Fallback para terapeutas
        }

        if(sidebarSections) sidebarSections.forEach(section => { section.classList.toggle('hidden', section.id !== targetSidebarId); });

        if (contextualSidebar) {
            if (window.innerWidth < 768) { // Em mobile
                const isAddClientPanelVisible = addClientPanel && !addClientPanel.classList.contains('hidden');
                const isMobileMenuOpen = mobileMenu && !mobileMenu.classList.contains('hidden');
                // Esconde a sidebar se o menu mobile estiver aberto ou o painel de adicionar cliente
                if (isMobileMenuOpen || isAddClientPanelVisible) {
                    contextualSidebar.classList.add('hidden');
                } else {
                     contextualSidebar.classList.remove('hidden'); // Mostra se não estiverem abertos
                }
            } else { // Em desktop
                contextualSidebar.classList.remove('hidden'); 
                contextualSidebar.classList.add('md:block');
            }
        }

        if (targetSidebarId === 'sidebar-content-clients') {
            renderClientList(clientSearchInput ? clientSearchInput.value : '');
            updatePatientCountDisplay();
        } else if (targetSidebarId === 'sidebar-content-programs') {
            if (programSidebarTitle) { programSidebarTitle.textContent = `Programas de ${activeArea.replace(/([A-Z])/g, ' $1').trim()}`; }
            renderProgramCategories(activeArea);
            filterAndDisplayPrograms(activeArea, null, programSearchInput ? programSearchInput.value : '');
        }
    }

    // --- Lógica Específica das Views ---
    function handleClientViewSwitch(context) {
        if (!isAuthenticated || currentUser.role !== 'terapeuta') return;
        if (context?.clientId) {
            const patientToSelect = patients.find(p => String(p.id) === String(context.clientId));
            selectPatient(patientToSelect);
        } else if (selectedPatient) {
            selectPatient(selectedPatient);
        } else {
            displayNoClientSelected();
        }
        if (!(context?.showAddPanel)) { 
            if (addClientPanel) addClientPanel.classList.add('hidden');
        }
         updateContextualSidebar('clients-view', currentActiveArea); 
    }
    function handleProgramViewSwitch(context) {
        if (!isAuthenticated || currentUser.role !== 'terapeuta') return;
        const area = context.area || currentActiveArea;
        const programId = context?.programId || null;
        const searchText = programSearchInput ? programSearchInput.value : '';
        filterAndDisplayPrograms(area, programId, searchText);
        if(programCategoriesContainer) programCategoriesContainer.querySelectorAll('a.program-link, summary').forEach(el => el.classList.remove('active'));
        if(programId && programCategoriesContainer) {
            const link = programCategoriesContainer.querySelector(`a.program-link[data-program-id="${programId}"]`);
            if(link) {
                link.classList.add('active');
                const details = link.closest('details');
                if(details && !details.open) details.open = true;
                if(details) details.querySelector('summary')?.classList.add('active');
            }
        }
        updateContextualSidebar('programs-view', currentActiveArea); 
    }
    function handleNotesViewSwitch() {
        if (!isAuthenticated || currentUser.role !== 'terapeuta') return;
        if (selectedPatient) {
            if(notesViewTextarea) notesViewTextarea.value = selectedPatient.general_notes || '';
            if(notesViewTextarea) notesViewTextarea.disabled = false;
            if(saveNotesBtn) saveNotesBtn.disabled = false;
            if (notesPlaceholder) notesPlaceholder.classList.add('hidden');
        } else {
            if(notesViewTextarea) notesViewTextarea.value = '';
            if(notesViewTextarea) notesViewTextarea.disabled = true;
            if(saveNotesBtn) saveNotesBtn.disabled = true;
            if (notesPlaceholder) notesPlaceholder.classList.remove('hidden');
        }
        updateContextualSidebar('notes-view', currentActiveArea);
    }

    // --- Gerenciamento de Clientes (Exclusivo para Terapeutas) ---
    function renderClientList(filterText = '') {
        if (!isAuthenticated || !clientListUl || currentUser.role !== 'terapeuta') return;
        clientListUl.innerHTML = ''; 
        const lowerCaseFilter = filterText.toLowerCase();
        const filteredPatients = patients.filter(patient => patient.name.toLowerCase().includes(lowerCaseFilter));
        filteredPatients.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        if (filteredPatients.length === 0) {
            if(noClientsMessageLi) {
                noClientsMessageLi.classList.remove('hidden');
                clientListUl.appendChild(noClientsMessageLi);
                noClientsMessageLi.textContent = patients.length === 0 ? 'Nenhum cliente cadastrado.' : 'Nenhum cliente encontrado.';
            }
        } else {
            if(noClientsMessageLi) noClientsMessageLi.classList.add('hidden');
            filteredPatients.forEach(patient => {
                const li = document.createElement('li');
                li.dataset.clientId = patient.id;
                const isSelected = selectedPatient && String(selectedPatient.id) === String(patient.id);
                li.className = `client-item cursor-pointer px-3 py-2 rounded-md text-sm hover:bg-gray-100 flex items-center justify-between ${isSelected ? 'active bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'}`;
                li.innerHTML = `<span class="truncate" title="${patient.name}">${patient.name}</span> ${isSelected ? '<i class="fas fa-check-circle text-indigo-500 text-xs"></i>' : ''}`;
                clientListUl.appendChild(li);
            });
        }
        updatePatientCountDisplay();
    }
    function selectPatient(patient) {
        if (!isAuthenticated || !patient || currentUser.role !== 'terapeuta' || !patients.some(p => String(p.id) === String(patient.id))) {
            if (currentUser.role === 'terapeuta') displayNoClientSelected();
            return;
        }
        selectedPatient = patient;
        updateCurrentClientIndicator();
        renderClientList(clientSearchInput ? clientSearchInput.value : ''); 
        if (currentView === 'clients-view') {
            displayClientDetails(selectedPatient);
            if(noClientSelectedPlaceholder) noClientSelectedPlaceholder.classList.add('hidden');
            if(clientDetailsPanel) clientDetailsPanel.classList.remove('hidden');
            if(addClientPanel) addClientPanel.classList.add('hidden');
            renderAssignedPrograms(selectedPatient.assigned_program_ids || []);
        }
        else if (currentView === 'programs-view') {
            filterAndDisplayPrograms(currentActiveArea, null, programSearchInput ? programSearchInput.value : '');
        }
        else if (currentView === 'notes-view') {
            handleNotesViewSwitch();
        }
        else if (currentView === 'dashboard-view') {
            renderDashboard();
        }
    }
    function displayNoClientSelected() {
        if (!isAuthenticated || currentUser.role !== 'terapeuta') return;
        selectedPatient = null;
        updateCurrentClientIndicator();
        renderClientList(clientSearchInput ? clientSearchInput.value : ''); 
        if(clientDetailsPanel) clientDetailsPanel.classList.add('hidden');
        if(noClientSelectedPlaceholder) noClientSelectedPlaceholder.classList.remove('hidden');
        if(addClientPanel) addClientPanel.classList.add('hidden');
        if(assignedProgramsListUl) assignedProgramsListUl.innerHTML = '';
        if(noAssignedProgramsLi && assignedProgramsListUl) {
             noAssignedProgramsLi.classList.remove('hidden');
             assignedProgramsListUl.appendChild(noAssignedProgramsLi);
        }
        if(progressDetailsAreaDiv) progressDetailsAreaDiv.innerHTML = `<div class="text-center text-gray-500 py-6"><i class="fas fa-tasks text-3xl mb-3 text-gray-400"></i><p class="text-sm">Selecione um programa atribuído na lista ao lado para registrar uma sessão ou ver o gráfico de progresso.</p></div>`;
        if (currentView === 'programs-view') {
            filterAndDisplayPrograms(currentActiveArea, null, programSearchInput ? programSearchInput.value : '');
        }
        else if (currentView === 'notes-view') {
            handleNotesViewSwitch();
        }
        else if (currentView === 'dashboard-view') {
            renderDashboard();
        }
    }
    function displayClientDetails(patient) {
        if (!isAuthenticated || !patient || currentUser.role !== 'terapeuta') return;
        if(detailClientNameSpan) detailClientNameSpan.textContent = patient.name;
        if(detailClientIdSpan) detailClientIdSpan.textContent = patient.id;
        if(detailClientDobSpan) detailClientDobSpan.textContent = patient.dob ? formatDate(patient.dob) : 'Não informado';
        if(detailClientDiagnosisSpan) detailClientDiagnosisSpan.textContent = patient.diagnosis || 'Não informado';
        if(detailClientNotesSpan) detailClientNotesSpan.textContent = patient.general_notes || 'Sem anotações'; 
        renderAssignedPrograms(patient.assigned_program_ids || []);
        if(progressDetailsAreaDiv) progressDetailsAreaDiv.innerHTML = `<div class="text-center text-gray-500 py-6"><i class="fas fa-tasks text-3xl mb-3 text-gray-400"></i><p class="text-sm">Selecione um programa atribuído na lista ao lado para registrar uma sessão ou ver o gráfico de progresso.</p></div>`;
        selectedProgramForProgress = null;
    }
    async function handleAddOrEditClientSubmit(e) {
        e.preventDefault();
        if (!isAuthenticated || !authToken || currentUser.role !== 'terapeuta') return;
        const editingClientId = e.target.dataset.editingClientId;
        const clientData = {
            name: clientNameInput.value.trim(),
            dob: clientDobInput.value || null,
            diagnosis: clientDiagnosisInput.value.trim() || null,
            general_notes: clientNotesInput.value.trim() || null,
        };
        if (!clientData.name) { alert("O nome do cliente é obrigatório."); clientNameInput.focus(); return; }
        let url = `${API_BASE_URL}/patients`;
        let method = 'POST';
        if (editingClientId) { url += `/${editingClientId}`; method = 'PUT'; }
        else { const limit = currentUser.max_patients || 0; if (patients.length >= limit) { alert(`Limite de ${limit} pacientes atingido.`); return; } }
        try {
            const response = await fetch(url, { method: method, headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json', }, body: JSON.stringify(clientData), });
            const result = await response.json();
            if (response.ok) {
                alert(`Cliente "${clientData.name}" ${editingClientId ? 'atualizado' : 'cadastrado'} com sucesso!`);
                resetAddClientForm(); 
                await loadUserPatientsFromAPI(); 
                const targetId = result.patient?.id || editingClientId;
                const foundPatient = patients.find(p => String(p.id) === String(targetId));
                if (foundPatient) { selectPatient(foundPatient); } else { displayNoClientSelected(); }
                updateContextualSidebar(currentView, currentActiveArea);
            } else { console.error(`Erro ao ${editingClientId ? 'editar' : 'adicionar'} cliente:`, result.errors?.[0]?.msg || response.statusText); alert(`Erro: ${result.errors?.[0]?.msg || 'Falha ao salvar.'}`); }
        } catch (error) { console.error(`Erro de rede ao ${editingClientId ? 'editar' : 'adicionar'} cliente:`, error); alert("Erro de conexão."); }
    }
    function resetAddClientForm() { 
        if (addClientForm && currentUser.role === 'terapeuta') {
            addClientForm.reset();
            if (addClientFormTitle) addClientFormTitle.textContent = 'Cadastrar Novo Cliente';
            if (addClientFormSubmitBtn) addClientFormSubmitBtn.innerHTML = '<i class="fas fa-save mr-1.5"></i> Salvar Cliente';
            delete addClientForm.dataset.editingClientId; 
        }
    }
    async function deleteClient() { 
        if (!selectedPatient || !authToken || currentUser.role !== 'terapeuta') return;
        if (confirm(`Tem certeza que deseja excluir o cliente "${selectedPatient.name}"? Esta ação não pode ser desfeita.`)) {
            const patientId = selectedPatient.id;
            const patientName = selectedPatient.name;
            try {
                const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } });
                if (response.ok || response.status === 204) {
                    alert(`Cliente "${patientName}" excluído com sucesso.`);
                    displayNoClientSelected(); 
                    await loadUserPatientsFromAPI(); 
                } else { const result = await response.json().catch(() => ({ errors: [{ msg: response.statusText }] })); console.error('Erro ao excluir cliente:', result.errors?.[0]?.msg || response.statusText); alert(`Erro ao excluir: ${result.errors?.[0]?.msg || 'Falha.'}`); }
            } catch (error) { console.error('Erro de rede ao excluir cliente:', error); alert("Erro de conexão."); }
        }
    }
    function editClient() { 
        if (!selectedPatient || currentUser.role !== 'terapeuta') return;
        clientNameInput.value = selectedPatient.name;
        if (selectedPatient.dob) {
            try {
                const dateObj = new Date(selectedPatient.dob);
                if (!isNaN(dateObj.getTime())) {
                    const year = dateObj.getFullYear();
                    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                    const day = dateObj.getDate().toString().padStart(2, '0');
                    clientDobInput.value = `${year}-${month}-${day}`;
                } else { clientDobInput.value = ''; }
            } catch (e) { console.warn("Erro ao formatar data de nascimento para edição:", e); clientDobInput.value = selectedPatient.dob.split('T')[0] || ''; }
        } else { clientDobInput.value = ''; }
        clientDiagnosisInput.value = selectedPatient.diagnosis || '';
        clientNotesInput.value = selectedPatient.general_notes || '';
        addClientFormTitle.textContent = 'Editar Cliente';
        addClientFormSubmitBtn.innerHTML = '<i class="fas fa-save mr-1.5"></i> Salvar Alterações';
        addClientForm.dataset.editingClientId = selectedPatient.id;
        if(clientDetailsPanel) clientDetailsPanel.classList.add('hidden');
        if(noClientSelectedPlaceholder) noClientSelectedPlaceholder.classList.add('hidden');
        if(addClientPanel) addClientPanel.classList.remove('hidden');
        clientNameInput.focus();
        if (window.innerWidth < 768 && contextualSidebar) { contextualSidebar.classList.add('hidden'); }
    }

    // --- Gerenciamento de Programas (Exclusivo para Terapeutas) ---
    function renderProgramCategories(activeArea) {
        if (!isAuthenticated || !allProgramsData || !allProgramsData[activeArea] || currentUser.role !== 'terapeuta') {
            if (programCategoriesContainer) programCategoriesContainer.innerHTML = `<p class="text-xs text-gray-500 px-1">Nenhuma categoria para ${activeArea.replace(/([A-Z])/g, ' $1').trim()}.</p>`;
            return;
        }
        const programsInArea = allProgramsData[activeArea];
        const categories = {};
        programsInArea.forEach(program => {
            const tag = program.tag || 'Sem Categoria';
            if (!categories[tag]) categories[tag] = {};
            categories[tag][program.id] = program.title;
        });
        programCategoriesContainer.innerHTML = '';
        const sortedCategories = Object.keys(categories).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        if (sortedCategories.length === 0) {
            programCategoriesContainer.innerHTML = `<p class="text-xs text-gray-500 px-1">Nenhuma categoria encontrada para ${activeArea.replace(/([A-Z])/g, ' $1').trim()}.</p>`;
            return;
        }
        sortedCategories.forEach(tag => {
            const details = document.createElement('details');
            details.className = 'group program-category-details';
            details.innerHTML = `<summary class="flex justify-between items-center font-medium cursor-pointer list-none p-2 rounded hover:bg-gray-100 text-gray-700 group-open:active"><span class="flex items-center"><i class="fas fa-folder w-4 mr-2 text-indigo-400 group-open:text-indigo-600"></i> ${tag}</span><span class="transition group-open:rotate-90"><i class="fas fa-chevron-right text-xs"></i></span></summary><ul class="mt-1 ml-4 space-y-1 border-l border-gray-200 pl-3 program-list-ul">${Object.entries(categories[tag]).sort(([, titleA], [, titleB]) => titleA.localeCompare(titleB, 'pt-BR')).map(([id, title]) => `<li><a href="#" class="program-link block text-sm text-gray-600 hover:text-indigo-600 hover:bg-gray-100 px-2 py-1 rounded" data-program-id="${id}">${title}</a></li>`).join('')}</ul>`;
            programCategoriesContainer.appendChild(details);
        });
        programCategoriesContainer.querySelectorAll('a.program-link').forEach(link => { link.removeEventListener('click', handleProgramLinkClick); link.addEventListener('click', handleProgramLinkClick); });
        programCategoriesContainer.querySelectorAll('details.program-category-details').forEach(detailsElement => { detailsElement.removeEventListener('toggle', handleCategoryToggle); detailsElement.addEventListener('toggle', handleCategoryToggle); });
    }
    function handleProgramLinkClick(e) {
        e.preventDefault();
        if (!isAuthenticated || currentUser.role !== 'terapeuta') return;
        const link = e.currentTarget;
        const programId = link.dataset.programId;
        if(programCategoriesContainer) programCategoriesContainer.querySelectorAll('a.program-link, summary').forEach(el => el.classList.remove('active'));
        link.classList.add('active');
        const parentSummary = link.closest('details')?.querySelector('summary');
        if (parentSummary) {
            parentSummary.classList.add('active');
            if (!link.closest('details').open) { link.closest('details').open = true; }
        }
        filterAndDisplayPrograms(currentActiveArea, programId, '');
        if(programSearchInput) programSearchInput.value = '';
        if (window.innerWidth < 768 && contextualSidebar) { contextualSidebar.classList.add('hidden'); }
    }
    function handleCategoryToggle(event) {
        if (!isAuthenticated || currentUser.role !== 'terapeuta') return;
        const detailsElement = event.target;
        if (detailsElement.open) {
            if(programCategoriesContainer) programCategoriesContainer.querySelectorAll('details.program-category-details').forEach(otherDetails => {
                if (otherDetails !== detailsElement) { otherDetails.open = false; }
            });
            if(programCategoriesContainer) programCategoriesContainer.querySelectorAll('details.program-category-details:not([open]) a.program-link, details.program-category-details:not([open]) summary').forEach(el => { el.classList.remove('active'); });
        } else {
            detailsElement.querySelectorAll('a.program-link, summary').forEach(el => { el.classList.remove('active'); });
            filterAndDisplayPrograms(currentActiveArea, null, programSearchInput ? programSearchInput.value : '');
        }
    }
    function filterAndDisplayPrograms(area, programId = null, searchText = '') {
        if (!isAuthenticated || !allProgramsData || !allProgramsData[area] || currentUser.role !== 'terapeuta') {
            if (programLibraryListDiv) programLibraryListDiv.innerHTML = '';
            if (programViewPlaceholder) programViewPlaceholder.classList.add('hidden');
            if (noProgramsMessage) {
                noProgramsMessage.classList.remove('hidden');
                noProgramsMessage.textContent = `Nenhum programa encontrado para ${area.replace(/([A-Z])/g, ' $1').trim()}.`;
            }
            return;
        }
        programLibraryListDiv.innerHTML = '';
        const lowerSearchText = searchText.toLowerCase().trim();
        const programsOfCurrentArea = allProgramsData[area] || [];
        let programsToDisplay = [];
        if (programId) { 
            const program = programsOfCurrentArea.find(p => p.id === programId);
            if (program) programsToDisplay.push(program);
        } else if (lowerSearchText) { 
            programsToDisplay = programsOfCurrentArea.filter(program =>
                program.title.toLowerCase().includes(lowerSearchText) ||
                (program.tag && program.tag.toLowerCase().includes(lowerSearchText)) ||
                (program.objective && program.objective.toLowerCase().includes(lowerSearchText))
            );
        } else { 
            programsToDisplay = [...programsOfCurrentArea];
        }
        programsToDisplay.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
        if (programsToDisplay.length > 0) {
            if(programViewPlaceholder) programViewPlaceholder.classList.add('hidden');
            if(noProgramsMessage) noProgramsMessage.classList.add('hidden');
            programsToDisplay.forEach(program => {
                const card = createProgramCardElement(program, selectedPatient);
                programLibraryListDiv.appendChild(card);
            });
        } else { 
            if(programViewPlaceholder) programViewPlaceholder.classList.add('hidden');
            if(noProgramsMessage) {
                noProgramsMessage.classList.remove('hidden');
                noProgramsMessage.textContent = searchText ? `Nenhum programa encontrado para "${searchText}" em ${area.replace(/([A-Z])/g, ' $1').trim()}.` : (programId ? `Programa não encontrado.` : `Nenhum programa em ${area.replace(/([A-Z])/g, ' $1').trim()}.`);
            }
        }
    }
    function getTagColor(tag) {
        const colors = {
            "Mando": "bg-blue-100 text-blue-800", "Tato": "bg-green-100 text-green-800",
            "Ecoico": "bg-yellow-100 text-yellow-800", "Intraverbal": "bg-purple-100 text-purple-800",
            "Imitação": "bg-pink-100 text-pink-800", "Contato Visual": "bg-red-100 text-red-800",
            "Comportamento Ouvinte": "bg-orange-100 text-orange-800", "Brincar": "bg-teal-100 text-teal-800",
            "Habilidades Sociais": "bg-cyan-100 text-cyan-800", "Pareamento": "bg-gray-300 text-gray-800",
            "Coordenação Fina": "bg-lime-200 text-lime-800", "Coordenação Grossa": "bg-emerald-200 text-emerald-800",
            "Processamento Sensorial": "bg-amber-200 text-amber-800", "Percepção Visual": "bg-sky-200 text-sky-800",
            "AVDs": "bg-violet-200 text-violet-800", "Brincar T.O.": "bg-fuchsia-200 text-fuchsia-800",
            "Funções Executivas T.O.": "bg-rose-200 text-rose-800", "Esquema Corporal": "bg-indigo-200 text-indigo-800",
            "Lateralidade": "bg-yellow-300 text-yellow-900", "Organização Espaço-Temporal": "bg-green-300 text-green-900",
            "Coordenação Global": "bg-blue-300 text-blue-900", "Coordenação Fina Psicomot.": "bg-lime-300 text-lime-900",
            "Equilíbrio e Ritmo": "bg-pink-300 text-pink-900", "Grafomotricidade": "bg-purple-300 text-purple-900",
            "Pré-Alfabetização": "bg-red-300 text-red-900", "Leitura e Escrita": "bg-orange-300 text-orange-900",
            "Matemática Psicoped.": "bg-teal-300 text-teal-900", "Atenção e Memória": "bg-cyan-300 text-cyan-900",
            "Organização de Estudos": "bg-gray-400 text-gray-900", "Percepção Auditiva": "bg-fuchsia-300 text-fuchsia-900",
            "Expressão Vocal/Musical": "bg-rose-300 text-rose-900", "Ritmo e Movimento": "bg-sky-300 text-sky-900",
            "Interação Musical": "bg-violet-300 text-violet-900", "Relaxamento Musical": "bg-emerald-300 text-emerald-900",
            "Linguagem Receptiva": "bg-blue-400 text-blue-900", "Linguagem Expressiva": "bg-green-400 text-green-900",
            "Articulação/Fonologia": "bg-yellow-400 text-yellow-900", "Fluência": "bg-purple-400 text-purple-900",
            "Motricidade Orofacial": "bg-pink-400 text-pink-900", "Pragmática (Fono)": "bg-orange-400 text-orange-900"
        };
        return colors[tag] || "bg-gray-200 text-gray-700";
    }
    function createProgramCardElement(program, currentSelectedPatient) {
        const card = document.createElement('div');
        card.className = 'program-card bg-white rounded-lg shadow p-5 flex flex-col justify-between transition hover:shadow-md border border-gray-200';
        card.dataset.programId = program.id;
        const procedurePreviewHTML = program.procedure?.slice(0, 2).map(step =>
            `<p class="text-xs text-gray-600 mb-1 truncate" title="${step.term}: ${step.description}"><strong class="font-medium text-gray-800">${step.term}:</strong> ${step.description}</p>`
        ).join('') + (program.procedure?.length > 2 ? '<p class="text-xs text-gray-400 italic mt-1">...</p>' : '') || '<p class="text-xs text-gray-400 italic">Procedimento não detalhado.</p>';
        const materialsHTML = program.materials?.length > 0 ?
            `<div class="mt-2"><h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Materiais</h4><ul class="list-disc list-inside text-xs text-gray-600 space-y-0.5">${program.materials.slice(0, 3).map(item => `<li class="truncate" title="${item}">${item}</li>`).join('')}${program.materials.length > 3 ? '<li class="text-gray-400 italic">...</li>' : ''}</ul></div>` : '';
        
        let assignButtonHTML = '';
        if (currentUser.role === 'terapeuta') {
            const assignedProgramIds = currentSelectedPatient?.assigned_program_ids || [];
            const isAssigned = currentSelectedPatient && assignedProgramIds.includes(program.id);
            assignButtonHTML = currentSelectedPatient ?
                `<button class="assign-program-btn text-xs font-medium py-1.5 px-3 rounded ${isAssigned ? 'assigned bg-emerald-500 text-white cursor-default' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}" data-program-id="${program.id}" title="${isAssigned ? 'Programa Já Atribuído' : 'Atribuir ao Cliente'}" ${isAssigned ? 'disabled' : ''}><i class="fas ${isAssigned ? 'fa-check' : 'fa-plus'} mr-1"></i> ${isAssigned ? 'Atribuído' : 'Atribuir'}</button>` :
                `<button class="text-xs font-medium py-1.5 px-3 rounded bg-gray-100 text-gray-500 cursor-not-allowed" disabled title="Selecione um cliente para atribuir programas"><i class="fas fa-plus mr-1"></i> Atribuir</button>`;
        }

        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-base font-semibold text-gray-800 leading-tight">${program.title}</h3>
                    <span class="tag text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${getTagColor(program.tag || 'N/A')} flex-shrink-0 ml-2">${program.tag || 'N/A'}</span>
                </div>
                <p class="text-xs font-medium text-indigo-600 mb-1">Objetivo:</p>
                <p class="text-xs text-gray-600 mb-3 line-clamp-2" title="${program.objective || ''}">${program.objective || 'Não definido'}</p>
                ${materialsHTML}
                <div class="mt-3">
                    <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Procedimento (Prévia)</h4>
                    ${procedurePreviewHTML}
                </div>
            </div>
            ${currentUser.role === 'terapeuta' ? `<div class="program-card-actions mt-4 pt-3 border-t border-gray-100 text-right">${assignButtonHTML}</div>` : ''}
        `;
        if (currentUser.role === 'terapeuta') {
            const assignButton = card.querySelector('.assign-program-btn');
            if (assignButton && !assignButton.disabled) {
                assignButton.removeEventListener('click', handleAssignProgram);
                assignButton.addEventListener('click', handleAssignProgram);
            }
        }
        return card;
    }
    async function handleAssignProgram(e) {
        if (!isAuthenticated || !selectedPatient || !authToken || currentUser.role !== 'terapeuta') { alert("Por favor, selecione um cliente antes de atribuir um programa."); return; }
        const button = e.currentTarget;
        const programId = button.dataset.programId;
        const program = getProgramById(programId);
        if (!program) { console.error("Programa não encontrado para atribuir:", programId); alert("Erro: Programa não encontrado."); return; }
        const assignedProgramIds = selectedPatient.assigned_program_ids || [];
        if (assignedProgramIds.includes(programId)) { console.warn(`Programa ${programId} já atribuído ao paciente ${selectedPatient.id}.`); return; }
        console.log(`Atribuindo programa ${programId} (${program.title}) ao paciente ${selectedPatient.id} (${selectedPatient.name})`);
        button.disabled = true; 
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Atribuindo...';
        try {
            const response = await fetch(`${API_BASE_URL}/patients/${selectedPatient.id}/programs`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ programId: programId }) });
            if (response.ok) {
                alert(`Programa "${program.title}" atribuído a ${selectedPatient.name}.`);
                if (!selectedPatient.assigned_program_ids) selectedPatient.assigned_program_ids = [];
                selectedPatient.assigned_program_ids.push(programId);
                renderAssignedPrograms(selectedPatient.assigned_program_ids); 
                button.classList.remove('bg-indigo-100', 'text-indigo-700', 'hover:bg-indigo-200');
                button.classList.add('assigned', 'bg-emerald-500', 'text-white', 'cursor-default');
                button.innerHTML = `<i class="fas fa-check mr-1"></i> Atribuído`;
                button.title = 'Programa Já Atribuído';
            } else { const result = await response.json().catch(() => ({ errors: [{ msg: "Erro ao processar resposta do servidor." }] })); console.error('Erro ao atribuir programa:', result.errors?.[0]?.msg || response.statusText); alert(`Erro ao atribuir programa: ${result.errors?.[0]?.msg || 'Falha na operação.'}`); button.disabled = false; button.innerHTML = `<i class="fas fa-plus mr-1"></i> Atribuir`; }
        } catch (error) { console.error('Erro de rede ao atribuir programa:', error); alert("Erro de conexão ao tentar atribuir o programa."); button.disabled = false; button.innerHTML = `<i class="fas fa-plus mr-1"></i> Atribuir`; }
    }
    async function handleRemoveProgram(e) {
        if (!isAuthenticated || !selectedPatient || !authToken || currentUser.role !== 'terapeuta') return;
        const button = e.currentTarget;
        const programIdToRemove = button.dataset.programId;
        const program = getProgramById(programIdToRemove);
        const programTitle = program ? program.title : 'este programa';
        if (confirm(`Tem certeza que deseja remover o programa "${programTitle}" de ${selectedPatient.name}?`)) {
            console.log(`Removendo programa ${programIdToRemove} do paciente ${selectedPatient.id}`);
            button.disabled = true; 
            try {
                const response = await fetch(`${API_BASE_URL}/patients/${selectedPatient.id}/programs/${programIdToRemove}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } });
                if (response.ok || response.status === 204) {
                    alert(`Programa "${programTitle}" removido de ${selectedPatient.name}.`);
                    selectedPatient.assigned_program_ids = (selectedPatient.assigned_program_ids || []).filter(id => id !== programIdToRemove);
                    renderAssignedPrograms(selectedPatient.assigned_program_ids); 
                    if(programLibraryListDiv) {
                        const programCardButton = programLibraryListDiv.querySelector(`.assign-program-btn[data-program-id="${programIdToRemove}"]`);
                        if (programCardButton) {
                            programCardButton.classList.remove('assigned', 'bg-emerald-500', 'text-white', 'cursor-default');
                            programCardButton.classList.add('bg-indigo-100', 'text-indigo-700', 'hover:bg-indigo-200');
                            programCardButton.innerHTML = `<i class="fas fa-plus mr-1"></i> Atribuir`;
                            programCardButton.disabled = false;
                            programCardButton.title = 'Atribuir ao Cliente';
                        }
                    }
                    if (selectedProgramForProgress?.id === programIdToRemove) {
                        if(progressDetailsAreaDiv) progressDetailsAreaDiv.innerHTML = `<div class="text-center text-gray-500 py-6"><i class="fas fa-tasks text-3xl mb-3 text-gray-400"></i><p class="text-sm">Selecione um programa atribuído na lista ao lado para registrar uma sessão ou ver o gráfico de progresso.</p></div>`;
                        selectedProgramForProgress = null;
                    }
                } else { const result = await response.json().catch(() => ({ errors: [{ msg: "Erro ao processar resposta do servidor." }] })); console.error('Erro ao remover programa:', result.errors?.[0]?.msg || response.statusText); alert(`Erro ao remover programa: ${result.errors?.[0]?.msg || 'Falha na operação.'}`); button.disabled = false; }
            } catch (error) { console.error('Erro de rede ao remover programa:', error); alert("Erro de conexão ao tentar remover o programa."); button.disabled = false; }
        }
    }
    function renderAssignedPrograms(assignedProgramIds) {
        if (!assignedProgramsListUl || !noAssignedProgramsLi || currentUser.role !== 'terapeuta') return;
        assignedProgramsListUl.innerHTML = ''; 
        if (!assignedProgramIds || assignedProgramIds.length === 0) {
            noAssignedProgramsLi.classList.remove('hidden');
            assignedProgramsListUl.appendChild(noAssignedProgramsLi);
        } else {
            noAssignedProgramsLi.classList.add('hidden');
            const assignedProgramsDetails = assignedProgramIds.map(id => getProgramById(id)).filter(p => p).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
            assignedProgramsDetails.forEach(program => {
                const li = document.createElement('li');
                const isSelectedForProgress = selectedProgramForProgress?.id === program.id;
                li.className = `assigned-program-item flex justify-between items-center p-2 rounded hover:bg-gray-50 ${isSelectedForProgress ? 'active bg-indigo-100' : ''}`;
                li.dataset.programId = program.id;
                const fullTitle = `${program.title} (${program.tag || 'N/A'})`;
                li.innerHTML = `
                    <span class="program-title-span text-sm font-medium text-gray-700 truncate pr-2" title="${fullTitle}">
                        ${program.title} <span class="text-xs text-gray-500">(${program.tag || 'N/A'})</span>
                    </span>
                    <div class="program-actions flex space-x-1 sm:space-x-2 flex-shrink-0 no-print">
                        <button class="view-progress-btn text-xs font-medium text-indigo-600 hover:text-indigo-800 px-1.5 py-1 sm:px-2 rounded hover:bg-indigo-50 flex items-center" title="Ver Progresso/Registrar Sessão" data-program-id="${program.id}">
                            <i class="fas fa-chart-line fa-fw mr-1"></i> <span class="hidden sm:inline">Ver/Reg.</span>
                        </button>
                        <button class="remove-program-btn text-xs font-medium text-red-500 hover:text-red-700 px-1.5 py-1 sm:px-2 rounded hover:bg-red-50 flex items-center" title="Remover Programa" data-program-id="${program.id}">
                            <i class="fas fa-times-circle fa-fw mr-1"></i> <span class="hidden sm:inline">Remover</span>
                        </button>
                    </div>`;
                const viewBtn = li.querySelector('.view-progress-btn');
                const removeBtn = li.querySelector('.remove-program-btn');
                viewBtn.removeEventListener('click', handleViewProgramProgress); 
                viewBtn.addEventListener('click', handleViewProgramProgress);   
                removeBtn.removeEventListener('click', handleRemoveProgram);
                removeBtn.addEventListener('click', handleRemoveProgram);
                assignedProgramsListUl.appendChild(li);
            });
        }
    }

    // --- Gerenciamento de Sessão e Progresso (Exclusivo para Terapeutas) ---
    function handleViewProgramProgress(e) {
        if (!isAuthenticated || !selectedPatient || currentUser.role !== 'terapeuta') return;
        const button = e.currentTarget;
        const programId = button.dataset.programId;
        selectedProgramForProgress = getProgramById(programId);
        if (selectedProgramForProgress) {
            renderSessionEntryForm(selectedProgramForProgress);
            if(assignedProgramsListUl) assignedProgramsListUl.querySelectorAll('.assigned-program-item').forEach(item => {
                item.classList.toggle('active', item.dataset.programId === programId);
                item.classList.toggle('bg-indigo-100', item.dataset.programId === programId);
            });
        } else { console.error("Programa selecionado para progresso não encontrado:", programId); clearSessionProgressArea(); }
    }
    function renderSessionEntryForm(program) {
        if (!isAuthenticated || !selectedPatient || !program || currentUser.role !== 'terapeuta' || !progressDetailsAreaDiv) return;
        const totalTrials = program.trials || 0;
        const criteriaHTML = program.criteria_for_advancement ? `<div class="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md"><h5 class="text-sm font-semibold text-blue-800 mb-1">Critério para Avanço:</h5><p class="text-xs text-blue-700">${program.criteria_for_advancement}</p></div>` : '';
        progressDetailsAreaDiv.innerHTML = `
            <h4 class="text-base font-semibold text-gray-700 mb-3">Registrar Sessão: <span class="font-normal">${program.title}</span></h4>
            ${criteriaHTML}
            <form id="add-session-form" data-program-id="${program.id}" class="space-y-3 mb-6 pb-6 border-b border-gray-200">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label for="session-date" class="block text-xs font-medium text-gray-600 mb-1">Data:</label>
                        <input type="date" id="session-date" required value="${new Date().toISOString().split('T')[0]}" class="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm">
                    </div>
                    <div>
                        <label for="session-correct-trials" class="block text-xs font-medium text-gray-600 mb-1">Nº de Acertos Realizados:</label>
                        <input type="number" id="session-correct-trials" min="0" ${totalTrials > 0 ? `max="${totalTrials}"` : ''} step="1" required placeholder="Nº de acertos" class="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm">
                        ${totalTrials > 0 ? `<p class="text-xs text-gray-500 mt-1">De ${totalTrials} tentativas planejadas.</p>` : '<p class="text-xs text-red-500 mt-1">Número de tentativas não definido para este programa.</p>'}
                    </div>
                </div>
                <div>
                    <label for="session-notes" class="block text-xs font-medium text-gray-600 mb-1">Observações:</label>
                    <textarea id="session-notes" rows="2" placeholder="Alguma observação sobre a sessão?" class="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none shadow-sm"></textarea>
                </div>
                <div class="flex items-center">
                    <input id="session-is-baseline" type="checkbox" class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
                    <label for="session-is-baseline" class="ml-2 block text-xs font-medium text-gray-700">Marcar como Linha de Base</label>
                </div>
                <div class="flex justify-end space-x-2">
                    <button type="button" id="cancel-session-entry" class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-1.5 px-4 rounded-md text-xs transition duration-150 ease-in-out border border-gray-300 shadow-sm">Limpar Área</button>
                    <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 px-4 rounded-md text-xs transition duration-150 ease-in-out shadow hover:shadow-md"><i class="fas fa-save mr-1"></i> Salvar Registro</button>
                </div>
            </form>
            <div id="program-progress-chart" class="mt-4">
                <h4 class="text-base font-semibold text-gray-700 mb-2">Progresso do Programa (% Acerto)</h4>
                <div class="relative h-64 md:h-72 bg-gray-50 rounded border border-gray-200">
                    <canvas id="progressChartCanvas" class="absolute inset-0"></canvas>
                </div>
                <p id="no-progress-data-message" class="hidden text-center text-sm text-gray-500 mt-4">Nenhum dado de sessão registrado para este programa.</p>
            </div>`;
        const form = document.getElementById('add-session-form');
        const cancelBtn = document.getElementById('cancel-session-entry');
        if(form) { form.removeEventListener('submit', handleAddSession); form.addEventListener('submit', handleAddSession); }
        if(cancelBtn) { cancelBtn.removeEventListener('click', clearSessionProgressArea); cancelBtn.addEventListener('click', clearSessionProgressArea); }
        renderProgressChart(program.id);
    }
    async function handleAddSession(e) {
        e.preventDefault();
        if (!isAuthenticated || !selectedPatient || !selectedProgramForProgress || !authToken || currentUser.role !== 'terapeuta') return;
        const form = e.target;
        const programId = form.dataset.programId;
        const programDetails = getProgramById(programId);
        if (!programDetails || typeof programDetails.trials !== 'number' || programDetails.trials <= 0) { alert("Número total de tentativas não definido ou inválido para este programa."); return; }
        const correctTrialsInput = form.querySelector('#session-correct-trials');
        const correctTrials = parseInt(correctTrialsInput.value, 10);
        if (isNaN(correctTrials) || correctTrials < 0 || correctTrials > programDetails.trials) { alert(`Número de acertos inválido. Deve ser entre 0 e ${programDetails.trials}.`); correctTrialsInput.focus(); return; }
        const scorePercentage = (correctTrials / programDetails.trials) * 100;
        const sessionData = { programId: programId, date: form.querySelector('#session-date').value, score: parseFloat(scorePercentage.toFixed(2)), notes: form.querySelector('#session-notes').value.trim(), isBaseline: form.querySelector('#session-is-baseline').checked };
        if (!sessionData.date) { alert("Preencha a data da sessão."); return; }
        console.log(`Salvando sessão para paciente ${selectedPatient.id}, programa ${programId}, Acertos: ${correctTrials}, %: ${sessionData.score}`);
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Salvando...';
        try {
            const response = await fetch(`${API_BASE_URL}/patients/${selectedPatient.id}/sessions`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(sessionData) });
            if (response.ok) {
                const newSession = await response.json(); 
                console.log("Sessão salva:", newSession);
                if (!selectedPatient.sessionData) selectedPatient.sessionData = [];
                selectedPatient.sessionData.push({ id: newSession.id, program_id: newSession.program_id || newSession.programId, session_date: newSession.session_date || newSession.date, score: parseFloat(newSession.score), notes: newSession.notes, is_baseline: newSession.is_baseline || newSession.isBaseline });
                correctTrialsInput.value = '';
                form.querySelector('#session-notes').value = '';
                form.querySelector('#session-is-baseline').checked = false;
                renderProgressChart(programId); 
                alert("Registro de sessão salvo com sucesso!");
            } else { const result = await response.json().catch(() => ({ errors: [{ msg: "Erro ao processar resposta do servidor." }] })); console.error('Erro ao salvar sessão:', result.errors?.[0]?.msg || response.statusText); alert(`Erro ao salvar sessão: ${result.errors?.[0]?.msg || 'Falha.'}`); }
        } catch (error) { console.error('Erro de rede ao salvar sessão:', error); alert("Erro de conexão."); }
        finally { submitButton.disabled = false; submitButton.innerHTML = '<i class="fas fa-save mr-1"></i> Salvar Registro'; }
    }
    function renderProgressChart(programId) {
        if (!isAuthenticated || !selectedPatient || currentUser.role !== 'terapeuta') return;
        const canvasContainer = document.getElementById('program-progress-chart');
        const canvas = document.getElementById('progressChartCanvas');
        const noDataMessage = document.getElementById('no-progress-data-message');
        const chartArea = canvasContainer?.querySelector('.relative');
        if (!canvas || !noDataMessage || !chartArea) { console.error("Elementos do gráfico não encontrados."); return; }
        if (progressChartInstance) { progressChartInstance.destroy(); progressChartInstance = null; }
        const programSessionData = (selectedPatient.sessionData || []).filter(session => String(session.program_id || session.programId) === String(programId)).sort((a, b) => new Date(a.session_date || a.date) - new Date(b.session_date || b.date)).map(s => ({ ...s, score: parseFloat(s.score) }));
        if (programSessionData.length === 0) { noDataMessage.classList.remove('hidden'); chartArea.classList.add('hidden'); return; }
        noDataMessage.classList.add('hidden'); chartArea.classList.remove('hidden');
        const dates = programSessionData.map(session => formatDate(session.session_date || session.date, 'short'));
        const scores = programSessionData.map(session => session.score);
        const pointStyles = programSessionData.map(session => session.is_baseline || session.isBaseline ? 'rect' : 'circle');
        const pointBackgroundColors = programSessionData.map(session => session.is_baseline || session.isBaseline ? '#fbbf24' : '#4f46e5');
        const pointRadii = programSessionData.map(session => session.is_baseline || session.isBaseline ? 5 : 4);
        const ctx = canvas.getContext('2d');
        const primaryColor = '#4f46e5', baselineColor = '#fbbf24', primaryLight = 'rgba(79, 70, 229, 0.1)', textColor = '#4b5563', gridColor = '#e5e7eb', pointBorderColor = '#ffffff';
        progressChartInstance = new Chart(ctx, {
            type: 'line', data: { labels: dates, datasets: [{ label: 'Pontuação (%)', data: scores, borderColor: primaryColor, backgroundColor: primaryLight, pointStyle: pointStyles, pointBackgroundColor: pointBackgroundColors, pointRadius: pointRadii, pointBorderColor: pointBorderColor, pointHoverBackgroundColor: pointBackgroundColors, pointHoverBorderColor: pointBorderColor, pointHoverRadius: pointRadii.map(r => r + 2), pointHoverBorderWidth: 2, fill: true, tension: 0.2, borderWidth: 2, }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100, ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor, drawBorder: false } }, x: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } } }, plugins: { legend: { display: false }, tooltip: { enabled: true, backgroundColor: '#1f2937', titleColor: '#fff', bodyColor: '#fff', padding: 10, cornerRadius: 4, displayColors: true, borderColor: (tooltipItem) => { const index = tooltipItem.tooltip.dataPoints[0].dataIndex; if (index < 0 || index >= programSessionData.length) return primaryColor; return programSessionData[index]?.is_baseline || programSessionData[index]?.isBaseline ? baselineColor : primaryColor; }, borderWidth: 1, callbacks: { title: function(tooltipItems) { const index = tooltipItems[0].dataIndex; if (index < 0 || index >= programSessionData.length) return ''; const session = programSessionData[index]; const baselinePrefix = session.is_baseline || session.isBaseline ? '[Linha de Base] ' : ''; return `${baselinePrefix}Data: ${formatDate(session.session_date || session.date)}`; }, label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += context.parsed.y + '%'; } const index = context.dataIndex; if (index >= 0 && index < programSessionData.length) { const notes = programSessionData[index].notes; if(notes) { const truncatedNotes = notes.length > 50 ? notes.substring(0, 47) + '...' : notes; label += `\nObs: ${truncatedNotes}`; } } return label; }, labelColor: function(context) { const index = context.dataIndex; if (index < 0 || index >= programSessionData.length) return { borderColor: primaryColor, backgroundColor: primaryColor }; const isBaseline = programSessionData[index].is_baseline || programSessionData[index].isBaseline; return { borderColor: isBaseline ? baselineColor : primaryColor, backgroundColor: isBaseline ? baselineColor : primaryColor, borderWidth: 2, borderRadius: isBaseline ? 0 : '50%' }; }, } } }, hover: { mode: 'index', intersect: false }, interaction: { mode: 'index', intersect: false }, }
        });
    }
    function clearSessionProgressArea() { 
        if (progressDetailsAreaDiv && currentUser.role === 'terapeuta') { progressDetailsAreaDiv.innerHTML = `<div class="text-center text-gray-500 py-6"><i class="fas fa-tasks text-3xl mb-3 text-gray-400"></i><p class="text-sm">Selecione um programa atribuído na lista ao lado para registrar uma sessão ou ver o gráfico de progresso.</p></div>`; }
        selectedProgramForProgress = null;
        if (progressChartInstance) { progressChartInstance.destroy(); progressChartInstance = null; }
        if (assignedProgramsListUl && currentUser.role === 'terapeuta') { assignedProgramsListUl.querySelectorAll('.assigned-program-item.active').forEach(item => { item.classList.remove('active', 'bg-indigo-100'); }); }
    }

    // --- Anotações (Exclusivo para Terapeutas) ---
    async function handleSaveNotes() {
        if (!selectedPatient || !authToken || currentUser.role !== 'terapeuta' || !saveNotesBtn) { 
            if(saveNotesBtn) saveNotesBtn.disabled = true; 
            if(currentUser.role === 'terapeuta') alert("Nenhum cliente selecionado para salvar anotações.");
            return; 
        }
        const newNotes = notesViewTextarea.value;
        console.log(`Salvando anotações para paciente ${selectedPatient.id}`);
        saveNotesBtn.disabled = true;
        saveNotesBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> Salvando...';
        try {
            const response = await fetch(`${API_BASE_URL}/patients/${selectedPatient.id}/notes`, { method: 'PUT', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json', }, body: JSON.stringify({ generalNotes: newNotes }) });
            if (response.ok) {
                selectedPatient.general_notes = newNotes; 
                if (detailClientNotesSpan && clientDetailsPanel && !clientDetailsPanel.classList.contains('hidden')) { detailClientNotesSpan.textContent = newNotes || 'Sem anotações'; }
                saveNotesBtn.classList.add('bg-emerald-500', 'hover:bg-emerald-600');
                saveNotesBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
                saveNotesBtn.innerHTML = '<i class="fas fa-check mr-1.5"></i> Salvo!';
                setTimeout(() => { saveNotesBtn.classList.remove('bg-emerald-500', 'hover:bg-emerald-600'); saveNotesBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700'); saveNotesBtn.innerHTML = '<i class="fas fa-save mr-1.5"></i> Salvar Anotações'; saveNotesBtn.disabled = false; }, 2000);
            } else { const result = await response.json().catch(() => ({ errors: [{ msg: "Erro ao processar resposta do servidor." }] })); console.error('Erro ao salvar anotações:', result.errors?.[0]?.msg || response.statusText); alert(`Erro ao salvar anotações: ${result.errors?.[0]?.msg || 'Falha.'}`); saveNotesBtn.disabled = false; saveNotesBtn.innerHTML = '<i class="fas fa-save mr-1.5"></i> Salvar Anotações'; }
        } catch (error) { console.error('Erro de rede ao salvar anotações:', error); alert("Erro de conexão."); saveNotesBtn.disabled = false; saveNotesBtn.innerHTML = '<i class="fas fa-save mr-1.5"></i> Salvar Anotações'; }
    }

    // --- Dashboard ---
    function renderDashboard() { 
        if (!isAuthenticated || !dashboardView || currentUser.role !== 'terapeuta') return;
        
        if (selectedPatient) { 
            if (generalDashboardContent) generalDashboardContent.classList.add('hidden'); 
            if (clientDashboardContent) clientDashboardContent.classList.remove('hidden'); 
            const assignedProgramsCount = selectedPatient.assigned_program_ids?.length || 0;
            const sessionsCount = selectedPatient.sessionData?.length || 0;
            const averageProgress = calculateOverallAverageProgress(selectedPatient);
            clientDashboardContent.innerHTML = `
                <h2 class="text-xl font-semibold text-gray-700 mb-4">Dashboard: ${selectedPatient.name}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div class="bg-white p-4 rounded-lg shadow border border-gray-200"><h3 class="text-sm font-medium text-gray-500 mb-1">Programas Ativos</h3><p class="text-3xl font-semibold text-indigo-600">${assignedProgramsCount}</p></div>
                    <div class="bg-white p-4 rounded-lg shadow border border-gray-200"><h3 class="text-sm font-medium text-gray-500 mb-1">Sessões Registradas</h3><p class="text-3xl font-semibold text-emerald-600">${sessionsCount}</p></div>
                    <div class="bg-white p-4 rounded-lg shadow border border-gray-200"><h3 class="text-sm font-medium text-gray-500 mb-1">Progresso Médio (Interv.)</h3><p class="text-3xl font-semibold text-amber-600">${averageProgress}%</p></div>
                </div>`;
        } else { 
            if (clientDashboardContent) clientDashboardContent.classList.add('hidden'); 
            if (generalDashboardContent) generalDashboardContent.classList.remove('hidden'); 
            const totalUserSessions = calculateTotalSessions(patients);
            const patientLimit = currentUser?.max_patients || 0;
            generalDashboardContent.innerHTML = `
                <h2 class="text-xl font-semibold text-gray-700 mb-4">Dashboard Geral - ${currentUser?.full_name || 'Usuário'}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-white p-4 rounded-lg shadow border border-gray-200"><h3 class="text-sm font-medium text-gray-500 mb-1">Total de Clientes</h3><p class="text-3xl font-semibold text-indigo-600">${patients.length} / ${patientLimit}</p></div>
                    <div class="bg-white p-4 rounded-lg shadow border border-gray-200"><h3 class="text-sm font-medium text-gray-500 mb-1">Total de Sessões (Todos Clientes)</h3><p class="text-3xl font-semibold text-emerald-600">${totalUserSessions}</p></div>
                </div>
                <div class="mt-8 text-center text-gray-500 placeholder-container"><i class="fas fa-user-friends"></i><p>Selecione um cliente na barra lateral para ver um dashboard mais detalhado.</p></div>`;
        }
        updateContextualSidebar('dashboard-view', currentActiveArea);
    }
    function calculateOverallAverageProgress(patient) {
        if (!patient?.sessionData?.length) return '--';
        const interventionScores = patient.sessionData.filter(s => !(s.is_baseline || s.isBaseline) && typeof s.score === 'number').map(s => s.score);
        if (interventionScores.length === 0) return '--'; 
        const totalScore = interventionScores.reduce((sum, score) => sum + score, 0);
        const average = totalScore / interventionScores.length;
        return average.toFixed(1);
    }
    function calculateTotalSessions(patientsArray) {
        if (!patientsArray) return 0;
        return patientsArray.reduce((total, patient) => total + (patient.sessionData?.length || 0), 0);
    }

    // --- Modal Relatório Consolidado (Exclusivo para Terapeutas) ---
    function openConsolidatedReportModal() {
        if (!selectedPatient || currentUser.role !== 'terapeuta' || !consolidatedReportModal) { 
            if(currentUser.role === 'terapeuta') alert("Por favor, selecione um cliente para gerar o relatório."); 
            return; 
        }
        const reportTitleText = `Relatório Consolidado - ${selectedPatient.name}`;
        if(consolidatedReportTitle) consolidatedReportTitle.textContent = reportTitleText;
        if (consolidatedReportPrintTitle) consolidatedReportPrintTitle.textContent = reportTitleText;
        if (consolidatedReportClientNamePrint) consolidatedReportClientNamePrint.textContent = selectedPatient.name;
        if (consolidatedReportClientIdPrint) consolidatedReportClientIdPrint.textContent = selectedPatient.id;
        renderConsolidatedCharts(selectedPatient); 
        consolidatedReportModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; 
    }
    function closeConsolidatedReportModal() {
        if(consolidatedReportModal) consolidatedReportModal.classList.add('hidden');
        if(consolidatedChartsContainer) consolidatedChartsContainer.innerHTML = ''; 
        Object.values(consolidatedChartInstances).forEach(chart => chart.destroy()); 
        consolidatedChartInstances = {}; 
        document.body.style.overflow = ''; 
    }
    function renderConsolidatedCharts(patient) { 
        if (!consolidatedChartsContainer) return;
        consolidatedChartsContainer.innerHTML = ''; 
        Object.values(consolidatedChartInstances).forEach(chart => chart.destroy());
        consolidatedChartInstances = {};
        const assignedProgramIds = patient.assigned_program_ids || [];
        if (!assignedProgramIds?.length) { consolidatedChartsContainer.innerHTML = '<p class="text-center text-gray-500 py-6 col-span-full">Nenhum programa atribuído a este cliente.</p>'; return; }
        const assignedProgramsDetails = assignedProgramIds.map(id => getProgramById(id)).filter(p => p).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
        if (assignedProgramsDetails.length === 0) { consolidatedChartsContainer.innerHTML = '<p class="text-center text-gray-500 py-6 col-span-full">Detalhes dos programas atribuídos não encontrados.</p>'; return; }
        
        assignedProgramsDetails.forEach((program, index) => {
            const chartId = `modal-consolidated-chart-${program.id}-${index}`; 
            const wrapper = document.createElement('div');
            wrapper.className = 'consolidated-chart-wrapper border border-gray-200 rounded-md p-4 bg-gray-50 flex flex-col items-center shadow-sm print:border-gray-300 print:shadow-none print:bg-white print:break-inside-avoid';
            wrapper.innerHTML = `
                <h4 class="text-sm font-medium text-gray-600 mb-2 text-center">${program.title} <span class="text-xs text-gray-500">(${program.tag || 'N/A'})</span></h4>
                <div class="w-full h-48 sm:h-56 relative"> <canvas id="${chartId}"></canvas> </div>
                <p class="no-data-message text-xs text-gray-500 italic mt-2 hidden">Nenhum dado de sessão para este programa.</p>`;
            consolidatedChartsContainer.appendChild(wrapper);
            renderSingleConsolidatedChartForParent(patient.sessionData, program.id, chartId);
        });
    }
    
    // --- Geração de PDF (Exclusivo para Terapeutas) ---
    function generateProgramGradePDF(patient) {
        if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') { console.error("jsPDF não carregado."); alert("Erro: PDF não disponível."); return; }
        if (!patient || currentUser.role !== 'terapeuta') { alert("Nenhum cliente selecionado."); return; }
        const assignedProgramIds = patient.assigned_program_ids || [];
        if (assignedProgramIds.length === 0) { alert("Nenhum programa atribuído para gerar a Grade."); return; }
        const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 15, pageWidth = doc.internal.pageSize.getWidth(), pageHeight = doc.internal.pageSize.getHeight(), contentWidth = pageWidth - margin * 2;
        let y = margin + 10, lineHeight = 4.5, titleFontSize = 16, headerFontSize = 10, sectionTitleFontSize = 12, programTitleFontSize = 10, programDetailFontSize = 9, footerFontSize = 8, pageCount = 1;
        const totalPagesPlaceholder = "{totalPages}";
        const addWrappedText = (text, x, startY, maxWidth, options = {}) => { doc.setFontSize(options.fontSize || programDetailFontSize); doc.setFont(undefined, options.fontStyle || 'normal'); const lines = doc.splitTextToSize(text, maxWidth); doc.text(lines, x, startY); return startY + lines.length * (options.lineHeight || lineHeight); };
        const checkAndAddPage = (currentY, requiredHeight) => { if (currentY + requiredHeight > pageHeight - margin - 10) { addFooter(doc, pageCount, margin, pageHeight, footerFontSize, totalPagesPlaceholder); doc.addPage(); pageCount++; currentY = margin; doc.setFontSize(headerFontSize); doc.setFont(undefined, 'italic'); doc.text(`Grade de Programas - ${patient.name} (Continuação - Pág. ${pageCount})`, margin, currentY); currentY += 10; doc.setFont(undefined, 'normal'); } return currentY; };
        const addFooter = (pdfDoc, currentPage, docMargin, docPageHeight, fontSize, totalPagesStr) => { pdfDoc.setFontSize(fontSize); pdfDoc.setTextColor(100); const footerText = `Página ${currentPage} de ${totalPagesStr}`; pdfDoc.text(footerText, pdfDoc.internal.pageSize.getWidth() / 2, docPageHeight - docMargin / 2, { align: 'center' }); pdfDoc.text(`Gerado em: ${formatDate(new Date().toISOString().split('T')[0])}`, docMargin, docPageHeight - docMargin / 2); pdfDoc.setTextColor(0); };
        doc.setFontSize(titleFontSize); doc.setFont(undefined, 'bold'); doc.text(`Grade de Programas - ${patient.name}`, pageWidth / 2, y, { align: 'center' }); y += 8;
        doc.setFontSize(headerFontSize); doc.setFont(undefined, 'normal'); const dobText = `Nasc: ${patient.dob ? formatDate(patient.dob) : 'Não informado'}`; const diagText = `Diag: ${patient.diagnosis || 'Não informado'}`; doc.text(`ID: ${patient.id}`, margin, y); doc.text(dobText, margin + (contentWidth / 3), y); doc.text(diagText, pageWidth - margin, y, { align: 'right' }); y += 10;
        doc.setLineWidth(0.2); doc.line(margin, y, pageWidth - margin, y); y += 8;
        doc.setFontSize(sectionTitleFontSize); doc.setFont(undefined, 'bold'); y = checkAndAddPage(y, lineHeight * 2); doc.text("Programas Atribuídos:", margin, y); y += 6;
        const assignedProgramsDetails = assignedProgramIds.map(id => getProgramById(id)).filter(p => p).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
        if (assignedProgramsDetails.length === 0) { doc.setFontSize(programDetailFontSize); doc.setFont(undefined, 'normal'); y = checkAndAddPage(y, lineHeight); doc.text("Nenhum programa atribuído.", margin + 4, y); y += lineHeight; }
        else { assignedProgramsDetails.forEach(program => { let requiredHeight = 0; const titleTagText = `• ${program.title} (${program.tag || 'N/A'})`; doc.setFontSize(programTitleFontSize); doc.setFont(undefined, 'bold'); requiredHeight += doc.splitTextToSize(titleTagText, contentWidth - 4).length * (lineHeight + 0.5) + 2; doc.setFontSize(programDetailFontSize); doc.setFont(undefined, 'normal'); const objectiveLines = doc.splitTextToSize(`Objetivo: ${program.objective || 'Não definido'}`, contentWidth - 8); requiredHeight += objectiveLines.length * lineHeight + 2; let criteriaLines = []; if (program.criteria_for_advancement) { doc.setFont(undefined, 'italic'); criteriaLines = doc.splitTextToSize(`Critério de Avanço: ${program.criteria_for_advancement}`, contentWidth - 8); requiredHeight += criteriaLines.length * (lineHeight - 0.5) + 2; doc.setFont(undefined, 'normal'); } const firstStep = program.procedure && Array.isArray(program.procedure) && program.procedure.length > 0 ? program.procedure.find(step => step.term.toUpperCase() === 'SD') || program.procedure[0] : null; if (firstStep) { const procLines = doc.splitTextToSize(`Procedimento (Início - ${firstStep.term}): ${firstStep.description}`, contentWidth - 8); requiredHeight += procLines.length * lineHeight + 2; } requiredHeight += 4; y = checkAndAddPage(y, requiredHeight); y = addWrappedText(`• ${program.title} (${program.tag || 'N/A'})`, margin + 4, y, contentWidth - 4, { fontSize: programTitleFontSize, fontStyle: 'bold', lineHeight: lineHeight + 0.5 }); y += 1; y = addWrappedText(`Objetivo: ${program.objective || 'Não definido'}`, margin + 8, y, contentWidth - 8, { fontSize: programDetailFontSize, fontStyle: 'normal' }); y += 1; if (program.criteria_for_advancement) { doc.setFont(undefined, 'italic'); y = addWrappedText(`Critério de Avanço: ${program.criteria_for_advancement}`, margin + 8, y, contentWidth - 8, { fontSize: programDetailFontSize - 1, lineHeight: lineHeight -0.5 }); doc.setFont(undefined, 'normal'); y += 1; } if (firstStep) { y = addWrappedText(`Procedimento (Início - ${firstStep.term}): ${firstStep.description}`, margin + 8, y, contentWidth - 8, { fontSize: programDetailFontSize, fontStyle: 'normal' }); y += 1; } y += 4; }); }
        const totalPages = doc.internal.getNumberOfPages(); for (let i = 1; i <= totalPages; i++) { doc.setPage(i); addFooter(doc, i, margin, pageHeight, footerFontSize, totalPages.toString()); }
        try { const filename = `Grade_Programas_${patient.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`; doc.save(filename); console.log("PDF da Grade gerado:", filename); } catch (error) { console.error("Erro ao salvar PDF da Grade:", error); alert("Erro ao gerar PDF."); }
    }
    function generateWeeklyRecordSheetPDF(patient) {
        if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') { console.error("jsPDF não carregado."); alert("Erro: PDF não disponível."); return; }
        if (!patient || currentUser.role !== 'terapeuta') { alert("Nenhum cliente selecionado."); return; }
        const assignedProgramIds = patient.assigned_program_ids || [];
        if (assignedProgramIds.length === 0) { alert("Nenhum programa atribuído para gerar Folha de Registro."); return; }
        const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const margin = 10, pageWidth = doc.internal.pageSize.getWidth(), pageHeight = doc.internal.pageSize.getHeight(), contentWidth = pageWidth - margin * 2;
        let y = margin + 10, titleFontSize = 14, headerFontSize = 10, tableHeaderFontSize = 8, tableCellFontSize = 7, footerFontSize = 8, defaultRowHeight = 12, pageCount = 1;
        const totalPagesPlaceholder = "{totalPages}", daysOfWeek = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
        const addWrappedTextToCell = (text, x, startY, cellWidth, cellHeight, options = {}) => { doc.setFontSize(options.fontSize || tableCellFontSize); doc.setFont(undefined, options.fontStyle || 'normal'); const lines = doc.splitTextToSize(text, cellWidth - (options.padding || 2) * 2); const textHeight = lines.length * (options.lineHeight || 3.5); const textOffsetY = (cellHeight - textHeight) / 2 + (options.fontSize || tableCellFontSize) * 0.35; doc.text(lines, x + (options.padding || 2), startY + textOffsetY); return Math.max(cellHeight, textHeight + (options.padding || 2) * 2); };
        const drawTableHeader = (currentY) => { doc.setFontSize(tableHeaderFontSize); doc.setFont(undefined, 'bold'); doc.setDrawColor(50); doc.setLineWidth(0.3); doc.setFillColor(230, 230, 230); doc.rect(margin, currentY, contentWidth, defaultRowHeight, 'FD'); doc.setTextColor(0); const textY = currentY + defaultRowHeight / 2 + (tableHeaderFontSize * 0.35 / 2); doc.text("Programa", margin + 2, textY); doc.line(margin + programColWidth, currentY, margin + programColWidth, currentY + defaultRowHeight); let currentX = margin + programColWidth; daysOfWeek.forEach(day => { doc.text(day, currentX + dayColWidth / 2, textY, { align: 'center' }); if (day !== daysOfWeek[daysOfWeek.length - 1]) { doc.line(currentX + dayColWidth, currentY, currentX + dayColWidth, currentY + defaultRowHeight); } currentX += dayColWidth; }); return currentY + defaultRowHeight; };
        const checkAndAddPageLandscape = (currentY, requiredHeight) => { if (currentY + requiredHeight > pageHeight - margin - 10) { addFooter(doc, pageCount, margin, pageHeight, footerFontSize, totalPagesPlaceholder); doc.addPage(); pageCount++; currentY = margin; doc.setFontSize(headerFontSize); doc.setFont(undefined, 'italic'); doc.text(`Folha de Registro Semanal - ${patient.name} (Continuação - Pág. ${pageCount})`, margin, currentY); currentY += 10; doc.setFont(undefined, 'normal'); currentY = drawTableHeader(currentY); } return currentY; };
        const addFooter = (pdfDoc, currentPage, docMargin, docPageHeight, fontSize, totalPagesStr) => { pdfDoc.setFontSize(fontSize); pdfDoc.setTextColor(100); const footerText = `Página ${currentPage} de ${totalPagesStr}`; pdfDoc.text(footerText, pdfDoc.internal.pageSize.getWidth() / 2, docPageHeight - docMargin / 2, { align: 'center' }); pdfDoc.text(`Gerado em: ${formatDate(new Date().toISOString().split('T')[0])}`, docMargin, docPageHeight - docMargin / 2); pdfDoc.setTextColor(0); };
        doc.setFontSize(titleFontSize); doc.setFont(undefined, 'bold'); doc.text(`Folha de Registro Semanal - ${patient.name}`, pageWidth / 2, y, { align: 'center' }); y += 8;
        doc.setFontSize(headerFontSize); doc.setFont(undefined, 'normal'); doc.text(`ID: ${patient.id}`, margin, y); doc.text(`Semana de: ____ / ____ / ________`, pageWidth - margin, y, { align: 'right' }); y += 10;
        const programColWidth = contentWidth * 0.30, dayColWidth = (contentWidth - programColWidth) / daysOfWeek.length;
        y = drawTableHeader(y);
        const assignedProgramsDetails = assignedProgramIds.map(id => getProgramById(id)).filter(p => p).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
        doc.setFontSize(tableCellFontSize); doc.setFont(undefined, 'normal'); doc.setDrawColor(150); doc.setLineWidth(0.1);
        assignedProgramsDetails.forEach(program => { const programText = `${program.title} (${program.tag || 'N/A'})`; const programCellHeight = addWrappedTextToCell(programText, margin, y, programColWidth, defaultRowHeight, {padding: 1, lineHeight: 3}); const actualRowHeight = Math.max(defaultRowHeight, programCellHeight); y = checkAndAddPageLandscape(y, actualRowHeight); doc.rect(margin, y, programColWidth, actualRowHeight, 'S'); addWrappedTextToCell(programText, margin, y, programColWidth, actualRowHeight, {padding: 1, lineHeight: 3}); let currentX = margin + programColWidth; const numTrials = (typeof program.trials === 'number' && program.trials > 0) ? program.trials : 1; const trialCellWidth = dayColWidth / numTrials; daysOfWeek.forEach(() => { doc.rect(currentX, y, dayColWidth, actualRowHeight, 'S'); if (numTrials > 1) { for (let j = 1; j < numTrials; j++) { doc.line(currentX + (trialCellWidth * j), y, currentX + (trialCellWidth * j), y + actualRowHeight); } } currentX += dayColWidth; }); y += actualRowHeight; });
        const totalPages = doc.internal.getNumberOfPages(); for (let i = 1; i <= totalPages; i++) { doc.setPage(i); addFooter(doc, i, margin, pageHeight, footerFontSize, totalPages.toString()); }
        try { const filename = `Folha_Registro_${patient.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`; doc.save(filename); console.log("PDF da Folha de Registro gerado:", filename); } catch (error) { console.error("Erro ao salvar PDF da Folha de Registro:", error); alert("Erro ao gerar PDF."); }
    }
    async function generateConsolidatedReportPDF(patient) { 
        if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined' || typeof Chart === 'undefined') {
            console.error("jsPDF ou Chart.js não carregados.");
            alert("Erro: A funcionalidade de PDF não está disponível.");
            return;
        }
        if (!patient || currentUser.role !== 'terapeuta') { alert("Nenhum cliente selecionado."); return; }
        const assignedProgramIds = patient.assigned_program_ids || [];
        if (assignedProgramIds.length === 0) { alert("Nenhum programa atribuído para gerar o relatório."); return; }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 15, pageWidth = doc.internal.pageSize.getWidth(), pageHeight = doc.internal.pageSize.getHeight(), contentWidth = pageWidth - margin * 2;
        let y = margin, pageCount = 1;
        const footerFontSize = 8, totalPagesPlaceholder = "{totalPages}";

        const addHeaderToPage = (pdfDoc, patientData, currentPageY) => {
            pdfDoc.setFontSize(16); pdfDoc.setFont(undefined, 'bold');
            pdfDoc.text("Relatório Consolidado de Progresso", pageWidth / 2, currentPageY, { align: 'center' });
            currentPageY += 8;
            pdfDoc.setFontSize(10); pdfDoc.setFont(undefined, 'normal');
            pdfDoc.text(`Cliente: ${patientData.name}`, margin, currentPageY);
            pdfDoc.text(`ID: ${patientData.id}`, margin + contentWidth / 2, currentPageY);
            currentPageY += 5;
            pdfDoc.text(`Data Nasc.: ${patientData.dob ? formatDate(patientData.dob) : 'N/I'}`, margin, currentPageY);
            pdfDoc.text(`Diagnóstico: ${patientData.diagnosis || 'N/I'}`, margin + contentWidth / 2, currentPageY);
            currentPageY += 5;
            pdfDoc.text(`Gerado em: ${formatDate(new Date().toISOString().split('T')[0])}`, margin, currentPageY);
            currentPageY += 7;
            pdfDoc.setLineWidth(0.3); pdfDoc.line(margin, currentPageY, pageWidth - margin, currentPageY);
            currentPageY += 8;
            return currentPageY;
        };
        const addFooterToPage = (pdfDoc, currentPage, totalPagesStr) => {
            pdfDoc.setFontSize(footerFontSize); pdfDoc.setTextColor(100);
            const footerText = `Página ${currentPage} de ${totalPagesStr}`;
            pdfDoc.text(footerText, pageWidth / 2, pageHeight - margin / 1.5, { align: 'center' });
            pdfDoc.setTextColor(0);
        };

        y = addHeaderToPage(doc, patient, y);

        const assignedProgramsDetails = assignedProgramIds.map(id => getProgramById(id)).filter(p => p).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));

        for (const program of assignedProgramsDetails) {
            const programTitle = `${program.title} (${program.tag || 'N/A'})`;
            const programSpecificSessionData = (patient.sessionData || []).filter(session => String(session.program_id || session.programId) === String(program.id)).sort((a, b) => new Date(a.session_date || a.date) - new Date(b.session_date || b.date)).map(s => ({ ...s, score: parseFloat(s.score) }));
            
            const chartHeightMM = 65; 
            const titleHeightMM = 8;
            const spaceBetweenMM = 8;
            const requiredHeight = titleHeightMM + chartHeightMM + spaceBetweenMM;

            if (y + requiredHeight > pageHeight - margin - 10) { 
                addFooterToPage(doc, pageCount, totalPagesPlaceholder);
                doc.addPage();
                pageCount++;
                y = margin;
                y = addHeaderToPage(doc, patient, y); 
            }

            doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(50, 50, 50);
            doc.text(programTitle, margin, y);
            y += titleHeightMM;

            if (programSpecificSessionData.length > 0) {
                try {
                    const tempCanvas = document.createElement('canvas');
                    const canvasWidthPx = 800; 
                    const canvasHeightPx = chartHeightMM * (canvasWidthPx / contentWidth); 
                    tempCanvas.width = canvasWidthPx;
                    tempCanvas.height = canvasHeightPx;
                    const tempCtx = tempCanvas.getContext('2d');

                    const dates = programSpecificSessionData.map(session => formatDate(session.session_date || session.date, 'short'));
                    const scores = programSpecificSessionData.map(session => session.score);
                    const pointStyles = programSpecificSessionData.map(session => (session.is_baseline || session.isBaseline) ? 'rect' : 'circle');
                    const pointBackgroundColors = programSpecificSessionData.map(session => (session.is_baseline || session.isBaseline) ? '#fbbf24' : '#4f46e5');
                    const pointRadii = programSpecificSessionData.map(session => (session.is_baseline || session.isBaseline) ? 4 : 3); 

                    const chartInstance = new Chart(tempCtx, {
                        type: 'line',
                        data: { labels: dates, datasets: [{ label: 'Pontuação (%)', data: scores, borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.05)', pointStyle: pointStyles, pointBackgroundColor: pointBackgroundColors, pointRadius: pointRadii, pointBorderColor: '#fff', fill: true, tension: 0.1, borderWidth: 1.5 }] },
                        options: {
                            responsive: false, 
                            animation: false,
                            devicePixelRatio: 2, 
                            scales: { y: { beginAtZero: true, max: 100, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } },
                            plugins: { legend: { display: false }, tooltip: { enabled: false } } 
                        }
                    });
                    
                    const imageDataUrl = tempCanvas.toDataURL('image/png', 1.0); 
                    doc.addImage(imageDataUrl, 'PNG', margin, y, contentWidth, chartHeightMM);
                    y += chartHeightMM;
                    chartInstance.destroy(); 
                } catch (chartError) {
                    console.error("Erro ao renderizar gráfico para PDF:", chartError);
                    doc.setFontSize(9); doc.setTextColor(150, 0, 0);
                    doc.text("Erro ao gerar gráfico.", margin + 5, y + chartHeightMM / 2);
                    y += chartHeightMM;
                }
            } else {
                doc.setFontSize(9); doc.setTextColor(100);
                doc.text("Nenhum dado de sessão registrado para este programa.", margin + 5, y + chartHeightMM / 2);
                y += chartHeightMM;
            }
            y += spaceBetweenMM;
        }
        
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addFooterToPage(doc, i, totalPages.toString());
        }

        try {
            const filename = `Relatorio_Consolidado_${patient.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
            doc.save(filename);
            console.log("PDF do Relatório Consolidado gerado:", filename);
        } catch (error) {
            console.error("Erro ao salvar PDF do Relatório Consolidado:", error);
            alert("Erro ao gerar PDF do Relatório Consolidado.");
        }
    }

    // --- Funções Utilitárias ---
    function formatDate(dateString, format = 'long') {
        if (!dateString) return 'N/A';
        let date;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString.split('T')[0])) {
            date = new Date(dateString.split('T')[0] + 'T00:00:00'); 
        } else {
            date = new Date(dateString);
        }
        if (isNaN(date.getTime())) { return 'Data inválida'; }
        const options = format === 'short' 
            ? { day: '2-digit', month: '2-digit', year: '2-digit' } 
            : { day: '2-digit', month: '2-digit', year: 'numeric' };
        try { return date.toLocaleDateString('pt-BR', options); }
        catch (e) { console.error("Erro ao formatar data:", e); return dateString; }
    }

    // --- Inicia a aplicação ---
    initializeApp();
});
