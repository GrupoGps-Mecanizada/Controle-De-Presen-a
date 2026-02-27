'use strict';

/**
 * SCP — State Management
 * Centralized application state
 */
window.SCP = window.SCP || {};

SCP.state = {
    activeView: 'login',
    user: null,
    employees: [],
    supervisors: [],
    selectedDate: new Date().toISOString().split('T')[0],
    attendanceRecords: {},
    dashboardData: null,
    dashboardTab: 'board',
    searchQuery: '',
    dataLoaded: false,
    saveState: 'idle',
    charts: {},
    filters: {
        startDate: (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]; })(),
        endDate: new Date().toISOString().split('T')[0],
        period: '30days'
    },
    syncLock: false,
    lastSyncHash: null
};
