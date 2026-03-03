'use strict';

/**
 * SCP — Status Modal
 * Dynamic modal/submenu for status buttons with extra data fields
 */
window.SCP = window.SCP || {};

SCP.statusModal = {
    _overlay: null,
    _currentEmpId: null,
    _currentStatus: null,
    _formData: {},
    _allOperationalEmployees: [],

    SUBMENU_STATUSES: ['F', 'AT', 'AF', 'TR', 'TH', 'TE', 'DS'],

    TRAINING_TYPES: ['NR-33', 'NR-35', 'NR-20'],
    SCALE_OPTIONS: ['ADM', '16HS', 'A', 'B', 'C', 'D'],

    needsSubmenu(status) {
        return this.SUBMENU_STATUSES.includes(status);
    },

    async open(empId, status) {
        this._currentEmpId = empId;
        this._currentStatus = status;
        this._formData = {};

        if (!this._allOperationalEmployees.length) {
            await this._loadAllOperational();
        }

        const emp = SCP.state.employees.find(e => e.id === empId);
        const statusInfo = SCP.CONFIG.STATUS_CODES[status];

        this._overlay = document.getElementById('status-modal-overlay');
        if (!this._overlay) return;

        this._overlay.innerHTML = this._buildModalHTML(emp, status, statusInfo);
        requestAnimationFrame(() => this._overlay.classList.add('active'));

        this._overlay.querySelector('.modal-btn-cancel').addEventListener('click', () => this.close());
        this._overlay.querySelector('.modal-btn-confirm').addEventListener('click', () => this._confirm());
        this._overlay.addEventListener('click', e => { if (e.target === this._overlay) this.close(); });

        this._bindFields(status);
    },

    close() {
        if (!this._overlay) return;
        this._overlay.classList.remove('active');
        setTimeout(() => { this._overlay.innerHTML = ''; }, 300);
    },

    _confirm() {
        const obs = this._overlay.querySelector('#modal-observation');
        if (obs) this._formData.observations = obs.value.trim();

        SCP.state.attendanceRecords[this._currentEmpId] = {
            status: this._currentStatus,
            extras: { ...this._formData }
        };

        SCP.attendance.render();
        SCP.helpers.updateStats();
        SCP.helpers.toast('Selecionado: ' + SCP.CONFIG.STATUS_CODES[this._currentStatus].label, 'info');
        this.close();
    },

    async _loadAllOperational() {
        if (!window.supabase) return;
        try {
            const { data } = await supabase.schema('gps_mec').from('efetivo_gps_mec_colaboradores')
                .select('id, name, function, regime, supervisor_id, supervisors(name)')
                .eq('status', 'ATIVO')
                .eq('category', 'OPERACIONAL')
                .order('name');
            this._allOperationalEmployees = (data || []).map(e => ({
                id: e.id,
                nome: e.name,
                funcao: e.function || '—',
                regime: e.regime || '—',
                supervisor: e.supervisors ? e.supervisors.name : '—'
            }));
        } catch (e) {
            console.error('StatusModal: Failed loading employees', e);
        }
    },

    _buildModalHTML(emp, status, info) {
        const empName = emp ? emp.nome : 'Colaborador';
        const fields = this._getFieldsForStatus(status);

        return `
            <div class="status-modal">
                <div class="status-modal-header">
                    <div class="modal-status-badge" style="background:${info.color}"></div>
                    <div>
                        <h2>${info.label}</h2>
                        <div class="modal-emp-name">${empName}</div>
                    </div>
                </div>
                <div class="status-modal-body">
                    ${fields}
                    <div class="modal-field">
                        <label>Observação</label>
                        <textarea class="modal-textarea" id="modal-observation" placeholder="Texto livre para observações adicionais..."></textarea>
                    </div>
                </div>
                <div class="status-modal-footer">
                    <button class="modal-btn modal-btn-cancel">Cancelar</button>
                    <button class="modal-btn modal-btn-confirm">Confirmar</button>
                </div>
            </div>
        `;
    },

    _getFieldsForStatus(status) {
        switch (status) {
            case 'F':
                return this._fieldJustification() + this._fieldCoverage();
            case 'AT':
            case 'AF':
                return this._fieldCoverage();
            case 'TR':
                return this._fieldTrainingType() + this._fieldCoverage();
            case 'TH':
                return this._fieldNewSchedule();
            case 'TE':
                return this._fieldScaleChange();
            case 'DS':
                return this._fieldReplacement();
            default:
                return '';
        }
    },

    _fieldJustification() {
        return `
            <div class="modal-field">
                <label>Houve justificativa?</label>
                <div class="modal-toggle-group">
                    <button class="modal-toggle-btn" data-field="has_justification" data-value="true">Sim</button>
                    <button class="modal-toggle-btn" data-field="has_justification" data-value="false">Não</button>
                </div>
            </div>
        `;
    },

    _fieldCoverage() {
        return `
            <div class="modal-field">
                <label>Houve alguém cobrindo?</label>
                <div class="modal-toggle-group">
                    <button class="modal-toggle-btn" data-field="has_coverage" data-value="true">Sim</button>
                    <button class="modal-toggle-btn" data-field="has_coverage" data-value="false">Não</button>
                </div>
            </div>
            <div class="modal-field" id="coverage-search-field" style="display:none;">
                <label>Quem cobriu? (buscar no efetivo)</label>
                <div class="modal-autocomplete-wrapper">
                    <input class="modal-input" id="coverage-search" placeholder="Digite o nome do colaborador..." autocomplete="off" />
                    <div class="modal-autocomplete-dropdown" id="coverage-dropdown"></div>
                </div>
                <div id="coverage-selected" style="display:none;"></div>
            </div>
        `;
    },

    _fieldTrainingType() {
        const options = this.TRAINING_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
        return `
            <div class="modal-field">
                <label>Qual treinamento?</label>
                <select class="modal-select" id="modal-training-type">
                    <option value="">Selecione...</option>
                    ${options}
                    <option value="OUTRO">Outro (digitar)</option>
                </select>
            </div>
            <div class="modal-field" id="training-custom-field" style="display:none;">
                <label>Nome do treinamento</label>
                <input class="modal-input" id="modal-training-custom" placeholder="Digite o nome do treinamento..." />
            </div>
        `;
    },

    _fieldNewSchedule() {
        return `
            <div class="modal-field">
                <label>Para qual horário?</label>
                <input class="modal-input" id="modal-new-schedule" placeholder="Ex: 07:00 às 17:00" />
            </div>
        `;
    },

    _fieldScaleChange() {
        const options = this.SCALE_OPTIONS.map(s => `<option value="${s}">${s}</option>`).join('');
        return `
            <div class="modal-field">
                <label>Dia da troca</label>
                <input class="modal-input" type="date" id="modal-scale-date" />
            </div>
            <div class="modal-field">
                <label>Para qual escala?</label>
                <select class="modal-select" id="modal-scale-target">
                    <option value="">Selecione...</option>
                    ${options}
                </select>
            </div>
        `;
    },

    _fieldReplacement() {
        return `
            <div class="modal-field">
                <label>Alguém foi remanejado para o lugar dele?</label>
                <div class="modal-toggle-group">
                    <button class="modal-toggle-btn" data-field="has_replacement" data-value="true">Sim</button>
                    <button class="modal-toggle-btn" data-field="has_replacement" data-value="false">Não</button>
                </div>
            </div>
            <div class="modal-field" id="replacement-search-field" style="display:none;">
                <label>Quem fará extra no lugar? (buscar no efetivo)</label>
                <div class="modal-autocomplete-wrapper">
                    <input class="modal-input" id="replacement-search" placeholder="Digite o nome do colaborador que fará extra..." autocomplete="off" />
                    <div class="modal-autocomplete-dropdown" id="replacement-dropdown"></div>
                </div>
                <div id="replacement-selected" style="display:none;"></div>
            </div>
        `;
    },

    _bindFields(status) {
        this._bindToggles();

        if (status === 'F' || status === 'AT' || status === 'AF' || status === 'TR') {
            this._bindCoverageToggle();
        }

        if (status === 'TR') {
            this._bindTrainingType();
        }

        if (status === 'TH') {
            const input = this._overlay.querySelector('#modal-new-schedule');
            if (input) input.addEventListener('input', () => { this._formData.new_schedule = input.value; });
        }

        if (status === 'TE') {
            const dateInput = this._overlay.querySelector('#modal-scale-date');
            const scaleSelect = this._overlay.querySelector('#modal-scale-target');
            if (dateInput) dateInput.addEventListener('change', () => { this._formData.scale_change_date = dateInput.value; });
            if (scaleSelect) scaleSelect.addEventListener('change', () => { this._formData.scale_change_target = scaleSelect.value; });
        }

        if (status === 'DS') {
            this._bindReplacementToggle();
        }
    },

    _bindToggles() {
        const toggleBtns = this._overlay.querySelectorAll('.modal-toggle-btn');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const field = btn.dataset.field;
                const value = btn.dataset.value === 'true';
                this._formData[field] = value;

                const group = btn.closest('.modal-toggle-group');
                group.querySelectorAll('.modal-toggle-btn').forEach(b => {
                    b.classList.remove('selected-yes', 'selected-no');
                });
                btn.classList.add(value ? 'selected-yes' : 'selected-no');

                if (field === 'has_coverage') {
                    this._handleCoverageVisibility(value);
                }
                if (field === 'has_replacement') {
                    this._handleReplacementVisibility(value);
                }
            });
        });
    },

    _bindCoverageToggle() {
        const searchField = this._overlay.querySelector('#coverage-search-field');
        const searchInput = this._overlay.querySelector('#coverage-search');
        const dropdown = this._overlay.querySelector('#coverage-dropdown');

        if (searchInput && dropdown) {
            this._setupAutocomplete(searchInput, dropdown, '#coverage-selected', 'replacement_employee');
        }
    },

    _bindReplacementToggle() {
        const searchInput = this._overlay.querySelector('#replacement-search');
        const dropdown = this._overlay.querySelector('#replacement-dropdown');

        if (searchInput && dropdown) {
            this._setupAutocomplete(searchInput, dropdown, '#replacement-selected', 'replacement_employee');
        }
    },

    _handleCoverageVisibility(show) {
        const field = this._overlay.querySelector('#coverage-search-field');
        if (field) field.style.display = show ? 'flex' : 'none';
        if (!show) {
            this._formData.replacement_employee_id = null;
            this._formData.replacement_employee_name = null;
        }
    },

    _handleReplacementVisibility(show) {
        const field = this._overlay.querySelector('#replacement-search-field');
        if (field) field.style.display = show ? 'none' : 'flex';
        if (show) {
            this._formData.replacement_employee_id = null;
            this._formData.replacement_employee_name = null;
        }
    },

    _bindTrainingType() {
        const select = this._overlay.querySelector('#modal-training-type');
        const customField = this._overlay.querySelector('#training-custom-field');
        const customInput = this._overlay.querySelector('#modal-training-custom');

        if (select) {
            select.addEventListener('change', () => {
                if (select.value === 'OUTRO') {
                    customField.style.display = 'flex';
                    this._formData.training_type = '';
                } else {
                    customField.style.display = 'none';
                    this._formData.training_type = select.value;
                }
            });
        }
        if (customInput) {
            customInput.addEventListener('input', () => {
                this._formData.training_type = customInput.value;
            });
        }
    },

    _setupAutocomplete(input, dropdown, selectedSelector, dataPrefix) {
        let selectedEmp = null;

        input.addEventListener('input', () => {
            const query = input.value.trim().toLowerCase();
            if (query.length < 2) {
                dropdown.classList.remove('visible');
                return;
            }

            const results = this._allOperationalEmployees.filter(e =>
                e.id !== this._currentEmpId && e.nome.toLowerCase().includes(query)
            ).slice(0, 15);

            if (!results.length) {
                dropdown.innerHTML = '<div class="modal-autocomplete-empty">Nenhum colaborador encontrado</div>';
                dropdown.classList.add('visible');
                return;
            }

            dropdown.innerHTML = results.map(e => {
                const highlighted = e.nome.replace(
                    new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                    '<span class="autocomplete-match">$1</span>'
                );
                return `
                    <div class="modal-autocomplete-item" data-id="${e.id}" data-name="${e.nome}">
                        <div>${highlighted}</div>
                        <div class="autocomplete-meta">${e.funcao} • ${e.supervisor}</div>
                    </div>
                `;
            }).join('');

            dropdown.classList.add('visible');

            dropdown.querySelectorAll('.modal-autocomplete-item').forEach(item => {
                item.addEventListener('click', () => {
                    const id = item.dataset.id;
                    const name = item.dataset.name;
                    selectedEmp = { id, name };
                    this._formData.replacement_employee_id = id;
                    this._formData.replacement_employee_name = name;

                    input.style.display = 'none';
                    dropdown.classList.remove('visible');

                    const selectedDiv = this._overlay.querySelector(selectedSelector);
                    selectedDiv.style.display = 'block';
                    selectedDiv.innerHTML = `
                        <div class="modal-autocomplete-selected">
                            <span style="display:flex;align-items:center;gap:4px;"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> ${name}</span>
                            <span class="remove-selection" title="Remover" style="display:flex;align-items:center;"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg></span>
                        </div>
                    `;
                    selectedDiv.querySelector('.remove-selection').addEventListener('click', () => {
                        selectedEmp = null;
                        this._formData.replacement_employee_id = null;
                        this._formData.replacement_employee_name = null;
                        selectedDiv.style.display = 'none';
                        input.style.display = 'block';
                        input.value = '';
                        input.focus();
                    });
                });
            });
        });

        document.addEventListener('click', e => {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('visible');
            }
        });
    }
};
