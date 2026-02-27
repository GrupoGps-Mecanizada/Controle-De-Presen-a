'use strict';

/**
 * SCP — API Communication (Supabase Edition)
 * Handles data loading, saving attendance, and real-time sync
 */
window.SCP = window.SCP || {};

SCP.api = {
    activeRequests: 0,
    subscriptions: [],

    updateSyncBar(isLoading) {
        const bar = document.getElementById('global-sync-bar');
        if (!bar) return;
        if (isLoading) {
            this.activeRequests++;
            if (this.activeRequests === 1) {
                bar.classList.remove('success');
                bar.classList.add('loading');
            }
        } else {
            this.activeRequests = Math.max(0, this.activeRequests - 1);
            if (this.activeRequests === 0) {
                bar.classList.remove('loading');
                bar.classList.add('success');
                setTimeout(() => { if (this.activeRequests === 0) bar.classList.remove('success'); }, 500);
            }
        }
    },

    _handleError(error, context) {
        console.error(`SCP Supabase [${context}]:`, error.message);
        SCP.helpers.toast(`Erro em ${context}: ${error.message}`, 'error');
        return null;
    },

    setupRealtime() {
        if (!window.supabase) return;
        let realtimeTimer = null;
        const debouncedReload = () => {
            if (realtimeTimer) clearTimeout(realtimeTimer);
            realtimeTimer = setTimeout(() => this.loadEmployees(true), 800);
        };

        const subscription = supabase
            .channel('public:attendance_records')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => debouncedReload())
            .subscribe();
        this.subscriptions.push(subscription);
        console.info('SCP: Real-time subscriptions active.');
    },

    /**
     * Load employees for a specific supervisor (or all for gestão)
     */
    async loadEmployees(silent = false) {
        if (!window.supabase) return false;
        try {
            if (!silent) this.updateSyncBar(true);

            let query = supabase.from('employees')
                .select('id, name, function, regime, status, supervisor_id, supervisors(id, name)')
                .eq('status', 'ATIVO')
                .order('name');

            // If supervisor (not gestão), filter by their supervisor_id
            if (SCP.auth.currentUser && !SCP.helpers.hasGestaoAccess() && SCP.auth.currentUser.supervisor_id) {
                query = query.eq('supervisor_id', SCP.auth.currentUser.supervisor_id);
            }

            const { data, error } = await query;
            if (!silent) this.updateSyncBar(false);
            if (error) return this._handleError(error, 'Carregar Colaboradores');

            SCP.state.employees = data.map(e => ({
                id: e.id,
                nome: e.name,
                funcao: e.function || '—',
                regime: e.regime || '—',
                status: e.status,
                supervisor_id: e.supervisor_id,
                supervisor: e.supervisors ? e.supervisors.name : 'SEM SUPERVISOR'
            }));

            SCP.state.dataLoaded = true;
            this.cacheData();
            SCP.helpers.updateStats();
            return true;
        } catch (e) {
            if (!silent) this.updateSyncBar(false);
            console.error('SCP loadEmployees failed:', e);
            return false;
        }
    },

    /**
     * Load supervisors list
     */
    async loadSupervisors() {
        if (!window.supabase) return false;
        try {
            const { data, error } = await supabase.from('supervisors').select('*').order('name');
            if (error) return this._handleError(error, 'Carregar Supervisores');
            SCP.state.supervisors = data.map(s => ({ id: s.id, nome: s.name, ativo: s.is_active !== false }));
            return true;
        } catch (e) {
            console.error('SCP loadSupervisors failed:', e);
            return false;
        }
    },

    /**
     * Load attendance for a specific date (and optionally a supervisor)
     */
    async loadAttendance(date, supervisorId = null) {
        if (!window.supabase) return false;
        try {
            this.updateSyncBar(true);

            let query = supabase.from('attendance_records')
                .select('employee_id, status, observations')
                .eq('date', date);

            if (supervisorId) {
                query = query.eq('supervisor_id', supervisorId);
            }

            const { data, error } = await query;
            this.updateSyncBar(false);
            if (error) return this._handleError(error, 'Carregar Presença');

            SCP.state.attendanceRecords = {};
            data.forEach(rec => {
                SCP.state.attendanceRecords[rec.employee_id] = rec.status;
            });
            return true;
        } catch (e) {
            this.updateSyncBar(false);
            console.error('SCP loadAttendance failed:', e);
            return false;
        }
    },

    /**
     * Save/upsert attendance records for multiple employees
     */
    async saveAttendance(records) {
        if (!window.supabase || !records.length) return null;
        this.updateSyncBar(true);

        try {
            const userName = SCP.auth.currentUser
                ? (SCP.auth.currentUser.nome || SCP.auth.currentUser.usuario)
                : 'Sistema';

            const rows = records.map(r => ({
                employee_id: r.employeeId,
                supervisor_id: r.supervisorId,
                date: r.date,
                status: r.status,
                observations: r.observations || null,
                created_by_name: userName,
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase
                .from('attendance_records')
                .upsert(rows, { onConflict: 'employee_id,date' });

            if (error) throw error;
            this.updateSyncBar(false);
            return true;
        } catch (e) {
            this.updateSyncBar(false);
            return this._handleError(e, 'Salvar Presença');
        }
    },

    /**
     * Load dashboard data: all employees + attendance for date range
     */
    async loadDashboard(startDate, endDate) {
        if (!window.supabase) return false;
        try {
            this.updateSyncBar(true);

            const [
                { data: allEmployees, error: errEmp },
                { data: records, error: errRec },
                { data: supervisors, error: errSup }
            ] = await Promise.all([
                supabase.from('employees').select('id, name, function, regime, status, supervisor_id, supervisors(name)').eq('status', 'ATIVO').order('name'),
                supabase.from('attendance_records').select('employee_id, supervisor_id, date, status').gte('date', startDate).lte('date', endDate),
                supabase.from('supervisors').select('id, name').eq('is_active', true).order('name')
            ]);

            this.updateSyncBar(false);

            if (errEmp) return this._handleError(errEmp, 'Dashboard Colaboradores');
            if (errRec) return this._handleError(errRec, 'Dashboard Registros');
            if (errSup) return this._handleError(errSup, 'Dashboard Supervisores');

            // Build date range
            const dates = [];
            const current = new Date(startDate + 'T00:00:00');
            const end = new Date(endDate + 'T00:00:00');
            while (current <= end) {
                dates.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }

            // Build records map: { employeeId: { date: status } }
            const recordsMap = {};
            records.forEach(r => {
                if (!recordsMap[r.employee_id]) recordsMap[r.employee_id] = {};
                recordsMap[r.employee_id][r.date] = r.status;
            });

            // Build employees list
            const employees = allEmployees.map(e => ({
                id: e.id,
                nome: e.name,
                funcao: e.function || '—',
                regime: e.regime || '—',
                supervisor: e.supervisors ? e.supervisors.name : '—',
                supervisor_id: e.supervisor_id
            }));

            // Compute status totals
            const statusTotals = {};
            Object.keys(SCP.CONFIG.STATUS_CODES).forEach(k => statusTotals[k] = 0);
            records.forEach(r => { if (statusTotals[r.status] !== undefined) statusTotals[r.status]++; });

            // Compute daily stats
            const dailyStats = dates.map(d => {
                const dayStats = { date: d };
                Object.keys(SCP.CONFIG.STATUS_CODES).forEach(k => dayStats[k] = 0);
                records.forEach(r => { if (r.date === d && dayStats[r.status] !== undefined) dayStats[r.status]++; });
                return dayStats;
            });

            // Top faltas
            const faltasByEmployee = {};
            records.filter(r => r.status === 'F').forEach(r => {
                faltasByEmployee[r.employee_id] = (faltasByEmployee[r.employee_id] || 0) + 1;
            });
            const topFaltas = Object.entries(faltasByEmployee)
                .map(([id, count]) => {
                    const emp = employees.find(e => e.id === id);
                    return { name: emp ? emp.nome : 'Desconhecido', count };
                })
                .sort((a, b) => b.count - a.count);

            SCP.state.dashboardData = {
                fullGrid: { employees, records: recordsMap, dates },
                statusTotals,
                dailyStats,
                topFaltas,
                supervisors: supervisors.map(s => ({ id: s.id, nome: s.name }))
            };

            return true;
        } catch (e) {
            this.updateSyncBar(false);
            console.error('SCP loadDashboard failed:', e);
            return false;
        }
    },

    cacheData() {
        try {
            const payload = {
                timestamp: Date.now(),
                employees: SCP.state.employees,
                supervisors: SCP.state.supervisors
            };
            localStorage.setItem('SCP_CACHE', JSON.stringify(payload));
        } catch (e) { console.warn('SCP: Could not save cache:', e); }
    },

    clearCache() {
        localStorage.removeItem('SCP_CACHE');
    },

    loadCache() {
        try {
            const cached = localStorage.getItem('SCP_CACHE');
            if (!cached) return false;
            const parsed = JSON.parse(cached);
            if (parsed.employees) SCP.state.employees = parsed.employees;
            if (parsed.supervisors) SCP.state.supervisors = parsed.supervisors;
            SCP.state.dataLoaded = true;
            return true;
        } catch (e) {
            console.warn('SCP cache load failed:', e);
            return false;
        }
    }
};
