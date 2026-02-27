-- ========================================================================================
-- MIGRAÇÃO: Adicionar coluna "category" na tabela employees
-- ========================================================================================
-- Execute este script no SQL Editor do Supabase (painel > SQL Editor > New Query > Run)
--
-- A coluna "category" classifica cada colaborador como:
--   OPERACIONAL = Motorista, Operador (quem faz lista de presença)
--   GESTAO      = Supervisor, Técnico de Segurança, Gestão, etc.
-- ========================================================================================

-- 1. Adicionar a coluna (se não existir)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'GESTAO';

-- 2. Popular automaticamente: quem tem função MOTORISTA ou OPERADOR vira OPERACIONAL
UPDATE public.employees
SET category = 'OPERACIONAL'
WHERE upper("function") LIKE '%MOTORISTA%'
   OR upper("function") LIKE '%OPERADOR%';

-- 3. Garantir que o restante esteja como GESTAO
UPDATE public.employees
SET category = 'GESTAO'
WHERE category IS NULL
   OR (upper("function") NOT LIKE '%MOTORISTA%' AND upper("function") NOT LIKE '%OPERADOR%');

-- Verificação rápida: confira os resultados
SELECT "function", category, count(*) FROM public.employees GROUP BY "function", category ORDER BY category, "function";
