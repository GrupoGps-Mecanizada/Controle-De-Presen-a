-- ========================================================================================
-- CONFIGURAÇÃO DE E-MAILS DOS SUPERVISORES
-- ========================================================================================
-- Execute este script no SQL Editor do Supabase APÓS ter executado o script anterior
-- (supabase_policies.sql que cria a coluna category).
--
-- Este script:
-- 1. Garante que a coluna "email" exista na tabela supervisors
-- 2. Atualiza o e-mail de cada supervisor com o padrão @mecanizada.com
-- 3. Lista os supervisores para conferência
-- ========================================================================================

-- 1. Garantir que a coluna email existe
ALTER TABLE public.supervisors ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Atualizar e-mails dos supervisores
-- ⚠️ IMPORTANTE: Ajuste os nomes abaixo para corresponder EXATAMENTE ao campo "name"
-- da sua tabela supervisors. Use SELECT * FROM supervisors; para conferir os nomes.

UPDATE public.supervisors SET email = 'sebastiao@mecanizada.com'       WHERE upper(name) = 'SEBASTIÃO' OR upper(name) = 'SEBASTIAO';
UPDATE public.supervisors SET email = 'juniorpereira@mecanizada.com'   WHERE upper(name) = 'JUNIOR PEREIRA';
UPDATE public.supervisors SET email = 'aspirador@mecanizada.com'       WHERE upper(name) = 'ASPIRADOR';
UPDATE public.supervisors SET email = 'israel@mecanizada.com'          WHERE upper(name) = 'ISRAEL';
UPDATE public.supervisors SET email = 'matusalem@mecanizada.com'       WHERE upper(name) = 'MATUSALEM';
UPDATE public.supervisors SET email = 'wellison@mecanizada.com'        WHERE upper(name) = 'WELLISON';
UPDATE public.supervisors SET email = 'ozias@mecanizada.com'           WHERE upper(name) = 'OZIAS';
UPDATE public.supervisors SET email = '16horas@mecanizada.com'         WHERE upper(name) = '16 HORAS';

-- 3. Verificar resultado
SELECT id, name, email FROM public.supervisors ORDER BY name;

-- ========================================================================================
-- PRÓXIMO PASSO: CRIAR CONTAS NO SUPABASE AUTH
-- ========================================================================================
-- Depois de executar este SQL, você precisa criar as contas de login para cada
-- supervisor no painel do Supabase:
--
-- 1. Vá em Authentication > Users > Add User
-- 2. Para cada supervisor, crie uma conta com:
--    - Email: o mesmo e-mail definido acima (ex: juniorpereira@mecanizada.com)
--    - Password: defina uma senha padrão (ex: mecanizada2024)
--    - Auto Confirm User: marque SIM
--
-- Lista de contas a criar:
--    sebastiao@mecanizada.com
--    juniorpereira@mecanizada.com
--    aspirador@mecanizada.com
--    israel@mecanizada.com
--    matusalem@mecanizada.com
--    wellison@mecanizada.com
--    ozias@mecanizada.com
--    16horas@mecanizada.com
--
-- Para a gestão (dashboard):
--    gestao@gestaomecanizada.com (perfil GESTAO)
--
-- Para acesso administrativo total:
--    admin@sge (perfil ADM)
-- ========================================================================================
