'use strict';

/**
 * SCP — Configuration
 * Central configuration for the Attendance Control application
 */
window.SCP = window.SCP || {};

SCP.CONFIG = {
    toastDuration: 3500,
    cacheDuration: 5 * 60 * 1000,

    STATUS_CODES: {
        'P': { label: 'Presente', color: '#10b981', bg: '#d1fae5', text: '#065f46', direct: true },
        'F': { label: 'Falta', color: '#ef4444', bg: '#fee2e2', text: '#991b1b' },
        'FE': { label: 'Férias', color: '#f59e0b', bg: '#fef3c7', text: '#92400e', direct: true },
        'TR': { label: 'Treinamento', color: '#3b82f6', bg: '#dbeafe', text: '#1e40af' },
        'AF': { label: 'Afastado', color: '#6b7280', bg: '#e5e7eb', text: '#374151' },
        'AT': { label: 'Atestado', color: '#f97316', bg: '#fed7aa', text: '#9a3412' },
        'FO': { label: 'Folga', color: '#8b5cf6', bg: '#ede9fe', text: '#5b21b6', direct: true },
        'EX': { label: 'Extra', color: '#14b8a6', bg: '#ccfbf1', text: '#115e59', direct: true },
        'TH': { label: 'Troca de Horário', color: '#ec4899', bg: '#fce7f3', text: '#9f1239' },
        'TE': { label: 'Troca de Escala', color: '#06b6d4', bg: '#cffafe', text: '#164e63' },
        'DS': { label: 'Desligado', color: '#64748b', bg: '#f1f5f9', text: '#1e293b' }
    },

    ACCESS_LEVELS: {
        SUPERVISOR: 'SUPERVISOR',
        GESTAO: 'GESTAO',
        ADM: 'ADM'
    }
};
