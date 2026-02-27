'use strict';

/**
 * SCP — Attendance View
 * Renders employee cards with status buttons and handles attendance marking
 */
window.SCP = window.SCP || {};

SCP.attendance = {
    render() {
        const container = document.getElementById('attendance-content');
        if (!container) return;

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
                    <span>${progress}%</span>
                </div>
                <div class="progress-track">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
            </div>

            ${total === 0
                ? '<div style="text-align:center; padding:40px; color:var(--text-3);">Nenhum colaborador encontrado</div>'
                : `<div class="employee-grid">${SCP.state.employees.map(emp => this.renderCard(emp)).join('')}</div>`
            }

            <div class="save-footer">
                <button class="save-btn ${btn.cls}" ${btn.disabled ? 'disabled' : ''} onclick="SCP.attendance.saveAll()">${btn.text}</button>
            </div>
        `;
    },

    renderCard(emp) {
        const currentStatus = SCP.state.attendanceRecords[emp.id];
        const statusInfo = currentStatus ? SCP.CONFIG.STATUS_CODES[currentStatus] : null;

        const statusBadge = statusInfo
            ? `<span class="badge" style="background:${statusInfo.bg};color:${statusInfo.text}">${statusInfo.label}</span>`
            : '';

        const statusButtons = Object.entries(SCP.CONFIG.STATUS_CODES).slice(0, 9).map(([code, info]) => {
            const isSelected = currentStatus === code;
            const style = isSelected
                ? `background:${info.bg}; color:${info.text}; border-color:${info.color}; border-width:2px;`
                : '';
            return `<button class="status-btn ${isSelected ? 'active' : ''}" style="${style}" onclick="SCP.attendance.setStatus('${emp.id}', '${code}')">${info.label}</button>`;
        }).join('');

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
            </div>
        `;
    },

    setStatus(empId, status) {
        SCP.state.attendanceRecords[empId] = status;
        this.render();
        SCP.helpers.updateStats();
        SCP.helpers.toast('Selecionado: ' + SCP.CONFIG.STATUS_CODES[status].label, 'info');
    },

    async saveAll() {
        const records = [];
        for (const empId in SCP.state.attendanceRecords) {
            const emp = SCP.state.employees.find(e => e.id === empId);
            if (!emp) continue;
            records.push({
                date: SCP.state.selectedDate,
                employeeId: emp.id,
                supervisorId: emp.supervisor_id,
                status: SCP.state.attendanceRecords[empId],
                observations: ''
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
