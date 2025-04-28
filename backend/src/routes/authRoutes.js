// -----------------------------------------------------------------------------
// Arquivo de Rotas de Autenticação (backend/src/routes/authRoutes.js) - ATUALIZADO
// -----------------------------------------------------------------------------
// Define os endpoints da API relacionados à autenticação (registro, login).
// Adiciona validação de entrada para as rotas de registro e login.
// -----------------------------------------------------------------------------

// 1. Importar dependências
// -----------------------------------------------------------------------------
const express = require('express');
const authController = require('../controllers/authController');
const { body } = require('express-validator'); // Importa função de validação

// 2. Criar o roteador
// -----------------------------------------------------------------------------
const router = express.Router();

// 3. Definir as rotas e VALIDAÇÕES
// -----------------------------------------------------------------------------

// --- Rota de Registro (POST /api/auth/register) ---
router.post(
    '/register',
    [
        // Validações para registro (como antes)
        body('username', 'O nome de usuário é obrigatório').notEmpty().trim().escape(),
        body('password', 'A senha deve ter pelo menos 6 caracteres').isLength({ min: 6 }),
        body('fullName', 'O nome completo é obrigatório').notEmpty().trim().escape(),
    ],
    authController.registerUser
);

// --- Rota de Login (POST /api/auth/login) ---
// <<< NOVO: Adicionamos validação para login >>>
router.post(
    '/login',
    [
        // Regra 1: 'username' não pode estar vazio
        body('username', 'O nome de usuário é obrigatório').notEmpty().trim(),
        // Regra 2: 'password' não pode estar vazio
        body('password', 'A senha é obrigatória').notEmpty(),
        // Nota: Não usamos .escape() na senha aqui, pois precisamos do valor original para comparar o hash.
        // A comparação de hash com bcrypt já é segura contra injeção.
    ],
    authController.loginUser // O controller só será chamado se a validação passar
);

// 4. Exportar o roteador
// -----------------------------------------------------------------------------
module.exports = router;

// -----------------------------------------------------------------------------
// Fim do arquivo authRoutes.js
// -----------------------------------------------------------------------------
