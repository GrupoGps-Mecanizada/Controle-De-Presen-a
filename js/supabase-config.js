'use strict';

/**
 * SCP — Supabase Configuration
 * Initializes the Supabase client for the attendance application.
 * Uses the SAME Supabase project as SGE (Gestão de Efetivo).
 */
window.SCP = window.SCP || {};

SCP.SUPABASE_URL = 'https://mgcjidryrjqiceielmzp.supabase.co';
SCP.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nY2ppZHJ5cmpxaWNlaWVsbXpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjEwNzEsImV4cCI6MjA4NzY5NzA3MX0.UAKkzy5fMIkrlmnqz9E9KknUw9xhoYpa3f1ptRpOuAA';

// Uma conexão só, a mesma do login da Central (SGE.cliente do sge-core): o sistema
// lê e grava com a sessão de quem entrou, e não como anônimo.
// window.supabase vira a conexão; o createClient fica nela porque o sge-core o procura ali.
(function () {
    const lib = window.supabase;
    const core = window.SGECore;
    const db = core && core.cliente ? core.cliente(SCP.SUPABASE_URL, SCP.SUPABASE_KEY) : lib.createClient(SCP.SUPABASE_URL, SCP.SUPABASE_KEY);
    db.createClient = lib.createClient;
    window.supabase = db;
})();
