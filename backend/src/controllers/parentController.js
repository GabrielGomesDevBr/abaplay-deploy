// -----------------------------------------------------------------------------
// Arquivo Controlador para Pais (backend/src/controllers/parentController.js)
// -----------------------------------------------------------------------------
// Lida com as requisições específicas para usuários com o papel 'pai'.
// -----------------------------------------------------------------------------

const pool = require('../models/db.js');
// const { validationResult } = require('express-validator'); // Descomente se precisar de validação

// Função auxiliar para formatar erros (se necessário)
// const formatValidationErrors = (errors) => {
//     return { errors: errors.array().map(err => ({ msg: err.msg, param: err.param || err.path })) };
// };

/**
 * @description Busca dados consolidados do paciente associado ao pai logado.
 * Inclui detalhes do paciente, programas atribuídos e dados de todas as sessões.
 * @param {object} req - Objeto da requisição. Espera req.user.associated_patient_id.
 * @param {object} res - Objeto da resposta.
 * @param {function} next - Função para chamar o próximo middleware em caso de erro.
 */
exports.getPatientDataForParentDashboard = async (req, res, next) => {
    // O middleware verifyParentRole já garantiu que req.user.associated_patient_id existe.
    const patientId = req.user.associated_patient_id;
    const parentUserId = req.user.userId; // Para logging

    console.log(`Pai (Usuário ID: ${parentUserId}) solicitando dados do dashboard para Paciente ID: ${patientId}`);

    try {
        // 1. Buscar detalhes do paciente
        const patientQuery = `
            SELECT id, name, dob, diagnosis, general_notes, created_at
            FROM patients
            WHERE id = $1
        `;
        // Não precisamos verificar user_id aqui, pois o associated_patient_id no token do pai já faz esse vínculo.
        // A segurança é garantida pelo fato de que o associated_patient_id foi definido por um terapeuta.
        const patientResult = await pool.query(patientQuery, [patientId]);

        if (patientResult.rows.length === 0) {
            console.warn(`Paciente ID ${patientId} (associado ao Pai ID: ${parentUserId}) não encontrado no banco de dados.`);
            // Isso seria um estado inconsistente, pois o ID deveria ser válido.
            return res.status(404).json({ error: 'Paciente associado não encontrado.' });
        }
        const patientDetails = patientResult.rows[0];

        // 2. Buscar programas atribuídos ao paciente
        const programsQuery = `
            SELECT program_id
            FROM patient_programs
            WHERE patient_id = $1
        `;
        const programsResult = await pool.query(programsQuery, [patientId]);
        const assignedProgramIds = programsResult.rows.map(row => row.program_id);

        // 3. Buscar todos os dados de sessão para o paciente
        const sessionsQuery = `
            SELECT id, program_id, session_date, score, is_baseline, notes, created_at
            FROM program_sessions
            WHERE patient_id = $1
            ORDER BY program_id, session_date ASC, created_at ASC
        `;
        const sessionsResult = await pool.query(sessionsQuery, [patientId]);
        // Garante que 'score' seja numérico e 'is_baseline' booleano
        const sessionData = sessionsResult.rows.map(session => ({
            ...session,
            score: parseFloat(session.score),
            is_baseline: Boolean(session.is_baseline)
        }));

        // 4. Montar o objeto de resposta
        const dashboardData = {
            patient: patientDetails,
            assigned_program_ids: assignedProgramIds,
            sessionData: sessionData,
        };

        console.log(`Dados do dashboard para Paciente ID: ${patientId} preparados para Pai ID: ${parentUserId}.`);
        res.status(200).json(dashboardData);

    } catch (error) {
        console.error(`Erro inesperado ao buscar dados do dashboard para Paciente ID ${patientId} (Pai ID: ${parentUserId}):`, error);
        next(error); // Passa o erro para o middleware de tratamento de erros centralizado
    }
};

// Outras funções do controller para pais podem ser adicionadas aqui.
// Exemplo:
// exports.getSpecificReportForParent = async (req, res, next) => { ... }

// -----------------------------------------------------------------------------
// Fim do arquivo parentController.js
// -----------------------------------------------------------------------------
