'use strict';

/**
 * SCP — Supabase Configuration
 * Initializes the Supabase client for the attendance application.
 * Uses the SAME Supabase project as SGE (Gestão de Efetivo).
 */
window.SCP = window.SCP || {};

SCP.SUPABASE_URL = 'https://mgcjidryrjqiceielmzp.supabase.co';
SCP.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nY2ppZHJ5cmpxaWNlaWVsbXpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjEwNzEsImV4cCI6MjA4NzY5NzA3MX0.UAKkzy5fMIkrlmnqz9E9KknUw9xhoYpa3f1ptRpOuAA';

if (SCP.SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SCP.SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
    window.supabase = supabase.createClient(SCP.SUPABASE_URL, SCP.SUPABASE_KEY);
    console.info('SCP: Supabase client initialized.');
} else {
    console.warn('SCP: Supabase credentials not set. Please update js/supabase-config.js');
}
