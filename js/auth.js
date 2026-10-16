'use strict';

/**
 * SCP — Login (via SGE.acesso do sge-core)
 * Usa a sessão real do login da Central (Supabase Auth). Sem sessão, vai para o login da Central.
 * Na dúvida (erro, rede), não entra.
 * Preserva: busca do supervisor em efetivo_gps_mec_supervisores pelo e-mail.
 */
window.SCP = window.SCP || {};

const SLUG_SISTEMA = 'controle_presenca_mec';

// Régua única → nomes antigos (ver "Régua única de acesso - especificação" no cofre).
const PERFIL_POR_PAPEL = { ADMIN: 'ADM', GESTOR: 'GESTAO', SUPERVISOR: 'SUPERVISOR' };

SCP.auth = {
    currentUser: null,

    async init() {
        const core = window.SGECore;
        if (!core || !core.acesso) {
            // Sem o sge-core (falha ao baixar) não dá para conferir o login: não entra.
            const status = document.getElementById('loading-status');
            if (status) status.textContent = 'Não consegui carregar o login. Confira a internet e recarregue a página.';
            await new Promise(() => {});
        }

        // Só continua se a pessoa estiver logada e tiver acesso a este sistema.
        const r = await core.acesso.entrar(SLUG_SISTEMA);
        await this._buildUserProfile({
            id: r.usuario.id,
            email: r.usuario.email,
            nome: r.usuario.nome,
            perfil: PERFIL_POR_PAPEL[r.papel] || 'VISAO'
        });
        return true;
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

    // O login agora é só pela Central.
    async login() { return { success: false, error: 'Entre pela Central do SGE.' }; },
    async register() { return { success: false, error: 'O cadastro é feito pela Central do SGE.' }; },

    async logout() {
        if (SCP.api?.clearCache) SCP.api.clearCache();
        window.SGECore.acesso.sair(SLUG_SISTEMA);
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
