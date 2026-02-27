'use strict';

/**
 * SCP — Navigation Module
 * Handles view switching, browser history, mobile menu, dashboard tabs and filters
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
            { id: 'history', label: 'Histórico', icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>' },
            { id: 'coverage', label: 'Coberturas', icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>' }
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
    },

    /**
     * Builds the attendance controls bar with filters and view toggle
     */
    buildAttendanceControls() {
        const controls = document.getElementById('attendance-controls');
        if (!controls) return;

        // Initialize attendance filter state if needed
        if (!SCP.state.attendanceFilters) {
            SCP.state.attendanceFilters = {
                search: '',
                status: null,
                supervisor: null,
                funcao: null,
                viewMode: 'cards' // cards | groups | table
            };
        }

        const af = SCP.state.attendanceFilters;

        // Get unique supervisors and functions from employees
        const supervisors = [...new Set(SCP.state.employees.map(e => e.supervisor).filter(Boolean))].sort();
        const funcoes = [...new Set(SCP.state.employees.map(e => e.funcao).filter(Boolean))].sort();
        const statusCodes = Object.entries(SCP.CONFIG.STATUS_CODES);

        controls.innerHTML = `
            <div class="filter-group" style="flex:1;min-width:180px;">
                <div style="position:relative;width:100%;">
                    <svg style="position:absolute;left:12px;top:8px;width:14px;height:14px;color:var(--text-3)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input type="text" class="filter-search" placeholder="Buscar por nome..." value="${af.search}" oninput="SCP.navigation.filterAttendance('search', this.value)">
                </div>
            </div>

            <div class="filter-group" style="overflow-x:auto;flex-shrink:0;">
                <select style="padding:6px 10px;font-size:0.75rem;border:1px solid var(--border);border-radius:6px;background:var(--bg-1);color:var(--text-2);outline:none;" onchange="SCP.navigation.filterAttendance('supervisor', this.value)">
                    <option value="">Supervisor</option>
                    ${supervisors.map(s => `<option value="${s}" ${af.supervisor === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
                <select style="padding:6px 10px;font-size:0.75rem;border:1px solid var(--border);border-radius:6px;background:var(--bg-1);color:var(--text-2);outline:none;" onchange="SCP.navigation.filterAttendance('funcao', this.value)">
                    <option value="">Função</option>
                    ${funcoes.map(f => `<option value="${f}" ${af.funcao === f ? 'selected' : ''}>${f}</option>`).join('')}
                </select>
                <select style="padding:6px 10px;font-size:0.75rem;border:1px solid var(--border);border-radius:6px;background:var(--bg-1);color:var(--text-2);outline:none;" onchange="SCP.navigation.filterAttendance('status', this.value)">
                    <option value="">Status</option>
                    ${statusCodes.map(([code, info]) => `<option value="${code}" ${af.status === code ? 'selected' : ''}>${info.label}</option>`).join('')}
                </select>
            </div>

            <div class="view-toggle">
                <button class="${af.viewMode === 'cards' ? 'active' : ''}" onclick="SCP.navigation.filterAttendance('viewMode', 'cards')" title="Cards">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                </button>
                <button class="${af.viewMode === 'groups' ? 'active' : ''}" onclick="SCP.navigation.filterAttendance('viewMode', 'groups')" title="Grupos">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                </button>
                <button class="${af.viewMode === 'table' ? 'active' : ''}" onclick="SCP.navigation.filterAttendance('viewMode', 'table')" title="Tabela">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                </button>
            </div>
        `;
    },

    filterAttendance(key, value) {
        if (!SCP.state.attendanceFilters) {
            SCP.state.attendanceFilters = { search: '', status: null, supervisor: null, funcao: null, viewMode: 'cards' };
        }
        SCP.state.attendanceFilters[key] = value || null;
        if (key === 'viewMode') this.buildAttendanceControls();
        SCP.attendance.render();
    },

    getFilteredEmployees() {
        if (!SCP.state.attendanceFilters) return SCP.state.employees;

        const af = SCP.state.attendanceFilters;
        return SCP.state.employees.filter(emp => {
            if (af.search && !emp.nome.toLowerCase().includes(af.search.toLowerCase())) return false;
            if (af.supervisor && emp.supervisor !== af.supervisor) return false;
            if (af.funcao && emp.funcao !== af.funcao) return false;
            if (af.status) {
                const record = SCP.state.attendanceRecords[emp.id];
                const currentStatus = record ? (typeof record === 'string' ? record : record.status) : null;
                if (currentStatus !== af.status) return false;
            }
            return true;
        });
    }
};
