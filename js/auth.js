'use strict';

/**
 * SCP — Authentication Module (Via Central SGE SSO com fallback local)
 * Handles token recovery, session management, and role-based permissions
 *
 * BYPASS ativo para rollout gradual — login local via Supabase Auth continua funcionando.
 * Quando a Central SSO estiver 100%, basta comentar a linha SGE_SSO_BYPASS = true.
 *
 * Preserva: supervisor lookup via efetivo_gps_mec_supervisores apos autenticacao
 */
window.SCP = window.SCP || {};

// ========== SSO MODE ==========
// BYPASS ativo para rollout gradual — login local continua funcionando
window.SGE_SSO_BYPASS = true;

// Instancia o SDK passando o slug do sistema
const ssoClient = new window.SgeAuthSDK('controle_presenca_mec');

SCP.auth = {
    currentUser: null,

    /**
     * Initialize Auth — tenta SSO, senao fallback para Supabase local
     */
    async init() {
        // 1. Tenta autenticacao via SSO Token
        const userData = await ssoClient.checkAuth();

        if (userData) {
            console.log('[SCP AUTH] Autenticado via SSO:', userData.nome);
            await this._buildUserProfile({
                id: userData.id,
                email: userData.email,
                nome: userData.nome,
                perfil: userData.perfil || 'SUPERVISOR',
                supervisor_id: userData.supervisor_id || null,
                supervisor_nome: userData.supervisor_nome || null
            });

            // Recuperar access_token da sessao Supabase (necessario para RLS)
            let token = null;
            try {
                if (window.supabase) {
                    const { data: { session } } = await window.supabase.auth.getSession();
                    token = session?.access_token || null;
                }
            } catch (e) {
                console.warn('[SCP AUTH] Nao foi possivel recuperar token Supabase:', e);
            }

            await this.registerSession(userData.id, token);
            return true;
        }

        if (ssoClient.isBypass()) {
            // BYPASS: tenta autenticacao via sessao Supabase local
            console.log('[SCP AUTH] BYPASS ativo — verificando sessao Supabase local...');
            try {
                if (window.supabase) {
                    const { data: { session } } = await window.supabase.auth.getSession();

                    // Listen for auth state changes (local mode)
                    supabase.auth.onAuthStateChange(async (_event, session) => {
                        if (session) {
                            await this._updateFromSupabaseUser(session.user);
                        } else {
                            this.currentUser = null;
                        }
                    });

                    if (session && session.user) {
                        console.log('[SCP AUTH] Sessao Supabase local encontrada:', session.user.email);
                        await this._updateFromSupabaseUser(session.user);
                        await this.registerSession(session.user.id, session.access_token);
                        return true;
                    }
                }
            } catch (e) {
                console.warn('[SCP AUTH] Erro ao verificar sessao Supabase:', e);
            }

            console.log('[SCP AUTH] Sem sessao — exibindo login local');
            return false;
        }

        // SSO ativo mas sem token — ssoClient ja redirecionou
        return false;
    },

    /**
     * Popula currentUser a partir de user do Supabase Auth (modo local/bypass)
     * Preserva a logica original de roles por dominio de e-mail + supervisor lookup
     */
    async _updateFromSupabaseUser(user) {
        const email = user.email || '';
        let perf = user.user_metadata?.perfil || 'SUPERVISOR';

        if (email.endsWith('@sge')) {
            perf = 'ADM';
        } else if (email.endsWith('@gestaomecanizada.com')) {
            perf = 'GESTAO';
        } else if (email.endsWith('@mecanizada.com')) {
            perf = 'SUPERVISOR';
        }

        await this._buildUserProfile({
            id: user.id,
            email: email,
            nome: user.user_metadata?.full_name || email.split('@')[0],
            perfil: perf,
            supervisor_id: user.user_metadata?.supervisor_id || null,
            supervisor_nome: user.user_metadata?.supervisor_nome || null
        });
    },

    /**
     * Build full user profile with supervisor lookup when needed
     * This is the core logic preserved from the original auth.js
     */
    async _buildUserProfile(userData) {
        let supervisorId = userData.supervisor_id || null;
        let supervisorNome = userData.supervisor_nome || null;

        // Se for supervisor e nao tiver ID, busca na tabela supervisors pelo e-mail
        if (userData.perfil === 'SUPERVISOR' && !supervisorId && window.supabase) {
            try {
                console.log('SCP Auth: Buscando supervisor_id para e-mail:', userData.email);
                const { data, error } = await supabase.schema('gps_mec').from('efetivo_gps_mec_supervisores')
                    .select('id, name')
                    .eq('email', userData.email)
                    .single();
                if (error) {
                    console.warn('SCP Auth: Erro na busca do supervisor:', error.message);
                } else if (data) {
                    supervisorId = data.id;
                    supervisorNome = data.name;
                    console.log('SCP Auth: Supervisor encontrado:', supervisorNome, '| ID:', supervisorId);
                } else {
                    console.warn('SCP Auth: Nenhum supervisor encontrado com e-mail:', userData.email);
                }
            } catch (e) {
                console.warn('SCP Auth: Excecao ao buscar supervisor:', e);
            }
        }

        console.log('SCP Auth: Perfil final:', userData.perfil, '| supervisor_id:', supervisorId);

        this.currentUser = {
            id: userData.id,
            usuario: userData.email ? userData.email.split('@')[0] : 'Desconhecido',
            email: userData.email || '',
            nome: userData.nome || 'Usuario',
            perfil: userData.perfil || 'SUPERVISOR',
            supervisor_id: supervisorId,
            supervisor_nome: supervisorNome
        };

        this.applyRoleUI(this.currentUser.perfil);
    },

    /**
     * Register session in sge_central_sessoes for the Radar
     */
    async registerSession(userId, accessToken) {
        try {
            const existingId = localStorage.getItem('sge_session_id');
            if (existingId) {
                console.log('[SCP AUTH] Sessao ja registrada:', existingId);
                return;
            }

            if (!accessToken) {
                try {
                    if (window.supabase) {
                        const { data: { session } } = await window.supabase.auth.getSession();
                        accessToken = session?.access_token || null;
                    }
                } catch (e) { /* ignore */ }
            }

            if (!accessToken) {
                console.warn('[SCP AUTH] Sem token autenticado — sessao nao sera registrada (RLS bloqueia anon)');
                return;
            }

            const SUPABASE_URL = window.SCP?.CONFIG?.SUPABASE_URL || this._getSupabaseUrl();
            const ANON_KEY = window.SCP?.CONFIG?.SUPABASE_KEY || this._getAnonKey();
            if (!SUPABASE_URL || !ANON_KEY) return;

            const headers = {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Profile': 'gps_compartilhado',
                'Accept-Profile': 'gps_compartilhado',
                'Prefer': 'return=representation'
            };

            // Get sistema_id for this app slug
            const sysResp = await fetch(
                `${SUPABASE_URL}/rest/v1/sge_central_sistemas?slug=eq.controle_presenca_mec&select=id`,
                { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${accessToken}`, 'Accept-Profile': 'gps_compartilhado', 'Accept': 'application/vnd.pgrst.object+json' } }
            );

            if (!sysResp.ok) {
                console.warn('[SCP AUTH] Nao conseguiu buscar sistema para sessao');
                return;
            }

            const sysData = await sysResp.json();
            if (!sysData?.id) return;

            // Insert session
            const sessResp = await fetch(`${SUPABASE_URL}/rest/v1/sge_central_sessoes`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    usuario_id: userId,
                    sistema_id: sysData.id,
                    ip_address: '0.0.0.0',
                    user_agent: navigator.userAgent.substring(0, 200),
                    expira_em: new Date(Date.now() + (1000 * 60 * 60 * 8)).toISOString()
                })
            });

            if (sessResp.ok) {
                const sessData = await sessResp.json();
                const sessionId = Array.isArray(sessData) ? sessData[0]?.id : sessData?.id;
                if (sessionId) {
                    localStorage.setItem('sge_session_id', sessionId);
                    localStorage.setItem('sge_session_user_id', userId);
                    localStorage.setItem('sge_session_token', accessToken);
                    localStorage.setItem('sge_session_user_name', this.currentUser?.nome || 'Usuario');
                    localStorage.setItem('sge_session_user_email', this.currentUser?.email || '');
                    localStorage.setItem('sge_session_app_slug', 'controle_presenca_mec');
                    localStorage.setItem('sge_session_app_name', 'Controle de Presenca');
                    console.log('[SCP AUTH] Sessao registrada para Radar:', sessionId);
                    if (window.SGE_SESSION_PING) window.SGE_SESSION_PING.start();
                }
            } else {
                const errText = await sessResp.text().catch(() => '');
                console.warn('[SCP AUTH] Falha ao registrar sessao:', sessResp.status, errText);
            }
        } catch (err) {
            console.warn('[SCP AUTH] Erro ao registrar sessao:', err);
        }
    },

    /**
     * Helper: resolve Supabase URL from config or supabase client
     */
    _getSupabaseUrl() {
        try {
            if (window.supabase?.supabaseUrl) return window.supabase.supabaseUrl;
            if (window.SCP?.CONFIG?.SUPABASE_URL) return window.SCP.CONFIG.SUPABASE_URL;
        } catch (e) { }
        return null;
    },

    _getAnonKey() {
        try {
            if (window.supabase?.supabaseKey) return window.supabase.supabaseKey;
            if (window.SCP?.CONFIG?.SUPABASE_KEY) return window.SCP.CONFIG.SUPABASE_KEY;
        } catch (e) { }
        return null;
    },

    /**
     * Login local via Supabase Auth (usado em BYPASS mode)
     */
    async login(email, password) {
        if (!window.supabase) return { success: false, error: 'Supabase nao configurado' };

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            // Limpar cache antigo para forcar carregamento fresco com filtro correto
            if (SCP.api?.clearCache) SCP.api.clearCache();
            await this._updateFromSupabaseUser(data.user);
            await this.registerSession(data.user.id, data.session?.access_token);
            return { success: true, user: this.currentUser };
        } catch (e) {
            return { success: false, error: e.message || 'Erro ao fazer login' };
        }
    },

    /**
     * Register local via Supabase Auth (usado em BYPASS mode)
     */
    async register(email, password, name) {
        if (!window.supabase) return { success: false, error: 'Supabase nao configurado' };

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

    /**
     * Logout
     */
    async logout() {
        console.log('[SCP AUTH] Logout');
        if (SCP.api?.clearCache) SCP.api.clearCache();

        // Clean up session data
        try {
            localStorage.removeItem('sge_session_id');
            localStorage.removeItem('sge_session_user_id');
            localStorage.removeItem('sge_session_token');
            localStorage.removeItem('sge_session_user_name');
            localStorage.removeItem('sge_session_user_email');
            localStorage.removeItem('sge_session_app_slug');
            localStorage.removeItem('sge_session_app_name');
        } catch (e) { }

        // Stop ping
        if (window.SGE_SESSION_PING) window.SGE_SESSION_PING.stop();

        if (ssoClient.isBypass()) {
            if (window.supabase) await supabase.auth.signOut();
            window.location.reload();
            return;
        }

        ssoClient.logout();
    },

    /**
     * Check role hierarchy: ADM > GESTAO > SUPERVISOR
     */
    hasRole(requiredRole) {
        if (!this.currentUser) return false;
        const role = this.currentUser.perfil;
        if (role === 'ADM') return true;
        if (requiredRole === 'GESTAO' && role === 'GESTAO') return true;
        if (requiredRole === 'SUPERVISOR') return true;
        return false;
    },

    /**
     * Apply CSS classes and UI logic based on role
     */
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
