// -----------------------------------------------------------------------------
// Arquivo de Rotas de Pacientes (backend/src/routes/patientRoutes.js) - CORRIGIDO
// -----------------------------------------------------------------------------
// Garante que a validação específica para general_notes na rota PUT /:patientId/notes
// seja REMOVIDA para permitir a limpeza das notas, e que 'general_notes' seja
// usado consistentemente na validação principal de dados do paciente.
// -----------------------------------------------------------------------------

const express = require('express');
const patientController = require('../controllers/patientController');
const { verifyToken } = require('../middleware/authMiddleware');
const { body, param } = require('express-validator');

const router = express.Router();

// --- Middleware de Validação Comum para Pacientes ---
const validatePatientData = [
    body('name', 'O nome do paciente é obrigatório').notEmpty().trim().escape(),
    body('dob', 'Data de nascimento inválida').optional({ checkFalsy: true }).isISO8601().toDate(),
    body('diagnosis', 'Diagnóstico inválido').optional().trim().escape(),
    // MODIFICAÇÃO: Alterado 'notes' para 'general_notes' na validação
    body('general_notes', 'Anotações inválidas').optional({ checkFalsy: true }).trim().escape()
];

const validatePatientId = [
    param('id', 'ID do paciente inválido').isInt({ gt: 0 })
];

const validatePatientIdAndProgramId = [
    param('patientId', 'ID do paciente inválido').isInt({ gt: 0 }),
    param('programId', 'ID do programa inválido').notEmpty().trim().escape()
];

const validateSessionData = [
    param('patientId', 'ID do paciente inválido').isInt({ gt: 0 }),
    body('programId', 'ID do programa é obrigatório').notEmpty().trim().escape(),
    body('date', 'Data da sessão é obrigatória e deve ser válida').notEmpty().isISO8601().toDate(),
    body('score', 'Pontuação é obrigatória e deve ser um número entre 0 e 100').notEmpty().isFloat({ min: 0, max: 100 }),
    body('notes', 'Observações inválidas').optional({ checkFalsy: true }).trim().escape(),
    body('isBaseline', 'Valor inválido para linha de base').optional().isBoolean()
];

// Array para validar APENAS o ID do paciente na URL para a rota de notas.
const validatePatientIdForNotes = [
     param('patientId', 'ID do paciente inválido').isInt({ gt: 0 })
];


// --- Rotas Protegidas (Requerem Login/Token Válido) ---
router.get('/', verifyToken, patientController.getAllPatients);
router.post('/', verifyToken, validatePatientData, patientController.createPatient);
router.get('/:id', verifyToken, validatePatientId, patientController.getPatientById);
router.put('/:id', verifyToken, validatePatientId, validatePatientData, patientController.updatePatient);
router.delete('/:id', verifyToken, validatePatientId, patientController.deletePatient);

// --- Gerenciamento de Programas por Paciente ---
router.post(
    '/:patientId/programs',
    verifyToken,
    [
        param('patientId', 'ID do paciente inválido').isInt({ gt: 0 }),
        body('programId', 'ID do programa é obrigatório').notEmpty().trim().escape()
    ],
    patientController.assignProgramToPatient
);
router.delete(
    '/:patientId/programs/:programId',
    verifyToken,
    validatePatientIdAndProgramId,
    patientController.removeProgramFromPatient
);

// --- Gerenciamento de Sessões por Paciente ---
router.post(
    '/:patientId/sessions',
    verifyToken,
    validateSessionData,
    patientController.createSession
);

// --- Gerenciamento de Anotações Gerais por Paciente ---
router.put(
    '/:patientId/notes',
    verifyToken,
    validatePatientIdForNotes, // Valida apenas o ID do paciente na URL
    // Não há validação de 'generalNotes' no corpo aqui, permitindo que seja vazio ou nulo.
    patientController.updatePatientNotes
);

module.exports = router;

// -----------------------------------------------------------------------------
// Fim do arquivo patientRoutes.js
// -----------------------------------------------------------------------------
