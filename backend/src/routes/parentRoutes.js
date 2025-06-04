// -----------------------------------------------------------------------------
// Arquivo de Rotas para Pais (backend/src/routes/parentRoutes.js)
// -----------------------------------------------------------------------------
// Define os endpoints da API específicos para usuários com o papel 'pai'.
// -----------------------------------------------------------------------------

const express = require('express');
const parentController = require('../controllers/parentController'); // Será criado a seguir
const { verifyToken } = require('../middleware/authMiddleware');
// const { param } = require('express-validator'); // Descomente se precisar validar parâmetros

const router = express.Router();

// Middleware para verificar se o usuário é um 'pai'
const verifyParentRole = (req, res, next) => {
  if (req.user && req.user.role === 'pai') {
    // Verifica também se existe um ID de paciente associado, crucial para pais
    if (req.user.associated_patient_id) {
      next(); // Usuário é um pai com paciente associado, prossegue
    } else {
      console.warn(`Tentativa de acesso à rota de pais por usuário (ID: ${req.user.userId}, Role: ${req.user.role}) sem associated_patient_id.`);
      return res.status(403).json({ error: 'Acesso negado. Nenhuma criança associada a esta conta de pai.' });
    }
  } else {
    console.warn(`Tentativa de acesso à rota de pais por usuário não autorizado (ID: ${req.user.userId}, Role: ${req.user.role}).`);
    return res.status(403).json({ error: 'Acesso negado. Esta área é restrita a pais.' });
  }
};

// --- Rotas Protegidas para Pais ---

// Rota para buscar os dados do dashboard do paciente associado ao pai
// Ex: GET /api/parent/dashboard-data
router.get(
  '/dashboard-data',
  verifyToken,        // Primeiro verifica se o token é válido
  verifyParentRole,   // Depois verifica se o usuário é um 'pai' com paciente associado
  parentController.getPatientDataForParentDashboard // Função do controller a ser criada
);

// Outras rotas específicas para pais podem ser adicionadas aqui no futuro.
// Por exemplo, se os pais puderem enviar mensagens ou visualizar relatórios específicos.

module.exports = router;

// -----------------------------------------------------------------------------
// Fim do arquivo parentRoutes.js
// -----------------------------------------------------------------------------
