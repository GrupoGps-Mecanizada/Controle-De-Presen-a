'use strict';

/**
 * SCP — Authentication Module (Supabase Auth)
 * Handles login, session management, and role-based permissions
 */
window.SCP = window.SCP || {};

SCP.auth = {
    currentUser: null,

    async init() {
        if (!window.supabase) return false;

        const { data: { session } } = await supabase.auth.getSession();

        supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                this.updateCurrentUser(session.user);
            } else {
                this.currentUser = null;
            }
        });

        if (session) {
            this.updateCurrentUser(session.user);
            return true;
        }
        return false;
    },

    updateCurrentUser(user) {
        this.currentUser = {
            id: user.id,
            usuario: user.email.split('@')[0],
            email: user.email,
            nome: user.user_metadata.full_name || user.email.split('@')[0],
            perfil: user.user_metadata.perfil || 'SUPERVISOR',
            supervisor_id: user.user_metadata.supervisor_id || null,
            supervisor_nome: user.user_metadata.supervisor_nome || null
        };
        this.applyRoleUI(this.currentUser.perfil);
    },

    async login(email, password) {
        if (!window.supabase) return { success: false, error: 'Supabase não configurado' };

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            this.updateCurrentUser(data.user);
            return { success: true, user: this.currentUser };
        } catch (e) {
            return { success: false, error: e.message || 'Erro ao fazer login' };
        }
    },

    async register(email, password, name) {
        if (!window.supabase) return { success: false, error: 'Supabase não configurado' };

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        perfil: 'SUPERVISOR',
                        full_name: name
                    }
                }
            });
            if (error) throw error;
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message || 'Erro ao criar conta' };
        }
    },

    async logout() {
        if (window.supabase) await supabase.auth.signOut();
        SCP.api.clearCache();
        window.location.reload();
    },

    hasRole(requiredRole) {
        if (!this.currentUser) return false;
        const role = this.currentUser.perfil;
        if (role === 'ADM') return true;
        if (requiredRole === 'GESTAO' && role === 'GESTAO') return true;
        if (requiredRole === 'SUPERVISOR') return true;
        return false;
    },

    applyRoleUI(role) {
        document.body.classList.remove('role-adm', 'role-gestao', 'role-supervisor');
        document.body.classList.add(`role-${role.toLowerCase()}`);

        const topbarUser = document.getElementById('topbar-user');
        if (topbarUser && this.currentUser) {
            topbarUser.innerHTML = `
                <div style="display:flex; align-items:center; gap:4px; margin-right:12px; font-size:13px;">
                    <span style="color:var(--text-3);">Bem-vindo(a),</span>
                    <strong style="color:var(--text-1); font-weight:700;">${this.currentUser.nome}</strong>
                </div>
                <button title="Sair do sistema" id="logout-btn" style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:13px; background:none; border:none; color:var(--text-3); cursor:pointer; padding:4px 8px; border-radius:4px; transition: background 0.2s">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                    Sair
                </button>
            `;
            document.getElementById('logout-btn').onclick = () => this.logout();
        }
    }
};
