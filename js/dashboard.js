'use strict';

/**
 * SCP — Dashboard View
 * Dashboard with board, charts, team effectiveness, history and coverage tabs
 */
window.SCP = window.SCP || {};

SCP.dashboard = {
    render() {
        const container = document.getElementById('dashboard-content');
        if (!container) return;

        if (!SCP.state.dashboardData) {
            container.innerHTML = `
                <div style="padding:40px;">
                    <div class="stat-cards">
                        ${Array.from({ length: 4 }, () => '<div class="skeleton skeleton-card"></div>').join('')}
                    </div>
                    <div class="charts-grid">
                        ${Array.from({ length: 2 }, () => '<div class="skeleton" style="height:280px;border-radius:var(--radius)"></div>').join('')}
                    </div>
                </div>`;
            return;
        }

        switch (SCP.state.dashboardTab) {
            case 'board': this.renderBoard(container); break;
            case 'charts': this.renderCharts(container); break;
            case 'team': this.renderTeam(container); break;
            case 'history': this.renderHistory(container); break;
            case 'coverage': this.renderCoverage(container); break;
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

        setTimeout(() => {
            const el = container.querySelector('.today-column');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 200);
    },

    renderCharts(container) {
        const d = SCP.state.dashboardData;
        const total = Object.values(d.statusTotals).reduce((a, b) => a + b, 0);

        const statCards = [
            { label: 'Presença', value: total ? Math.round((d.statusTotals.P / total) * 100) + '%' : '0%', sub: `${d.statusTotals.P || 0} registros`, color: 'var(--green)', icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>' },
            { label: 'Faltas', value: `${d.statusTotals.F || 0}`, sub: total ? Math.round(((d.statusTotals.F || 0) / total) * 100) + '% do total' : '—', color: 'var(--red)', icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>' },
            { label: 'Atestados', value: `${d.statusTotals.AT || 0}`, sub: total ? Math.round(((d.statusTotals.AT || 0) / total) * 100) + '% do total' : '—', color: 'var(--orange)', icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>' },
            { label: 'Férias', value: `${d.statusTotals.FE || 0}`, sub: 'colaboradores', color: 'var(--cyan)', icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' },
            { label: 'Afastados', value: `${d.statusTotals.AF || 0}`, sub: 'colaboradores', color: 'var(--gray)', icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' },
            { label: 'Folgas', value: `${d.statusTotals.FO || 0}`, sub: 'registros', color: 'var(--purple)', icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>' },
            { label: 'Treinamento', value: `${d.statusTotals.TR || 0}`, sub: 'registros', color: 'var(--blue)', icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>' },
            { label: 'Troca Horário', value: `${d.statusTotals.TH || 0}`, sub: 'registros', color: 'var(--teal)', icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>' },
            { label: 'Troca Escala', value: `${d.statusTotals.TE || 0}`, sub: 'registros', color: 'var(--pink)', icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>' },
            { label: 'Hora Extra', value: `${d.statusTotals.EX || 0}`, sub: 'registros', color: 'var(--teal)', icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' },
            { label: 'Desligados', value: `${d.statusTotals.DS || 0}`, sub: 'colaboradores', color: 'var(--slate)', icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>' },
            { label: 'Total', value: `${total}`, sub: 'registros no período', color: 'var(--accent)', icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>' }
        ];

        // Highlight critical indicators
        const faultRate = total > 0 ? ((d.statusTotals.F || 0) / total) * 100 : 0;
        const criticalClass = faultRate > 10 ? 'critical-pulse' : '';

        container.innerHTML = `
            <div class="stat-cards stagger-children fade-in">
                ${statCards.map(c => {
            const isCritical = c.label === 'Faltas' && faultRate > 10;
            return `
                    <div class="stat-card ${isCritical ? 'critical-card' : ''}" style="border-color:${c.color}">
                        <div class="stat-icon" style="color:${c.color}">${c.icon}</div>
                        <div class="stat-label">${c.label}</div>
                        <div class="stat-value">${c.value}</div>
                        <div class="stat-sub">${c.sub}</div>
                    </div>
                `;
        }).join('')}
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
                        <svg style="position:absolute;left:14px;top:13px;width:16px;height:16px;color:var(--text-3)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <input type="text" placeholder="Buscar colaborador por nome..." value="${SCP.state.searchQuery}" oninput="SCP.dashboard.filterHistory(this.value)">
                    </div>
                </div>
                <div id="historyResultsGrid" class="history-cards">
                    ${this._generateHistoryCards(SCP.state.searchQuery)}
                </div>
            </div>
        `;
    },

    renderCoverage(container) {
        const { employees, records, dates } = SCP.state.dashboardData.fullGrid;
        const coverages = [];

        employees.forEach(emp => {
            dates.forEach(d => {
                const rec = records[emp.id]?.[d];
                if (rec && typeof rec === 'object' && rec.replacement_employee_name) {
                    coverages.push({
                        date: d,
                        absent: emp.nome,
                        absentSup: emp.supervisor,
                        status: rec.status || rec,
                        replacement: rec.replacement_employee_name,
                        observation: rec.observations || ''
                    });
                }
            });
        });

        coverages.sort((a, b) => b.date.localeCompare(a.date));

        if (coverages.length === 0) {
            container.innerHTML = `
                <div class="coverage-container fade-in">
                    <div class="coverage-empty">
                        <svg width="40" height="40" fill="none" stroke="var(--border)" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:12px;"><path stroke-linecap="round" stroke-linejoin="round" d="M16 17v-4a4 4 0 00-4-4H8m0 0l4 4m-4-4l4-4m-4 14h8V5H4v14h8z"></path></svg>
                        <p><strong>Nenhuma cobertura registrada</strong></p>
                        <p style="font-size:0.78rem;margin-top:6px;color:var(--text-3)">Quando um colaborador for coberto por outro, o histórico aparecerá aqui.</p>
                    </div>
                </div>
            `;
            return;
        }

        // Group coverages by date for better visualization
        const byDate = {};
        coverages.forEach(c => {
            if (!byDate[c.date]) byDate[c.date] = [];
            byDate[c.date].push(c);
        });

        container.innerHTML = `
            <div class="coverage-container fade-in">
                <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <h3 style="font-size:0.95rem;font-weight:700;color:var(--text-1)">Histórico de Coberturas</h3>
                        <p style="font-size:0.72rem;color:var(--text-3);margin-top:2px;">${coverages.length} cobertura${coverages.length !== 1 ? 's' : ''} registrada${coverages.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div class="badge" style="background:var(--blue-bg);color:var(--blue-text)">${Object.keys(byDate).length} dia${Object.keys(byDate).length !== 1 ? 's' : ''}</div>
                </div>
                <div style="overflow-x:auto;">
                    <table class="coverage-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Colaborador Ausente</th>
                                <th>Supervisor</th>
                                <th>Status</th>
                                <th>Coberto por</th>
                                <th>Observação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${coverages.map(c => {
            const info = SCP.CONFIG.STATUS_CODES[c.status];
            return `
                                    <tr>
                                        <td style="white-space:nowrap;font-weight:600">${SCP.helpers.formatDateShort(c.date)}</td>
                                        <td style="font-weight:600;color:var(--text-1)">${c.absent}</td>
                                        <td style="color:var(--text-3);font-size:0.78rem">${c.absentSup}</td>
                                        <td>${info ? `<span class="badge" style="background:${info.bg};color:${info.text}">${info.label}</span>` : c.status}</td>
                                        <td style="font-weight:600;color:var(--text-1)">${c.replacement}</td>
                                        <td style="color:var(--text-3);font-size:0.75rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.observation || '—'}</td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
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

        if (filtered.length === 0) return '<p style="text-align:center;color:var(--text-3);padding:40px;grid-column:1/-1">Nenhum resultado encontrado.</p>';

        // Calculate ranking for all employees first
        const allRanks = employees.map(emp => {
            let totalR = 0, pCount = 0;
            dates.forEach(d => {
                const raw = records[emp.id]?.[d];
                const s = typeof raw === 'string' ? raw : (raw && raw.status ? raw.status : null);
                if (s) { totalR++; if (s === 'P') pCount++; }
            });
            return { id: emp.id, rate: totalR > 0 ? Math.round((pCount / totalR) * 100) : 0 };
        }).sort((a, b) => b.rate - a.rate);

        return filtered.slice(0, 50).map(emp => {
            const allCodes = Object.keys(SCP.CONFIG.STATUS_CODES);
            const stats = {};
            allCodes.forEach(c => stats[c] = 0);

            let history = [];
            let consecutiveFaults = 0;
            let maxConsecutiveFaults = 0;

            dates.forEach(d => {
                const raw = records[emp.id]?.[d];
                const s = typeof raw === 'string' ? raw : (raw && raw.status ? raw.status : null);
                if (s) {
                    if (stats[s] !== undefined) stats[s]++;
                    history.push({ date: d, status: s });

                    if (s === 'F') {
                        consecutiveFaults++;
                        if (consecutiveFaults > maxConsecutiveFaults) maxConsecutiveFaults = consecutiveFaults;
                    } else {
                        consecutiveFaults = 0;
                    }
                }
            });

            const totalRecords = Object.values(stats).reduce((a, b) => a + b, 0);
            const rate = totalRecords > 0 ? Math.round((stats.P / totalRecords) * 100) : 0;

            // Ranking position
            const rank = allRanks.findIndex(r => r.id === emp.id) + 1;
            const rankTotal = allRanks.length;

            const alerts = [];
            if (maxConsecutiveFaults >= 3) alerts.push({ text: `${maxConsecutiveFaults} faltas consecutivas`, type: 'danger' });
            if (stats.F > 5) alerts.push({ text: `${stats.F} faltas no período`, type: 'danger' });
            else if (stats.F > 2) alerts.push({ text: `${stats.F} faltas no período`, type: 'warning' });
            if (stats.AT > 3) alerts.push({ text: `${stats.AT} atestados`, type: 'warning' });
            if (stats.AF > 0) alerts.push({ text: `${stats.AF} dias afastado`, type: 'info' });
            if (stats.FE > 0) alerts.push({ text: `${stats.FE} dias férias`, type: 'info' });
            if (stats.TR > 0) alerts.push({ text: `${stats.TR} treinamentos`, type: 'info' });

            const rateClass = rate >= 90 ? 'good' : rate >= 75 ? 'warning' : 'bad';
            const borderColor = rate >= 90 ? 'var(--green)' : rate >= 75 ? 'var(--orange)' : 'var(--red)';

            // Progress ring SVG
            const circumference = 2 * Math.PI * 18;
            const dashOffset = circumference - (rate / 100) * circumference;
            const ringColor = rate >= 90 ? '#10b981' : rate >= 75 ? '#f59e0b' : '#ef4444';

            return `
                <div class="history-card" style="border-left-color:${borderColor}">
                    <div class="history-card-header">
                        <div>
                            <h4>${emp.nome}</h4>
                            <p style="font-size:0.72rem;color:var(--text-3)">${emp.supervisor || '—'} · ${emp.funcao || '—'}</p>
                            ${rank > 0 ? `<p style="font-size:0.6rem;color:var(--text-3);margin-top:2px">#${rank} de ${rankTotal}</p>` : ''}
                        </div>
                        <div style="text-align:right;display:flex;flex-direction:column;align-items:center;">
                            <svg width="48" height="48" viewBox="0 0 44 44" style="margin:-2px">
                                <circle cx="22" cy="22" r="18" fill="none" stroke="var(--bg-3)" stroke-width="3"/>
                                <circle cx="22" cy="22" r="18" fill="none" stroke="${ringColor}" stroke-width="3"
                                    stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
                                    stroke-linecap="round" transform="rotate(-90 22 22)"
                                    style="transition: stroke-dashoffset 0.5s ease"/>
                                <text x="22" y="24" text-anchor="middle" font-size="10" font-weight="800" fill="${ringColor}">${rate}%</text>
                            </svg>
                            <p style="font-size:0.58rem;color:var(--text-3);font-weight:600;text-transform:uppercase">Presença</p>
                        </div>
                    </div>

                    <div class="history-metrics">
                        <div class="history-metric">
                            <div class="metric-value" style="color:var(--green)">${stats.P}</div>
                            <div class="metric-label">Presente</div>
                        </div>
                        <div class="history-metric">
                            <div class="metric-value" style="color:var(--red)">${stats.F}</div>
                            <div class="metric-label">Faltas</div>
                        </div>
                        <div class="history-metric">
                            <div class="metric-value" style="color:var(--orange)">${stats.AT}</div>
                            <div class="metric-label">Atestados</div>
                        </div>
                        <div class="history-metric">
                            <div class="metric-value" style="color:var(--gray)">${stats.AF}</div>
                            <div class="metric-label">Afastado</div>
                        </div>
                        <div class="history-metric">
                            <div class="metric-value" style="color:var(--cyan)">${stats.FE}</div>
                            <div class="metric-label">Férias</div>
                        </div>
                        <div class="history-metric">
                            <div class="metric-value" style="color:var(--teal)">${stats.EX}</div>
                            <div class="metric-label">Extra</div>
                        </div>
                    </div>

                    ${alerts.length ? `
                        <div class="history-alerts">
                            ${alerts.map(a => `<span class="history-alert ${a.type}"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> ${a.text}</span>`).join('')}
                        </div>
                    ` : ''}

                    <div class="history-timeline no-scrollbar">
                        ${history.reverse().slice(0, 15).map(h => `
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

        const trendCtx = document.getElementById('trendChart')?.getContext('2d');
        if (trendCtx) {
            SCP.state.charts.trend = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: d.dailyStats.map(i => SCP.helpers.formatDateShort(i.date)),
                    datasets: [
                        { label: 'Presentes', data: d.dailyStats.map(i => i.P || 0), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', fill: true, tension: 0.4, pointRadius: 3, pointHoverRadius: 6 },
                        { label: 'Faltas', data: d.dailyStats.map(i => i.F || 0), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', fill: true, tension: 0.4, pointRadius: 3, pointHoverRadius: 6 },
                        { label: 'Atestados', data: d.dailyStats.map(i => i.AT || 0), borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.06)', fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 5 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
            });
        }

        const statusCtx = document.getElementById('statusChart')?.getContext('2d');
        if (statusCtx) {
            const stats = Object.entries(d.statusTotals).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
            SCP.state.charts.status = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: stats.map(([c]) => SCP.CONFIG.STATUS_CODES[c]?.label || c),
                    datasets: [{ data: stats.map(([, c]) => c), backgroundColor: stats.map(([c]) => SCP.CONFIG.STATUS_CODES[c]?.color || '#ccc'), borderWidth: 2, borderColor: '#fff' }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } }, cutout: '55%' }
            });
        }

        const issuesCtx = document.getElementById('topIssuesChart')?.getContext('2d');
        if (issuesCtx) {
            SCP.state.charts.topIssues = new Chart(issuesCtx, {
                type: 'bar',
                data: {
                    labels: d.topFaltas.slice(0, 10).map(i => i.name.split(' ').slice(0, 2).join(' ')),
                    datasets: [{ label: 'Faltas', data: d.topFaltas.slice(0, 10).map(i => i.count), backgroundColor: '#ef4444', borderRadius: 6 }]
                },
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
            });
        }

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
                    datasets: [{ label: 'Taxa (%)', data: rates, backgroundColor: rates.map(r => r >= 95 ? '#10b981' : r >= 85 ? '#f59e0b' : '#ef4444'), borderRadius: 6 }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { max: 100, beginAtZero: true } }, plugins: { legend: { display: false } } }
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
                const raw = records[e.id]?.[d];
                const s = typeof raw === 'string' ? raw : (raw && raw.status ? raw.status : null);
                if (s) { supStats[e.supervisor].t++; if (s === 'P') supStats[e.supervisor].p++; }
            });
        });

        const labels = Object.keys(supStats);
        const data = labels.map(s => supStats[s].t > 0 ? Math.round((supStats[s].p / supStats[s].t) * 100) : 0);

        SCP.state.charts.team = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{ label: 'Eficiência (%)', data, backgroundColor: data.map(d => d >= 95 ? '#10b981' : d >= 85 ? '#f59e0b' : '#ef4444'), borderRadius: 6 }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { max: 100, beginAtZero: true } }, plugins: { legend: { display: false } } }
        });
    },

    async applyFilters() {
        SCP.helpers.showLoading(true);
        await SCP.api.loadDashboard(SCP.state.filters.startDate, SCP.state.filters.endDate);
        SCP.helpers.showLoading(false);
        SCP.navigation.buildDashboardHeader();
        SCP.navigation.buildDashboardFilters();
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
        SCP.navigation.buildDashboardHeader();
        SCP.navigation.buildDashboardFilters();
        this.render();
        if (tab === 'charts') setTimeout(() => this._buildCharts(), 100);
        if (tab === 'team') setTimeout(() => this._buildTeamChart(), 100);
    }
};
