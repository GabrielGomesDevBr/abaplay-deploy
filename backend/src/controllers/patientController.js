// -----------------------------------------------------------------------------
// Arquivo Controlador de Pacientes (backend/src/controllers/patientController.js) - ATUALIZADO
// -----------------------------------------------------------------------------
// Lida com CRUD de pacientes, programas, sessões e anotações.
// Usa next(error) para erros inesperados.
// -----------------------------------------------------------------------------

const pool = require('../models/db.js');
const { validationResult } = require('express-validator');

// Função auxiliar para formatar erros de validação
const formatValidationErrors = (errors) => {
    return { errors: errors.array().map(err => ({ msg: err.msg, param: err.param || err.path })) };
};

// Adiciona 'next' a todas as funções assíncronas que podem ter erros inesperados
exports.getAllPatients = async (req, res, next) => {
    const userId = req.user.userId;
    if (!userId) {
        return res.status(401).json({ errors: [{ msg: 'Usuário não autenticado.' }] });
    }
    console.log(`Buscando pacientes, programas e sessões para o usuário ID: ${userId}`);
    try {
        // ... (lógica de busca existente) ...
        const patientQuery = `
            SELECT id, name, dob, diagnosis, general_notes, created_at
            FROM patients
            WHERE user_id = $1
            ORDER BY name ASC
        `;
        const patientResult = await pool.query(patientQuery, [userId]);
        let patients = patientResult.rows;

        if (patients.length > 0) {
            const patientIds = patients.map(p => p.id);
            const programsQuery = `SELECT patient_id, program_id FROM patient_programs WHERE patient_id = ANY($1::int[])`;
            const programsResult = await pool.query(programsQuery, [patientIds]);
            const programsMap = {};
            programsResult.rows.forEach(row => {
                if (!programsMap[row.patient_id]) programsMap[row.patient_id] = [];
                programsMap[row.patient_id].push(row.program_id);
            });

            const sessionsQuery = `SELECT id, patient_id, program_id, session_date, score, is_baseline, notes, created_at FROM program_sessions WHERE patient_id = ANY($1::int[]) ORDER BY session_date ASC, created_at ASC`;
            const sessionsResult = await pool.query(sessionsQuery, [patientIds]);
            const sessionsMap = {};
            sessionsResult.rows.forEach(session => {
                session.score = parseFloat(session.score);
                if (!sessionsMap[session.patient_id]) sessionsMap[session.patient_id] = [];
                sessionsMap[session.patient_id].push(session);
            });

            patients = patients.map(patient => ({
                ...patient,
                assigned_program_ids: programsMap[patient.id] || [],
                sessionData: sessionsMap[patient.id] || []
            }));
        }
        console.log(`Retornando ${patients.length} pacientes para o usuário ID: ${userId}`);
        res.status(200).json({ patients: patients });

    } catch (error) {
        console.error(`Erro inesperado ao buscar dados completos para usuário ID ${userId}:`, error);
        // <<< MUDANÇA AQUI >>>
        next(error); // Passa para o handler centralizado
        // Linha antiga: res.status(500).json({ errors: [{ msg: 'Erro interno ao buscar dados dos pacientes.' }] });
    }
};

exports.createPatient = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn('Falha ao criar paciente devido a erros de validação:', errors.array());
        return res.status(400).json(formatValidationErrors(errors));
    }

    const userId = req.user.userId;
    const userMaxPatients = req.user.max_patients || (await getUserMaxPatients(userId));
    const { name, dob, diagnosis, notes } = req.body;
    console.log(`Recebida requisição para criar paciente '${name}' para usuário ID: ${userId}`);

    try {
        const countQuery = 'SELECT COUNT(*) AS patient_count FROM patients WHERE user_id = $1';
        const countResult = await pool.query(countQuery, [userId]);
        const currentPatientCount = parseInt(countResult.rows[0].patient_count, 10);

        if (currentPatientCount >= userMaxPatients) {
            console.warn(`Usuário ID ${userId} tentou exceder o limite de ${userMaxPatients} pacientes.`);
            return res.status(403).json({ errors: [{ msg: `Limite de ${userMaxPatients} pacientes atingido.` }] });
        }
        console.log(`Usuário ID ${userId} tem ${currentPatientCount}/${userMaxPatients} pacientes. Permitido criar.`);

        const insertQuery = `
            INSERT INTO patients (user_id, name, dob, diagnosis, general_notes, updated_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            RETURNING id, name, dob, diagnosis, general_notes, created_at
        `;
        const values = [userId, name, dob || null, diagnosis || null, notes || null];
        const result = await pool.query(insertQuery, values);
        const newPatient = { ...result.rows[0], assigned_program_ids: [], sessionData: [] };
        console.log(`Paciente '${newPatient.name}' (ID: ${newPatient.id}) criado com sucesso para usuário ID: ${userId}.`);

        res.status(201).json({
            message: `Paciente "${newPatient.name}" cadastrado com sucesso!`,
            patient: newPatient
        });
    } catch (error) {
        console.error(`Erro inesperado ao criar paciente para usuário ID ${userId}:`, error);
        // <<< MUDANÇA AQUI >>>
        next(error);
        // Linha antiga: res.status(500).json({ errors: [{ msg: 'Erro interno ao criar paciente.' }] });
    }
};

exports.getPatientById = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn('Falha ao buscar paciente devido a ID inválido:', errors.array());
        return res.status(400).json(formatValidationErrors(errors));
    }

    const userId = req.user.userId;
    const patientId = req.params.id;
    console.log(`Buscando detalhes do paciente ID: ${patientId} para usuário ID: ${userId}`);

    try {
        // ... (lógica de busca existente) ...
        const patientQuery = `SELECT id, name, dob, diagnosis, general_notes, created_at, updated_at FROM patients WHERE id = $1 AND user_id = $2`;
        const patientResult = await pool.query(patientQuery, [patientId, userId]);

        if (patientResult.rows.length === 0) {
            console.warn(`Paciente ID ${patientId} não encontrado ou não pertence ao usuário ID ${userId}.`);
            return res.status(404).json({ errors: [{ msg: 'Paciente não encontrado ou acesso negado.' }] });
        }
        const patient = patientResult.rows[0];

        const programsQuery = `SELECT program_id FROM patient_programs WHERE patient_id = $1`;
        const programsResult = await pool.query(programsQuery, [patientId]);
        patient.assigned_program_ids = programsResult.rows.map(row => row.program_id);

        const sessionsQuery = `SELECT id, patient_id, program_id, session_date, score, is_baseline, notes, created_at FROM program_sessions WHERE patient_id = $1 ORDER BY session_date ASC, created_at ASC`;
        const sessionsResult = await pool.query(sessionsQuery, [patientId]);
        patient.sessionData = sessionsResult.rows.map(session => ({ ...session, score: parseFloat(session.score) }));

        console.log(`Detalhes do paciente ID ${patientId} encontrados.`);
        res.status(200).json({ patient: patient });

    } catch (error) {
        console.error(`Erro inesperado ao buscar paciente ID ${patientId} para usuário ID ${userId}:`, error);
        // <<< MUDANÇA AQUI >>>
        next(error);
        // Linha antiga: res.status(500).json({ errors: [{ msg: 'Erro interno ao buscar detalhes do paciente.' }] });
    }
};

exports.updatePatient = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn('Falha ao atualizar paciente devido a erros de validação:', errors.array());
        return res.status(400).json(formatValidationErrors(errors));
    }

    const userId = req.user.userId;
    const patientId = req.params.id;
    const { name, dob, diagnosis, notes } = req.body;
    console.log(`Recebida requisição para atualizar paciente ID: ${patientId} para usuário ID: ${userId}`, req.body);

    try {
        // ... (lógica de atualização existente) ...
         const updateQuery = `
            UPDATE patients SET name = $1, dob = $2, diagnosis = $3, general_notes = $4, updated_at = CURRENT_TIMESTAMP
            WHERE id = $5 AND user_id = $6
            RETURNING id, name, dob, diagnosis, general_notes, created_at, updated_at
        `;
        const values = [name, dob || null, diagnosis || null, notes || null, patientId, userId];
        const result = await pool.query(updateQuery, values);

        if (result.rows.length === 0) {
            console.warn(`Tentativa de atualizar paciente ID ${patientId} falhou (não encontrado ou pertence a outro usuário - User ID: ${userId}).`);
            return res.status(404).json({ errors: [{ msg: 'Paciente não encontrado ou acesso negado.' }] });
        }

        const programsQuery = 'SELECT program_id FROM patient_programs WHERE patient_id = $1';
        const programsResult = await pool.query(programsQuery, [patientId]);
        const assigned_program_ids = programsResult.rows.map(row => row.program_id);

        const sessionsQuery = 'SELECT id, patient_id, program_id, session_date, score, is_baseline, notes, created_at FROM program_sessions WHERE patient_id = $1 ORDER BY session_date ASC, created_at ASC';
        const sessionsResult = await pool.query(sessionsQuery, [patientId]);
        const sessionData = sessionsResult.rows.map(session => ({ ...session, score: parseFloat(session.score) }));

        const updatedPatient = { ...result.rows[0], assigned_program_ids, sessionData };
        console.log(`Paciente '${updatedPatient.name}' (ID: ${updatedPatient.id}) atualizado com sucesso para usuário ID: ${userId}.`);

        res.status(200).json({
            message: `Paciente "${updatedPatient.name}" atualizado com sucesso!`,
            patient: updatedPatient
        });
    } catch (error) {
        console.error(`Erro inesperado ao atualizar paciente ID ${patientId} para usuário ID ${userId}:`, error);
        // <<< MUDANÇA AQUI >>>
        next(error);
        // Linha antiga: res.status(500).json({ errors: [{ msg: 'Erro interno ao atualizar paciente.' }] });
    }
};

exports.deletePatient = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn('Falha ao deletar paciente devido a ID inválido:', errors.array());
        return res.status(400).json(formatValidationErrors(errors));
    }

    const userId = req.user.userId;
    const patientId = req.params.id;
    console.log(`Recebida requisição para deletar paciente ID: ${patientId} para usuário ID: ${userId}`);
    try {
        const deleteQuery = `DELETE FROM patients WHERE id = $1 AND user_id = $2`;
        const values = [patientId, userId];
        const result = await pool.query(deleteQuery, values);

        if (result.rowCount === 0) {
            console.warn(`Tentativa de deletar paciente ID ${patientId} falhou (não encontrado ou pertence a outro usuário - User ID: ${userId}).`);
            return res.status(404).json({ errors: [{ msg: 'Paciente não encontrado ou acesso negado.' }] });
        }
        console.log(`Paciente ID ${patientId} deletado com sucesso para usuário ID: ${userId}.`);
        res.status(204).send();

    } catch (error) {
        console.error(`Erro inesperado ao deletar paciente ID ${patientId} para usuário ID ${userId}:`, error);
        // <<< MUDANÇA AQUI >>>
        next(error);
        // Linha antiga: res.status(500).json({ errors: [{ msg: 'Erro interno ao deletar paciente.' }] });
    }
};

// --- Funções de Gerenciamento de Programas ---
exports.assignProgramToPatient = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn('Falha ao atribuir programa devido a erros de validação:', errors.array());
        return res.status(400).json(formatValidationErrors(errors));
    }

    const userId = req.user.userId;
    const patientId = req.params.patientId;
    const { programId } = req.body;
    console.log(`Atribuindo programa '${programId}' ao paciente ID ${patientId} (Usuário ID: ${userId})`);
    try {
        // ... (lógica existente) ...
        const checkPatientQuery = 'SELECT id FROM patients WHERE id = $1 AND user_id = $2';
        const checkResult = await pool.query(checkPatientQuery, [patientId, userId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ errors: [{ msg: 'Paciente não encontrado ou acesso negado.' }] });
        }
        const insertQuery = `INSERT INTO patient_programs (patient_id, program_id) VALUES ($1, $2) ON CONFLICT (patient_id, program_id) DO NOTHING RETURNING assigned_at `;
        const result = await pool.query(insertQuery, [patientId, programId]);
        if (result.rowCount > 0) {
             res.status(201).json({ message: 'Programa atribuído com sucesso.', assigned_at: result.rows[0].assigned_at });
        } else {
             res.status(200).json({ message: 'Programa já estava atribuído.' });
        }
    } catch (error) {
        console.error(`Erro inesperado ao atribuir programa '${programId}' ao paciente ID ${patientId}:`, error);
        // <<< MUDANÇA AQUI >>>
        if (error.code === '23503') { // Tratar erro específico de FK se necessário
             return res.status(404).json({ errors: [{ msg: 'Erro ao processar a atribuição (verifique os IDs).' }] });
         }
        next(error);
        // Linha antiga: res.status(500).json({ errors: [{ msg: 'Erro interno ao atribuir programa.' }] });
    }
};

exports.removeProgramFromPatient = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn('Falha ao remover programa devido a erros de validação:', errors.array());
        return res.status(400).json(formatValidationErrors(errors));
    }

    const userId = req.user.userId;
    const patientId = req.params.patientId;
    const programId = req.params.programId;
    console.log(`Removendo programa '${programId}' do paciente ID ${patientId} (Usuário ID: ${userId})`);
    try {
        // ... (lógica existente) ...
        const checkPatientQuery = 'SELECT id FROM patients WHERE id = $1 AND user_id = $2';
        const checkResult = await pool.query(checkPatientQuery, [patientId, userId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ errors: [{ msg: 'Paciente não encontrado ou acesso negado.' }] });
        }
        const deleteQuery = `DELETE FROM patient_programs WHERE patient_id = $1 AND program_id = $2`;
        const result = await pool.query(deleteQuery, [patientId, programId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ errors: [{ msg: 'Associação programa-paciente não encontrada.' }] });
        }
        console.log(`Programa '${programId}' removido com sucesso do paciente ID ${patientId}.`);
        res.status(204).send();
    } catch (error) {
        console.error(`Erro inesperado ao remover programa '${programId}' do paciente ID ${patientId}:`, error);
        // <<< MUDANÇA AQUI >>>
        next(error);
        // Linha antiga: res.status(500).json({ errors: [{ msg: 'Erro interno ao remover programa.' }] });
    }
};

// --- Funções de Gerenciamento de Sessões ---
exports.createSession = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn('Falha ao registrar sessão devido a erros de validação:', errors.array());
        return res.status(400).json(formatValidationErrors(errors));
    }

    const userId = req.user.userId;
    const patientId = req.params.patientId;
    const { programId, date, score, notes, isBaseline } = req.body;
    console.log(`Registrando sessão para Paciente ID: ${patientId}, Programa: ${programId} (Usuário ID: ${userId})`);
    try {
        // ... (lógica existente) ...
        const checkPatientQuery = 'SELECT id FROM patients WHERE id = $1 AND user_id = $2';
        const checkResult = await pool.query(checkPatientQuery, [patientId, userId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ errors: [{ msg: 'Paciente não encontrado ou acesso negado.' }] });
        }
        const checkProgramQuery = 'SELECT 1 FROM patient_programs WHERE patient_id = $1 AND program_id = $2';
        const checkProgramResult = await pool.query(checkProgramQuery, [patientId, programId]);
        if (checkProgramResult.rows.length === 0) {
             return res.status(400).json({ errors: [{ msg: 'Programa não atribuído a este paciente.' }] });
        }
        const insertSessionQuery = `
            INSERT INTO program_sessions (patient_id, program_id, session_date, score, is_baseline, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, patient_id, program_id, session_date, score, is_baseline, notes, created_at
        `;
        const values = [patientId, programId, date, score, isBaseline || false, notes || null];
        const result = await pool.query(insertSessionQuery, values);
        const newSession = { ...result.rows[0], score: parseFloat(result.rows[0].score) };
        console.log(`Sessão (ID: ${newSession.id}) registrada com sucesso para Paciente ID: ${patientId}, Programa: ${programId}.`);
        res.status(201).json(newSession);
    } catch (error) {
        console.error(`Erro inesperado ao registrar sessão para Paciente ID ${patientId}, Programa ${programId}:`, error);
         // <<< MUDANÇA AQUI >>>
         if (error.code === '23503') { // Tratar erro específico de FK se necessário
             return res.status(404).json({ errors: [{ msg: 'Erro ao processar a sessão (verifique os IDs).' }] });
         }
        next(error);
        // Linha antiga: res.status(500).json({ errors: [{ msg: 'Erro interno ao registrar sessão.' }] });
    }
};

// --- Função de Gerenciamento de Anotações ---
exports.updatePatientNotes = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Este erro não deveria mais acontecer para 'generalNotes' após removermos a validação do corpo
        console.warn('Falha ao atualizar notas devido a erros de validação (inesperado):', errors.array());
        return res.status(400).json(formatValidationErrors(errors));
    }

    const userId = req.user.userId;
    const patientId = req.params.patientId;
    const { generalNotes } = req.body; // Pega o valor (pode ser string, "", ou null)
    console.log(`Atualizando anotações gerais para paciente ID ${patientId} (Usuário ID: ${userId})`);
    try {
        // ... (lógica existente) ...
        const updateNotesQuery = `
            UPDATE patients SET general_notes = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND user_id = $3
            RETURNING id, general_notes, updated_at
        `;
        // Passa generalNotes diretamente (pode ser null ou "")
        const values = [generalNotes, patientId, userId];
        const result = await pool.query(updateNotesQuery, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ errors: [{ msg: 'Paciente não encontrado ou acesso negado.' }] });
        }
        console.log(`Anotações gerais do paciente ID ${patientId} atualizadas com sucesso.`);
        res.status(200).json({
            message: 'Anotações atualizadas com sucesso!',
            patientId: result.rows[0].id,
            general_notes: result.rows[0].general_notes,
            updated_at: result.rows[0].updated_at
        });
    } catch (error) {
        console.error(`Erro inesperado ao atualizar anotações do paciente ID ${patientId}:`, error);
        // <<< MUDANÇA AQUI >>>
        next(error);
        // Linha antiga: res.status(500).json({ errors: [{ msg: 'Erro interno ao salvar anotações.' }] });
    }
};

// Função auxiliar (sem alterações)
async function getUserMaxPatients(userId) {
    try {
        const query = 'SELECT max_patients FROM users WHERE id = $1';
        const result = await pool.query(query, [userId]);
        return result.rows.length > 0 ? result.rows[0].max_patients : 0;
    } catch (error) {
        // Erro ao buscar max_patients não deve parar a operação principal geralmente,
        // mas logar é importante. Não chamamos next(error) aqui para não quebrar
        // a lógica principal se apenas essa busca falhar.
        console.error("Erro ao buscar max_patients do usuário (não crítico):", error);
        return 0; // Retorna 0 para segurança
    }
}

// -----------------------------------------------------------------------------
// Fim do arquivo patientController.js
// -----------------------------------------------------------------------------
