'use strict';

/**
 * SCP — App Initialization
 * Entry point, event wiring, and bootstrap
 */
window.SCP = window.SCP || {};

SCP.app = {
    async init() {
        const loadingScreen = document.getElementById('loading-screen');
        const loginScreen = document.getElementById('login-screen');

        // Check auth status
        if (await SCP.auth.init()) {
            // Already logged in
            if (loginScreen) loginScreen.classList.add('hidden');

            const hasCache = localStorage.getItem('SCP_CACHE');
            if (hasCache && loadingScreen) loadingScreen.classList.add('hide');

            SCP.app.boot();
        } else {
            // Needs login
            if (loadingScreen) loadingScreen.classList.add('hide');
            if (loginScreen) loginScreen.classList.remove('hidden');
            SCP.app.setupLoginForm();
        }
    },

    setupLoginForm() {
        const form = document.getElementById('login-form');
        const errEl = document.getElementById('login-error');
        const submitBtn = document.getElementById('login-submit');
        const toggleBtn = document.getElementById('toggle-register');
        const nameGroup = document.getElementById('group-name');

        let isRegistering = false;

        if (!form) return;

        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                isRegistering = !isRegistering;
                if (isRegistering) {
                    nameGroup.style.display = 'flex';
                    submitBtn.textContent = 'Criar Conta';
                    toggleBtn.textContent = 'Já tem uma conta? Entrar';
                } else {
                    nameGroup.style.display = 'none';
                    submitBtn.textContent = 'Entrar';
                    toggleBtn.textContent = 'Criar uma conta';
                }
                errEl.textContent = '';
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errEl.textContent = '';
            submitBtn.disabled = true;
            submitBtn.textContent = isRegistering ? 'Criando...' : 'Autenticando...';

            const email = document.getElementById('login-user').value;
            const pass = document.getElementById('login-pass').value;
            const name = document.getElementById('login-name')?.value || '';

            let res;
            if (isRegistering) {
                res = await SCP.auth.register(email, pass, name);
                if (res.success) {
                    SCP.helpers.toast('Conta criada! Por favor, faça login.', 'success');
                    isRegistering = false;
                    nameGroup.style.display = 'none';
                    submitBtn.textContent = 'Entrar';
                    toggleBtn.textContent = 'Criar uma conta';
                    submitBtn.disabled = false;
                    return;
                }
            } else {
                res = await SCP.auth.login(email, pass);
                if (res.success) {
                    document.getElementById('login-screen').classList.add('hidden');
                    document.getElementById('loading-screen').classList.remove('hide');
                    SCP.app.boot();
                    return;
                }
            }

            errEl.textContent = res.error;
            submitBtn.disabled = false;
            submitBtn.textContent = isRegistering ? 'Criar Conta' : 'Entrar';
        });
    },

    async boot() {
        const loadingScreen = document.getElementById('loading-screen');
        const statusEl = document.getElementById('loading-status');
        const topbar = document.getElementById('topbar');
        const main = document.getElementById('main');

        const isInstantBoot = loadingScreen && loadingScreen.classList.contains('hide');

        if (!isInstantBoot) {
            if (topbar) topbar.style.opacity = '0';
            if (main) main.style.opacity = '0';
        }

        const setStatus = (msg) => {
            if (statusEl) statusEl.innerHTML = msg + '<span class="loading-dots"></span>';
        };

        // Try cache first
        let usedCache = SCP.api.loadCache();
        if (usedCache) {
            setStatus('Carregando (cache)...');
            setTimeout(() => SCP.api.loadEmployees(true), 1500);
        }

        // Initialize Real-time
        if (window.supabase) SCP.api.setupRealtime();

        // Load data if no cache
        if (!usedCache) {
            setStatus('Conectando ao Supabase...');
            await SCP.api.loadSupervisors();
            await SCP.api.loadEmployees();

            // Load attendance for current date
            const supervisorId = SCP.auth.currentUser && !SCP.helpers.hasGestaoAccess()
                ? SCP.auth.currentUser.supervisor_id
                : null;
            await SCP.api.loadAttendance(SCP.state.selectedDate, supervisorId);

            setStatus('Montando interface...');
        }

        // Setup events
        SCP.app.setupNavigation();
        SCP.app.setupRefresh();

        // Build dynamic UI
        SCP.helpers.updateStats();

        // Determine initial view
        const isGestao = SCP.helpers.hasGestaoAccess();
        const initialView = isGestao ? 'dashboard' : 'attendance';

        // Load dashboard data if gestão
        if (isGestao) {
            setStatus('Carregando dashboard...');
            await SCP.api.loadDashboard(SCP.state.filters.startDate, SCP.state.filters.endDate);
        }

        // Switch to initial view
        SCP.navigation.switchView(initialView, true);

        // Build dashboard header/filters if applicable
        if (isGestao) {
            SCP.navigation.buildDashboardHeader();
            SCP.navigation.buildDashboardFilters();
        }

        // Show app
        if (isInstantBoot) {
            if (topbar) topbar.style.opacity = '1';
            if (main) main.style.opacity = '1';
            if (loadingScreen && loadingScreen.parentNode) loadingScreen.remove();
        } else {
            await new Promise(r => setTimeout(r, 300));
            if (topbar) { topbar.style.transition = 'opacity .4s ease'; topbar.style.opacity = '1'; }
            if (main) { main.style.transition = 'opacity .4s ease'; main.style.opacity = '1'; }
            if (loadingScreen && loadingScreen.parentNode) {
                loadingScreen.classList.add('hide');
                setTimeout(() => loadingScreen.remove(), 700);
            }
        }

        // Listen for popstate
        window.addEventListener('popstate', (e) => {
            const view = (e.state && e.state.view) || SCP.navigation.getInitialView();
            SCP.navigation.switchView(view, true);
        });
    },

    setupNavigation() {
        // Logo click → default view
        const logo = document.getElementById('logo-home');
        if (logo) {
            logo.addEventListener('click', () => {
                const view = SCP.helpers.hasGestaoAccess() ? 'dashboard' : 'attendance';
                SCP.navigation.switchView(view);
            });
        }

        // Nav buttons
        document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                SCP.navigation.switchView(btn.dataset.view);
                const nav = document.getElementById('nav');
                if (nav && nav.classList.contains('mobile-open')) nav.classList.remove('mobile-open');
            });
        });

        // Mobile menu
        const mobileBtn = document.getElementById('mobile-menu-btn');
        if (mobileBtn) {
            mobileBtn.addEventListener('click', () => {
                const nav = document.getElementById('nav');
                if (nav) nav.classList.toggle('mobile-open');
            });
        }
    },

    setupRefresh() {
        const btn = document.getElementById('refresh-btn');
        if (btn) {
            btn.addEventListener('click', async () => {
                const icon = btn.querySelector('svg');
                if (icon) icon.classList.add('loading-spinner');
                await SCP.api.loadEmployees(true);
                if (icon) icon.classList.remove('loading-spinner');
                SCP.helpers.toast('Dados sincronizados!', 'success');

                // Re-render current view
                if (SCP.state.activeView === 'attendance') SCP.attendance.render();
                if (SCP.state.activeView === 'dashboard') SCP.dashboard.render();
            });
        }
    }
};

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => SCP.app.init());
