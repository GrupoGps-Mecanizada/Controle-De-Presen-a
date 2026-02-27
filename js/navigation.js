'use strict';

/**
 * SCP — Navigation Module
 * Handles view switching, browser history, and mobile menu
 */
window.SCP = window.SCP || {};

SCP.navigation = {
    /**
     * Aplica visibilidade de botões/views com base no perfil do login
     * SUPERVISOR (@mecanizada.com): vê apenas Presença
     * GESTAO (@gestaomecanizada.com): vê apenas Dashboard
     * ADM (@sge): vê tudo
     */
    applyRoleVisibility() {
        if (!SCP.auth || !SCP.auth.currentUser) return;
        const perfil = SCP.auth.currentUser.perfil;

        const btnPresenca = document.querySelector('.nav-btn[data-view="attendance"]');
        const btnDashboard = document.querySelector('.nav-btn[data-view="dashboard"]');

        // Por padrão, mostra tudo (ADM)
        if (btnPresenca) btnPresenca.style.display = '';
        if (btnDashboard) btnDashboard.style.display = '';

        if (perfil === 'SUPERVISOR') {
            // Supervisor: esconde Dashboard
            if (btnDashboard) btnDashboard.style.display = 'none';
        } else if (perfil === 'GESTAO') {
            // Gestão: esconde Presença
            if (btnPresenca) btnPresenca.style.display = 'none';
        }
        // ADM: não esconde nada
    },

    switchView(view, skipHash = false) {
        // Hide all views first
        document.querySelectorAll('#main .view').forEach(v => v.classList.remove('active'));

        // Show target view
        const target = document.getElementById(`${view}-view`);
        if (target) target.classList.add('active');

        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        SCP.state.activeView = view;

        // Apply role visibility after showing the view
        this.applyRoleVisibility();

        // Push state if not restoring
        if (!skipHash) {
            window.history.pushState({ view }, '', `#${view}`);
        }

        // Render view content
        if (view === 'attendance' && SCP.attendance) SCP.attendance.render();
        if (view === 'dashboard' && SCP.dashboard) SCP.dashboard.render();
    },

    getInitialView() {
        const hash = window.location.hash.replace('#', '');
        if (hash === 'attendance' || hash === 'dashboard') return hash;
        return SCP.helpers.hasGestaoAccess() ? 'dashboard' : 'attendance';
    },

    buildDashboardHeader() {
        const header = document.getElementById('dash-header');
        if (!header) return;

        const tabs = [
            { id: 'board', label: 'Quadro Geral', icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>' },
            { id: 'charts', label: 'Gráficos', icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>' },
            { id: 'team', label: 'Efetivo', icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>' },
            { id: 'history', label: 'Histórico', icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>' }
        ];

        header.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                <div>
                    <h1 style="font-size:1.25rem;font-weight:800;color:var(--text-1)">Dashboard</h1>
                    <p class="subtitle">Gestão de Presença</p>
                </div>
            </div>
            <div class="dash-tabs">
                ${tabs.map(tab => `
                    <button class="tab-btn ${SCP.state.dashboardTab === tab.id ? 'active' : ''}" onclick="SCP.dashboard.switchTab('${tab.id}')">
                        ${tab.icon} ${tab.label}
                    </button>
                `).join('')}
            </div>
        `;
    },

    buildDashboardFilters() {
        const filters = document.getElementById('dash-filters');
        if (!filters) return;

        filters.innerHTML = `
            <div class="period-btns">
                <button class="${SCP.state.filters.period === '7days' ? 'active' : ''}" onclick="SCP.dashboard.setPeriod('7days')">7D</button>
                <button class="${SCP.state.filters.period === '30days' ? 'active' : ''}" onclick="SCP.dashboard.setPeriod('30days')">30D</button>
                <button class="${SCP.state.filters.period === 'thisMonth' ? 'active' : ''}" onclick="SCP.dashboard.setPeriod('thisMonth')">Mês</button>
            </div>
            <div class="date-range">
                <input type="date" value="${SCP.state.filters.startDate}" onchange="SCP.dashboard.updateFilter('startDate', this.value)">
                <span style="color:var(--text-3)">→</span>
                <input type="date" value="${SCP.state.filters.endDate}" onchange="SCP.dashboard.updateFilter('endDate', this.value)">
                <button class="apply-btn" onclick="SCP.dashboard.applyFilters()">OK</button>
            </div>
        `;
    }
};
