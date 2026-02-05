-- Script de Migração para Multitenancy
-- Este script deve ser executado APÓS o backend criar as colunas vereadorId
-- Execute este script no banco de dados PostgreSQL

-- =====================================================
-- PASSO 0: Adicionar colunas vereadorId nas tabelas que não têm
-- (Execute apenas se as colunas não existirem)
-- =====================================================

-- Adiciona vereadorId em law_projects se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'law_projects' AND column_name = 'vereadorId'
    ) THEN
        ALTER TABLE law_projects ADD COLUMN "vereadorId" uuid;
        CREATE INDEX IF NOT EXISTS "IDX_law_projects_vereadorId" ON law_projects("vereadorId");
        ALTER TABLE law_projects ADD CONSTRAINT "FK_law_projects_vereador"
            FOREIGN KEY ("vereadorId") REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Coluna vereadorId adicionada em law_projects';
    ELSE
        RAISE NOTICE 'Coluna vereadorId já existe em law_projects';
    END IF;
END $$;

-- Adiciona vereadorId em amendments se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'amendments' AND column_name = 'vereadorId'
    ) THEN
        ALTER TABLE amendments ADD COLUMN "vereadorId" uuid;
        CREATE INDEX IF NOT EXISTS "IDX_amendments_vereadorId" ON amendments("vereadorId");
        ALTER TABLE amendments ADD CONSTRAINT "FK_amendments_vereador"
            FOREIGN KEY ("vereadorId") REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Coluna vereadorId adicionada em amendments';
    ELSE
        RAISE NOTICE 'Coluna vereadorId já existe em amendments';
    END IF;
END $$;

-- =====================================================
-- PASSO 1: Identificar os vereadores existentes
-- =====================================================

-- Lista todos os usuários com role 'vereador'
SELECT id, name, email, role FROM users WHERE role = 'vereador';

-- =====================================================
-- PASSO 2: Atualizar vereadorId dos próprios vereadores
-- (vereadores apontam para si mesmos)
-- =====================================================

UPDATE users
SET "vereadorId" = id
WHERE role = 'vereador' AND "vereadorId" IS NULL;

-- =====================================================
-- PASSO 3: Vincular dados existentes a um vereador específico
-- IMPORTANTE: Substitua 'SEU_VEREADOR_ID' pelo UUID do vereador
-- =====================================================

-- Para descobrir o ID do vereador, execute:
-- SELECT id, name FROM users WHERE role = 'vereador';

-- Depois, substitua 'SEU_VEREADOR_ID' abaixo pelo ID correto

-- Exemplo: Se o ID do vereador for 'abc123-456-789', use:
-- UPDATE leaders SET "vereadorId" = 'abc123-456-789' WHERE "vereadorId" IS NULL;

-- =====================================================
-- OPÇÃO A: Vincular TODOS os dados existentes a UM vereador
-- (Use se você tem apenas um vereador no sistema)
-- =====================================================

-- Descomente e execute as linhas abaixo substituindo o ID:

/*
-- Substitua 'SEU_VEREADOR_ID' pelo UUID do vereador
DO $$
DECLARE
    v_vereador_id UUID;
BEGIN
    -- Pega o primeiro vereador encontrado (ajuste conforme necessário)
    SELECT id INTO v_vereador_id FROM users WHERE role = 'vereador' LIMIT 1;

    IF v_vereador_id IS NOT NULL THEN
        -- Atualiza lideranças
        UPDATE leaders SET "vereadorId" = v_vereador_id WHERE "vereadorId" IS NULL;
        RAISE NOTICE 'Leaders atualizados: %', (SELECT COUNT(*) FROM leaders WHERE "vereadorId" = v_vereador_id);

        -- Atualiza eleitores
        UPDATE voters SET "vereadorId" = v_vereador_id WHERE "vereadorId" IS NULL;
        RAISE NOTICE 'Voters atualizados: %', (SELECT COUNT(*) FROM voters WHERE "vereadorId" = v_vereador_id);

        -- Atualiza visitas
        UPDATE visits SET "vereadorId" = v_vereador_id WHERE "vereadorId" IS NULL;
        RAISE NOTICE 'Visits atualizados: %', (SELECT COUNT(*) FROM visits WHERE "vereadorId" = v_vereador_id);

        -- Atualiza atendimentos
        UPDATE help_records SET "vereadorId" = v_vereador_id WHERE "vereadorId" IS NULL;
        RAISE NOTICE 'Help Records atualizados: %', (SELECT COUNT(*) FROM help_records WHERE "vereadorId" = v_vereador_id);

        -- Atualiza compromissos
        UPDATE appointments SET "vereadorId" = v_vereador_id WHERE "vereadorId" IS NULL;
        RAISE NOTICE 'Appointments atualizados: %', (SELECT COUNT(*) FROM appointments WHERE "vereadorId" = v_vereador_id);

        -- Atualiza projetos de lei
        UPDATE law_projects SET "vereadorId" = v_vereador_id WHERE "vereadorId" IS NULL;
        RAISE NOTICE 'Law Projects atualizados: %', (SELECT COUNT(*) FROM law_projects WHERE "vereadorId" = v_vereador_id);

        -- Atualiza emendas
        UPDATE amendments SET "vereadorId" = v_vereador_id WHERE "vereadorId" IS NULL;
        RAISE NOTICE 'Amendments atualizados: %', (SELECT COUNT(*) FROM amendments WHERE "vereadorId" = v_vereador_id);

        -- Atualiza assessores (usuários que não são vereadores nem admin)
        UPDATE users SET "vereadorId" = v_vereador_id
        WHERE role IN ('assessor', 'lideranca') AND "vereadorId" IS NULL;
        RAISE NOTICE 'Users (assessores) atualizados';

        RAISE NOTICE 'Migração concluída com sucesso!';
    ELSE
        RAISE EXCEPTION 'Nenhum vereador encontrado no sistema!';
    END IF;
END $$;
*/

-- =====================================================
-- OPÇÃO B: Vincular manualmente com ID específico
-- =====================================================

-- Descomente e ajuste conforme necessário:

/*
-- Substitua pelo UUID do vereador desejado
UPDATE leaders SET "vereadorId" = 'COLE_AQUI_O_UUID_DO_VEREADOR' WHERE "vereadorId" IS NULL;
UPDATE voters SET "vereadorId" = 'COLE_AQUI_O_UUID_DO_VEREADOR' WHERE "vereadorId" IS NULL;
UPDATE visits SET "vereadorId" = 'COLE_AQUI_O_UUID_DO_VEREADOR' WHERE "vereadorId" IS NULL;
UPDATE help_records SET "vereadorId" = 'COLE_AQUI_O_UUID_DO_VEREADOR' WHERE "vereadorId" IS NULL;
UPDATE appointments SET "vereadorId" = 'COLE_AQUI_O_UUID_DO_VEREADOR' WHERE "vereadorId" IS NULL;
UPDATE law_projects SET "vereadorId" = 'COLE_AQUI_O_UUID_DO_VEREADOR' WHERE "vereadorId" IS NULL;
UPDATE amendments SET "vereadorId" = 'COLE_AQUI_O_UUID_DO_VEREADOR' WHERE "vereadorId" IS NULL;
UPDATE users SET "vereadorId" = 'COLE_AQUI_O_UUID_DO_VEREADOR' WHERE role IN ('assessor', 'lideranca') AND "vereadorId" IS NULL;
*/

-- =====================================================
-- PASSO 4: Verificar a migração
-- =====================================================

-- Verifica registros ainda sem vereadorId
SELECT 'leaders' as tabela, COUNT(*) as sem_vereador FROM leaders WHERE "vereadorId" IS NULL
UNION ALL
SELECT 'voters', COUNT(*) FROM voters WHERE "vereadorId" IS NULL
UNION ALL
SELECT 'visits', COUNT(*) FROM visits WHERE "vereadorId" IS NULL
UNION ALL
SELECT 'help_records', COUNT(*) FROM help_records WHERE "vereadorId" IS NULL
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments WHERE "vereadorId" IS NULL
UNION ALL
SELECT 'law_projects', COUNT(*) FROM law_projects WHERE "vereadorId" IS NULL
UNION ALL
SELECT 'amendments', COUNT(*) FROM amendments WHERE "vereadorId" IS NULL
UNION ALL
SELECT 'users (assessores)', COUNT(*) FROM users WHERE role IN ('assessor', 'lideranca') AND "vereadorId" IS NULL;

-- =====================================================
-- PASSO 5: (OPCIONAL) Tornar vereadorId NOT NULL após migração
-- CUIDADO: Só execute após confirmar que todos os registros têm vereadorId
-- =====================================================

/*
ALTER TABLE leaders ALTER COLUMN "vereadorId" SET NOT NULL;
ALTER TABLE voters ALTER COLUMN "vereadorId" SET NOT NULL;
ALTER TABLE visits ALTER COLUMN "vereadorId" SET NOT NULL;
ALTER TABLE help_records ALTER COLUMN "vereadorId" SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN "vereadorId" SET NOT NULL;
ALTER TABLE law_projects ALTER COLUMN "vereadorId" SET NOT NULL;
ALTER TABLE amendments ALTER COLUMN "vereadorId" SET NOT NULL;
*/
