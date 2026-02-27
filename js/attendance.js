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

        const saveStates = {
            idle: { text: `Salvar ${marked} Registros`, disabled: marked === 0, cls: 'idle' },
            saving: { text: 'Salvando...', disabled: true, cls: 'saving' },
            success: { text: '✓ Salvo com Sucesso!', disabled: true, cls: 'success' },
            error: { text: '✕ Erro ao Salvar', disabled: true, cls: 'error' }
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
                <button onclick="SCP.attendance.changeDate('${prevDay}')">◀</button>
                <div class="date-center">
                    <input type="date" value="${SCP.state.selectedDate}" onchange="SCP.attendance.changeDate(this.value)">
                    <div class="date-label">${SCP.helpers.formatDate(SCP.state.selectedDate)}</div>
                </div>
                <button onclick="SCP.attendance.changeDate('${nextDay}')">▶</button>
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
                <button class="save-btn ${btn.cls}" ${btn.disabled ? 'disabled' : ''} onclick="SCP.attendance.saveAll()">${btn.text}</button>
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
            if (extras.has_justification === true) tags.push('✓ Justificativa');
            if (extras.has_justification === false) tags.push('✕ S/ Justificativa');
            if (extras.replacement_employee_name) tags.push('⟳ ' + extras.replacement_employee_name);
            if (extras.training_type) tags.push('📋 ' + extras.training_type);
            if (extras.new_schedule) tags.push('🕐 ' + extras.new_schedule);
            if (extras.scale_change_target) tags.push('📊 Escala: ' + extras.scale_change_target);
            if (extras.has_replacement === true) tags.push('✓ Remanejado');
            if (extras.has_replacement === false) tags.push('⚠ S/ Remanejamento');

            if (tags.length) {
                extrasHTML += '<div class="extras-indicator">' + tags.map(t => `<span class="extras-tag">${t}</span>`).join('') + '</div>';
            }
            if (extras.observations) {
                extrasHTML += `<div class="observation-preview">📝 ${extras.observations}</div>`;
            }
        }

        return `
            <div class="employee-card fade-in">
                <div class="employee-card-header">
                    <div>
                        <h3>${emp.nome}</h3>
                        <div class="emp-badges">
                            <span class="badge" style="background:var(--blue-bg);color:var(--blue-text)">${emp.funcao}</span>
                        </div>
                    </div>
                    ${statusBadge}
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
