'use strict';

/**
 * SCP — Dashboard View
 * Dashboard with board, charts, team effectiveness, and history tabs
 */
window.SCP = window.SCP || {};

SCP.dashboard = {
    render() {
        const container = document.getElementById('dashboard-content');
        if (!container) return;

        if (!SCP.state.dashboardData) {
            container.innerHTML = '<div style="text-align:center;padding:60px;"><div class="animate-spin" style="width:40px;height:40px;border:4px solid var(--accent);border-top-color:transparent;border-radius:50%;margin:0 auto 16px;"></div><p style="color:var(--text-3)">Carregando dados...</p></div>';
            return;
        }

        switch (SCP.state.dashboardTab) {
            case 'board': this.renderBoard(container); break;
            case 'charts': this.renderCharts(container); break;
            case 'team': this.renderTeam(container); break;
            case 'history': this.renderHistory(container); break;
            default: this.renderBoard(container);
        }
    },

    renderBoard(container) {
        const { fullGrid } = SCP.state.dashboardData;
        const today = SCP.helpers.getCurrentDate();

        container.innerHTML = `
            <div class="board-container fade-in">
                <div class="board-scroll">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th class="sticky-name">Nome</th>
                                <th>Sup.</th>
                                ${fullGrid.dates.map(d => `<th class="text-center ${d === today ? 'today-column' : ''}" style="min-width:50px">${SCP.helpers.formatDateShort(d)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${fullGrid.employees.map(e => `
                                <tr>
                                    <td class="sticky-name">${e.nome}</td>
                                    <td style="color:var(--text-3);font-size:0.75rem;white-space:nowrap">${e.supervisor}</td>
                                    ${fullGrid.dates.map(d => {
            const s = fullGrid.records[e.id]?.[d];
            const info = s ? SCP.CONFIG.STATUS_CODES[s] : null;
            return `<td class="text-center ${d === today ? 'today-column' : ''}" style="padding:4px">${info ? `<div class="status-dot" style="background:${info.bg};color:${info.text}">${s}</div>` : '<span style="color:var(--bg-4)">-</span>'}</td>`;
        }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Auto-scroll to today
        setTimeout(() => {
            const el = container.querySelector('.today-column');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 200);
    },

    renderCharts(container) {
        const d = SCP.state.dashboardData;
        const total = Object.values(d.statusTotals).reduce((a, b) => a + b, 0);

        container.innerHTML = `
            <div class="stat-cards fade-in">
                <div class="stat-card" style="border-color:var(--green)">
                    <div class="stat-label">Presença</div>
                    <div class="stat-value">${total ? Math.round((d.statusTotals.P / total) * 100) : 0}%</div>
                </div>
                <div class="stat-card" style="border-color:var(--red)">
                    <div class="stat-label">Faltas</div>
                    <div class="stat-value">${total ? Math.round((d.statusTotals.F / total) * 100) : 0}%</div>
                </div>
                <div class="stat-card" style="border-color:var(--orange)">
                    <div class="stat-label">Atestados</div>
                    <div class="stat-value">${d.statusTotals.AT || 0}</div>
                </div>
                <div class="stat-card" style="border-color:var(--blue)">
                    <div class="stat-label">Total Registros</div>
                    <div class="stat-value">${total}</div>
                </div>
            </div>
            <div class="charts-grid fade-in">
                <div class="chart-card"><h3>Evolução de Presença vs Faltas</h3><canvas id="trendChart"></canvas></div>
                <div class="chart-card"><h3>Distribuição de Status</h3><canvas id="statusChart"></canvas></div>
                <div class="chart-card"><h3>Top Faltas por Colaborador</h3><canvas id="topIssuesChart"></canvas></div>
                <div class="chart-card"><h3>Taxa de Presença Diária</h3><canvas id="evolutionChart"></canvas></div>
            </div>
        `;

        setTimeout(() => this._buildCharts(), 100);
    },

    renderTeam(container) {
        container.innerHTML = '<div class="team-chart-container fade-in"><h3>Eficiência por Supervisor</h3><div style="height:calc(100% - 40px)"><canvas id="teamEffectivenessChart"></canvas></div></div>';
        setTimeout(() => this._buildTeamChart(), 100);
    },

    renderHistory(container) {
        container.innerHTML = `
            <div class="fade-in">
                <div class="history-search">
                    <div style="position:relative">
                        <svg style="position:absolute;left:12px;top:12px;width:16px;height:16px;color:var(--text-3)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <input type="text" placeholder="Buscar colaborador..." value="${SCP.state.searchQuery}" oninput="SCP.dashboard.filterHistory(this.value)">
                    </div>
                </div>
                <div id="historyResultsGrid" class="history-cards">
                    ${this._generateHistoryCards(SCP.state.searchQuery)}
                </div>
            </div>
        `;
    },

    filterHistory(query) {
        SCP.state.searchQuery = query;
        const grid = document.getElementById('historyResultsGrid');
        if (grid) grid.innerHTML = this._generateHistoryCards(query);
    },

    _generateHistoryCards(query) {
        const { employees, records, dates } = SCP.state.dashboardData.fullGrid;
        const q = (query || '').toLowerCase();
        const filtered = employees.filter(e => e.nome.toLowerCase().includes(q));

        if (filtered.length === 0) return '<p style="text-align:center;color:var(--text-3);padding:32px;grid-column:1/-1">Nenhum resultado encontrado.</p>';

        return filtered.slice(0, 50).map(emp => {
            let stats = { P: 0, F: 0, AT: 0 };
            let history = [];
            dates.forEach(d => {
                const s = records[emp.id]?.[d];
                if (s) {
                    if (stats[s] !== undefined) stats[s]++;
                    history.push({ date: d, status: s });
                }
            });
            const total = stats.P + stats.F + stats.AT;
            const rate = total > 0 ? Math.round((stats.P / total) * 100) : 0;

            return `
                <div class="history-card">
                    <div class="history-card-header">
                        <div>
                            <h4>${emp.nome}</h4>
                            <p style="font-size:0.75rem;color:var(--text-3)">${emp.supervisor} | ${emp.funcao}</p>
                        </div>
                        <div style="text-align:right">
                            <span class="rate ${stats.F > 2 ? 'bad' : 'good'}">${rate}%</span>
                            <p style="font-size:0.6rem;color:var(--text-3)">Presença</p>
                        </div>
                    </div>
                    <div class="history-timeline no-scrollbar">
                        ${history.reverse().slice(0, 10).map(h => `
                            <div class="day">
                                <span class="day-date">${SCP.helpers.formatDateShort(h.date)}</span>
                                <span class="day-status" style="color:${SCP.CONFIG.STATUS_CODES[h.status]?.color}">${h.status}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    },

    _destroyCharts() {
        Object.values(SCP.state.charts).forEach(c => c && c.destroy());
        SCP.state.charts = {};
    },

    _buildCharts() {
        this._destroyCharts();
        const d = SCP.state.dashboardData;
        if (!d) return;

        // Trend
        const trendCtx = document.getElementById('trendChart')?.getContext('2d');
        if (trendCtx) {
            SCP.state.charts.trend = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: d.dailyStats.map(i => SCP.helpers.formatDateShort(i.date)),
                    datasets: [
                        { label: 'Presentes', data: d.dailyStats.map(i => i.P || 0), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3 },
                        { label: 'Faltas', data: d.dailyStats.map(i => i.F || 0), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.3 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
            });
        }

        // Status Distribution
        const statusCtx = document.getElementById('statusChart')?.getContext('2d');
        if (statusCtx) {
            const stats = Object.entries(d.statusTotals).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
            SCP.state.charts.status = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: stats.map(([c]) => SCP.CONFIG.STATUS_CODES[c]?.label || c),
                    datasets: [{ data: stats.map(([, c]) => c), backgroundColor: stats.map(([c]) => SCP.CONFIG.STATUS_CODES[c]?.color || '#ccc'), borderWidth: 0 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
            });
        }

        // Top Issues
        const issuesCtx = document.getElementById('topIssuesChart')?.getContext('2d');
        if (issuesCtx) {
            SCP.state.charts.topIssues = new Chart(issuesCtx, {
                type: 'bar',
                data: {
                    labels: d.topFaltas.slice(0, 10).map(i => i.name.split(' ').slice(0, 2).join(' ')),
                    datasets: [{ label: 'Faltas', data: d.topFaltas.slice(0, 10).map(i => i.count), backgroundColor: '#ef4444', borderRadius: 4 }]
                },
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
            });
        }

        // Daily Evolution
        const evoCtx = document.getElementById('evolutionChart')?.getContext('2d');
        if (evoCtx) {
            const rates = d.dailyStats.map(i => {
                const t = Object.entries(i).reduce((s, [k, v]) => k !== 'date' && typeof v === 'number' ? s + v : s, 0);
                return t > 0 ? Math.round((i.P || 0) / t * 100) : 0;
            });
            SCP.state.charts.evolution = new Chart(evoCtx, {
                type: 'bar',
                data: {
                    labels: d.dailyStats.map(i => SCP.helpers.formatDateShort(i.date)),
                    datasets: [{ label: 'Taxa (%)', data: rates, backgroundColor: rates.map(r => r >= 95 ? '#10b981' : r >= 85 ? '#f59e0b' : '#ef4444'), borderRadius: 4 }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { max: 100 } } }
            });
        }
    },

    _buildTeamChart() {
        this._destroyCharts();
        const ctx = document.getElementById('teamEffectivenessChart')?.getContext('2d');
        if (!ctx || !SCP.state.dashboardData) return;

        const { employees, records, dates } = SCP.state.dashboardData.fullGrid;
        const supStats = {};
        employees.forEach(e => {
            if (!supStats[e.supervisor]) supStats[e.supervisor] = { t: 0, p: 0 };
            dates.forEach(d => {
                const s = records[e.id]?.[d];
                if (s) { supStats[e.supervisor].t++; if (s === 'P') supStats[e.supervisor].p++; }
            });
        });

        const labels = Object.keys(supStats);
        const data = labels.map(s => supStats[s].t > 0 ? Math.round((supStats[s].p / supStats[s].t) * 100) : 0);

        SCP.state.charts.team = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Eficiência (%)', data, backgroundColor: '#3b82f6', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { max: 100 } } }
        });
    },

    async applyFilters() {
        SCP.helpers.showLoading(true);
        await SCP.api.loadDashboard(SCP.state.filters.startDate, SCP.state.filters.endDate);
        SCP.helpers.showLoading(false);
        this.render();
        if (SCP.state.dashboardTab === 'charts') setTimeout(() => this._buildCharts(), 100);
        if (SCP.state.dashboardTab === 'team') setTimeout(() => this._buildTeamChart(), 100);
    },

    updateFilter(key, value) {
        SCP.state.filters[key] = value;
        if (key === 'startDate' || key === 'endDate') SCP.state.filters.period = 'custom';
    },

    setPeriod(p) {
        const today = new Date();
        let start;
        if (p === '7days') { start = new Date(); start.setDate(start.getDate() - 7); }
        else if (p === '30days') { start = new Date(); start.setDate(start.getDate() - 30); }
        else if (p === 'thisMonth') { start = new Date(today.getFullYear(), today.getMonth(), 1); }

        SCP.state.filters.startDate = start.toISOString().split('T')[0];
        SCP.state.filters.endDate = SCP.helpers.getCurrentDate();
        SCP.state.filters.period = p;
        this.applyFilters();
    },

    switchTab(tab) {
        SCP.state.dashboardTab = tab;
        this.render();
        if (tab === 'charts') setTimeout(() => this._buildCharts(), 100);
        if (tab === 'team') setTimeout(() => this._buildTeamChart(), 100);
    }
};
