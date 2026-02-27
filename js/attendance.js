'use strict';

/**
 * SCP — Attendance View
 * Renders employee cards/groups/table with status buttons and handles attendance marking
 */
window.SCP = window.SCP || {};

SCP.attendance = {
    render() {
        const container = document.getElementById('attendance-content');
        if (!container) return;

        // Build filter controls
        SCP.navigation.buildAttendanceControls();

        // Get filtered employees
        const filteredEmployees = SCP.navigation.getFilteredEmployees();
        const total = SCP.state.employees.length;
        const marked = Object.keys(SCP.state.attendanceRecords).length;
        const progress = total > 0 ? Math.round((marked / total) * 100) : 0;

        const svgCheck = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:4px;margin-bottom:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>';
        const svgError = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:4px;margin-bottom:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>';

        const saveStates = {
            idle: { text: `Salvar <span id="save-count">${marked}</span> Registros`, disabled: marked === 0, cls: 'idle' },
            saving: { text: 'Salvando...', disabled: true, cls: 'saving' },
            success: { text: `${svgCheck} Salvo com Sucesso!`, disabled: true, cls: 'success' },
            error: { text: `${svgError} Erro ao Salvar`, disabled: true, cls: 'error' }
        };
        const btn = saveStates[SCP.state.saveState] || saveStates.idle;

        const prevDay = SCP.helpers.getPreviousDay(SCP.state.selectedDate);
        const nextDay = SCP.helpers.getNextDay(SCP.state.selectedDate);

        const viewMode = SCP.state.attendanceFilters?.viewMode || 'cards';

        let contentHTML = '';
        if (filteredEmployees.length === 0) {
            contentHTML = '<div style="text-align:center; padding:40px; color:var(--text-3);">Nenhum colaborador encontrado</div>';
        } else if (viewMode === 'cards') {
            contentHTML = `<div class="employee-grid">${filteredEmployees.map(emp => this.renderCard(emp)).join('')}</div>`;
        } else if (viewMode === 'groups') {
            contentHTML = this.renderGroupView(filteredEmployees);
        } else if (viewMode === 'table') {
            contentHTML = this.renderTableView(filteredEmployees);
        }

        container.innerHTML = `
            <div class="date-navigator">
                <button onclick="SCP.attendance.changeDate('${prevDay}')">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <div class="date-center">
                    <input type="date" value="${SCP.state.selectedDate}" onchange="SCP.attendance.changeDate(this.value)">
                    <div class="date-label">${SCP.helpers.formatDate(SCP.state.selectedDate)}</div>
                </div>
                <button onclick="SCP.attendance.changeDate('${nextDay}')">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>

            <div class="progress-section">
                <div class="progress-header">
                    <span>Progresso</span>
                    <span>${progress}% · ${filteredEmployees.length}/${total} exibidos</span>
                </div>
                <div class="progress-track">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
            </div>

            ${contentHTML}

            <div class="save-footer">
                <button class="save-btn ${btn.cls}" ${btn.disabled ? 'disabled' : ''} onclick="SCP.attendance.saveAll()"><div style="display:flex;align-items:center;justify-content:center">${btn.text}</div></button>
            </div>
        `;
    },

    renderCard(emp) {
        const record = SCP.state.attendanceRecords[emp.id];
        const currentStatus = record ? (typeof record === 'string' ? record : record.status) : null;
        const extras = record && typeof record === 'object' ? record.extras : null;
        const statusInfo = currentStatus ? SCP.CONFIG.STATUS_CODES[currentStatus] : null;

        const statusBadge = statusInfo
            ? `<span class="badge" style="background:${statusInfo.bg};color:${statusInfo.text}">${statusInfo.label}</span>`
            : '';

        const statusButtons = Object.entries(SCP.CONFIG.STATUS_CODES).map(([code, info]) => {
            const isSelected = currentStatus === code;
            const style = isSelected
                ? `background:${info.bg}; color:${info.text}; border-color:${info.color}; border-width:2px;`
                : '';
            return `<button class="status-btn ${isSelected ? 'active' : ''}" style="${style}" onclick="SCP.attendance.setStatus('${emp.id}', '${code}')">${info.label}</button>`;
        }).join('');

        let extrasHTML = '';
        if (extras) {
            const tags = [];

            const iconJustify = '<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:3px;margin-bottom:-1px"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>';
            const iconNoJustify = '<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:3px;margin-bottom:-1px"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>';
            const iconSwap = '<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:3px;margin-bottom:-1px"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>';
            const iconTrain = '<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:3px;margin-bottom:-1px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>';
            const iconClock = '<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:3px;margin-bottom:-1px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
            const iconScale = '<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:3px;margin-bottom:-1px"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>';
            const iconAlert = '<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:3px;margin-bottom:-1px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
            const iconObs = '<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:4px;margin-bottom:-1px"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7"></path></svg>';

            if (extras.has_justification === true) tags.push(iconJustify + 'Justificativa');
            if (extras.has_justification === false) tags.push(iconNoJustify + 'S/ Justificativa');
            if (extras.replacement_employee_name) tags.push(iconSwap + extras.replacement_employee_name);
            if (extras.training_type) tags.push(iconTrain + extras.training_type);
            if (extras.new_schedule) tags.push(iconClock + extras.new_schedule);
            if (extras.scale_change_target) tags.push(iconScale + 'Escala: ' + extras.scale_change_target);
            if (extras.has_replacement === true) tags.push(iconJustify + 'Remanejado');
            if (extras.has_replacement === false) tags.push(iconAlert + 'S/ Remanejamento');

            if (tags.length) {
                extrasHTML += '<div class="extras-indicator" style="display:flex;flex-wrap:wrap;gap:4px;">' + tags.map(t => `<span class="extras-tag" style="display:inline-flex;align-items:center;">${t}</span>`).join('') + '</div>';
            }
            if (extras.observations) {
                extrasHTML += `<div class="observation-preview" style="display:flex;align-items:center;color:var(--text-3);font-size:0.75rem;margin-top:6px;">${iconObs} ${extras.observations}</div>`;
            }
        }

        return `
            <div class="employee-card fade-in" style="background:var(--bg-2);border-radius:12px;padding:11px 13px;">
                <div class="card-top" style="display:flex;align-items:flex-start;gap:6px;margin-bottom:6px;">
                    <div class="card-name" style="font-weight:700;font-size:13px;line-height:1.3;flex:1;color:var(--text-1);">${emp.nome}</div>
                    ${statusBadge ? `<div style="flex-shrink:0;">${statusBadge}</div>` : ''}
                </div>
                <div class="card-badges" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;">
                    <span class="badge" style="background:var(--blue-bg);color:var(--blue-text)">${emp.funcao}</span>
                    <span style="display:inline-flex;align-items:center;padding:2px 7px;border-radius:3px;font-family:var(--font-mono);font-size:10px;font-weight:500;color:var(--text-3);border:1px solid var(--border)">MAT: <strong style="color:var(--text-2);margin-left:3px">${emp.matricula_gps || 'S/ MAT'}</strong></span>
                </div>
                <div class="status-grid">${statusButtons}</div>
                ${extrasHTML}
            </div>
        `;
    },

    renderGroupView(employees) {
        // Group by supervisor
        const groups = {};
        employees.forEach(emp => {
            const sup = emp.supervisor || 'Sem Supervisor';
            if (!groups[sup]) groups[sup] = [];
            groups[sup].push(emp);
        });

        // Initialize collapsed state
        if (!SCP.state.collapsedGroups) SCP.state.collapsedGroups = {};

        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0])).map(([sup, emps]) => {
            const isCollapsed = SCP.state.collapsedGroups[sup];
            const markedCount = emps.filter(e => SCP.state.attendanceRecords[e.id]).length;

            return `
                <div class="employee-group">
                    <div class="employee-group-header ${isCollapsed ? 'collapsed' : ''}" onclick="SCP.attendance.toggleGroup('${sup}')">
                        <svg class="toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        <h3>${sup}</h3>
                        <span style="font-size:0.72rem;color:var(--text-3)">${markedCount}/${emps.length} marcados</span>
                        <span class="count-badge">${emps.length}</span>
                    </div>
                    ${isCollapsed ? '' : `<div class="employee-grid">${emps.map(emp => this.renderCard(emp)).join('')}</div>`}
                </div>
            `;
        }).join('');
    },

    renderTableView(employees) {
        const statusCodes = Object.entries(SCP.CONFIG.STATUS_CODES);

        return `
            <div style="overflow-x:auto;border-radius:var(--radius);box-shadow:var(--shadow);">
                <table class="employee-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Função</th>
                            <th>Supervisor</th>
                            <th>Status Atual</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${employees.map(emp => {
            const record = SCP.state.attendanceRecords[emp.id];
            const currentStatus = record ? (typeof record === 'string' ? record : record.status) : null;
            const statusInfo = currentStatus ? SCP.CONFIG.STATUS_CODES[currentStatus] : null;

            return `
                                <tr>
                                    <td style="font-weight:600">${emp.nome}</td>
                                    <td><span class="badge" style="background:var(--blue-bg);color:var(--blue-text)">${emp.funcao}</span></td>
                                    <td style="color:var(--text-3);font-size:0.78rem">${emp.supervisor || '—'}</td>
                                    <td>${statusInfo ? `<span class="badge" style="background:${statusInfo.bg};color:${statusInfo.text}">${statusInfo.label}</span>` : '<span style="color:var(--text-3)">—</span>'}</td>
                                    <td>
                                        <div style="display:flex;gap:3px;flex-wrap:wrap;">
                                            ${statusCodes.slice(0, 6).map(([code, info]) => {
                const isSelected = currentStatus === code;
                return `<button class="table-status-btn ${isSelected ? 'active' : ''}" style="${isSelected ? `background:${info.bg};color:${info.text};border-color:${info.color};` : ''}" onclick="SCP.attendance.setStatus('${emp.id}', '${code}')">${code}</button>`;
            }).join('')}
                                            <button class="table-status-btn" style="color:var(--text-3)" onclick="SCP.attendance.showMoreStatuses('${emp.id}')">+</button>
                                        </div>
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    toggleGroup(supervisor) {
        if (!SCP.state.collapsedGroups) SCP.state.collapsedGroups = {};
        SCP.state.collapsedGroups[supervisor] = !SCP.state.collapsedGroups[supervisor];
        this.render();
    },

    showMoreStatuses(empId) {
        // Create a temporary floating panel with all status buttons
        const existing = document.getElementById('status-popup');
        if (existing) existing.remove();

        const popup = document.createElement('div');
        popup.id = 'status-popup';
        popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg-1);border-radius:var(--radius);box-shadow:var(--shadow-xl);border:1px solid var(--border);padding:20px;z-index:1000;min-width:280px;max-width:400px;';

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:999;';
        overlay.onclick = () => { popup.remove(); overlay.remove(); };

        const statusButtons = Object.entries(SCP.CONFIG.STATUS_CODES).map(([code, info]) =>
            `<button style="padding:8px 12px;border-radius:6px;font-size:0.78rem;font-weight:600;border:1px solid var(--border);background:var(--bg-1);cursor:pointer;transition:all 0.2s;" 
             onmouseover="this.style.background='${info.bg}';this.style.color='${info.text}'" 
             onmouseout="this.style.background='var(--bg-1)';this.style.color='var(--text-2)'"
             onclick="SCP.attendance.setStatus('${empId}', '${code}');document.getElementById('status-popup').remove();this.closest('div').previousElementSibling.remove();">${info.label}</button>`
        ).join('');

        popup.innerHTML = `
            <h4 style="font-size:0.85rem;font-weight:700;margin-bottom:12px;color:var(--text-1)">Selecionar Status</h4>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">${statusButtons}</div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(popup);
    },

    setStatus(empId, status) {
        const statusConfig = SCP.CONFIG.STATUS_CODES[status];
        if (statusConfig && statusConfig.direct) {
            SCP.state.attendanceRecords[empId] = { status, extras: {} };
            this.render();
            SCP.helpers.updateStats();
        } else {
            SCP.statusModal.open(empId, status);
        }
    },

    async saveAll() {
        const records = [];
        for (const empId in SCP.state.attendanceRecords) {
            const emp = SCP.state.employees.find(e => e.id === empId);
            if (!emp) continue;

            const record = SCP.state.attendanceRecords[empId];
            const status = typeof record === 'string' ? record : record.status;
            const extras = typeof record === 'object' ? (record.extras || {}) : {};

            records.push({
                date: SCP.state.selectedDate,
                employeeId: emp.id,
                supervisorId: emp.supervisor_id,
                status: status,
                observations: extras.observations || '',
                has_justification: extras.has_justification ?? null,
                replacement_employee_id: extras.replacement_employee_id || null,
                replacement_employee_name: extras.replacement_employee_name || null,
                training_type: extras.training_type || null,
                new_schedule: extras.new_schedule || null,
                scale_change_date: extras.scale_change_date || null,
                scale_change_target: extras.scale_change_target || null,
                has_replacement: extras.has_replacement ?? null
            });
        }

        if (!records.length) {
            SCP.helpers.toast('Nada a salvar', 'warning');
            return;
        }

        SCP.state.saveState = 'saving';
        this.render();

        const result = await SCP.api.saveAttendance(records);

        if (result) {
            SCP.state.saveState = 'success';
            SCP.helpers.toast('Presença salva com sucesso!', 'success');
        } else {
            SCP.state.saveState = 'error';
            SCP.helpers.toast('Erro ao salvar presença', 'error');
        }

        this.render();
        setTimeout(() => { SCP.state.saveState = 'idle'; this.render(); }, 2500);
    },

    async changeDate(date) {
        SCP.state.selectedDate = date;
        SCP.helpers.showLoading(true);

        const supervisorId = SCP.auth.currentUser && !SCP.helpers.hasGestaoAccess()
            ? SCP.auth.currentUser.supervisor_id
            : null;

        await SCP.api.loadAttendance(date, supervisorId);
        SCP.helpers.showLoading(false);
        this.render();
    }
};
