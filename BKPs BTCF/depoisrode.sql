BEGIN;

-- 1) adiciona a coluna somente se não existir (Postgres suporta IF NOT EXISTS)
ALTER TABLE public.saida
  ADD COLUMN IF NOT EXISTS taxajuros numeric(10,2) DEFAULT 0;

-- 2) garante que linhas existentes que possam ter NULL fiquem com 0
UPDATE public.saida
SET taxajuros = 0
WHERE taxajuros IS NULL;

-- 3) torna a coluna NOT NULL para evitar valores nulos (opcional, mas recomendado se sempre houver valor)
ALTER TABLE public.saida
  ALTER COLUMN taxajuros SET NOT NULL;

COMMIT;
