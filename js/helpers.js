'use strict';

/**
 * SCP — Helper Functions
 * Utility functions used across the application
 */
window.SCP = window.SCP || {};

SCP.helpers = {
    getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    },

    getMonthStart() {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    },

    formatDate(d) {
        return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    },

    formatDateShort(d) {
        return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    },

    formatDateTime(iso) {
        if (!iso) return '—';
        try { return new Date(iso).toLocaleString('pt-BR'); } catch { return iso; }
    },

    getPreviousDay(d) {
        const D = new Date(d + 'T00:00:00');
        D.setDate(D.getDate() - 1);
        return D.toISOString().split('T')[0];
    },

    getNextDay(d) {
        const D = new Date(d + 'T00:00:00');
        D.setDate(D.getDate() + 1);
        return D.toISOString().split('T')[0];
    },

    hasGestaoAccess() {
        if (!SCP.auth || !SCP.auth.currentUser) return false;
        const perfil = SCP.auth.currentUser.perfil;
        return perfil === 'ADM' || perfil === 'GESTAO';
    },

    toast(msg, type = 'success') {
        const icons = {
            success: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="2 8 6 12 14 4"/></svg>',
            error: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 2l12 12M14 2L2 14"/></svg>',
            info: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="7"/><path d="M8 5v4M8 11v1"/></svg>',
            warning: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 1L1 15h14L8 1z"/><path d="M8 6v4M8 12v1"/></svg>',
        };
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = (icons[type] || '') + `<span>${msg}</span>`;
        document.getElementById('toast-container').appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(20px)';
            setTimeout(() => el.remove(), 300);
        }, SCP.CONFIG.toastDuration);
    },

    updateStats() {
        const total = SCP.state.employees.length;
        const marked = Object.keys(SCP.state.attendanceRecords).length;
        const el = document.getElementById('stat-total');
        if (el) el.textContent = total || '—';
        const el2 = document.getElementById('stat-marked');
        if (el2) el2.textContent = marked || '—';
    },

    showLoading(show = true) {
        const el = document.getElementById('loading-overlay');
        if (el) el.classList.toggle('hidden', !show);
    }
};
