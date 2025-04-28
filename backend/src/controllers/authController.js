// -----------------------------------------------------------------------------
// Arquivo Controlador de Autenticação (backend/src/controllers/authController.js) - ATUALIZADO
// -----------------------------------------------------------------------------
// Lida com registro e login. Usa next(error) para erros inesperados.
// -----------------------------------------------------------------------------

const bcrypt = require('bcrypt');
const pool = require('../models/db.js');
const jwt = require('jsonwebtoken');
const dbConfig = require('../config/db.config.js');
const { validationResult } = require('express-validator');

// Função auxiliar para formatar erros de validação
const formatValidationErrors = (errors) => {
    return { errors: errors.array().map(err => ({ msg: err.msg, param: err.path })) };
};

exports.registerUser = async (req, res, next) => { // <<< Adiciona 'next' como parâmetro
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn('Falha no registro devido a erros de validação:', errors.array());
        return res.status(400).json(formatValidationErrors(errors));
    }

    try {
        const { username, password, fullName, subscriptionTier = 'basic', maxPatients = 10 } = req.body;
        console.log('Tentativa de Registro Recebida (após validação):', { username, fullName, subscriptionTier, maxPatients });

        const userExistsQuery = 'SELECT id FROM users WHERE username = $1';
        const userExistsResult = await pool.query(userExistsQuery, [username]);
        if (userExistsResult.rows.length > 0) {
            console.warn(`Tentativa de registro falhou: Username '${username}' já existe.`);
            return res.status(409).json({ errors: [{ msg: 'Nome de usuário já está em uso.', param: 'username' }] });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log(`Senha hasheada para ${username}`);

        const insertUserQuery = `
          INSERT INTO users (username, password_hash, full_name, subscription_tier, max_patients)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, username, full_name, subscription_tier, max_patients, created_at
        `;
        const values = [username, hashedPassword, fullName, subscriptionTier, maxPatients];
        const newUserResult = await pool.query(insertUserQuery, values);
        const newUser = newUserResult.rows[0];

        console.log(`Usuário ${newUser.username} (ID: ${newUser.id}) registrado com sucesso.`);

        res.status(201).json({
            message: `Usuário ${newUser.username} registrado com sucesso!`,
            user: newUser
        });

    } catch (error) {
        console.error('Erro inesperado no registro:', error);
        // <<< MUDANÇA AQUI: Passa o erro para o middleware centralizado >>>
        // Verifica se é um erro específico de conflito (usuário já existe) que pode ter escapado
        if (error.code === '23505') {
             return res.status(409).json({ errors: [{ msg: 'Nome de usuário já está em uso (conflito DB).', param: 'username' }] });
        }
        // Para todos os outros erros inesperados, chama next()
        next(error);
        // Linha antiga: res.status(500).json({ errors: [{ msg: 'Erro interno ao tentar registrar usuário.' }] });
    }
};

exports.loginUser = async (req, res, next) => { // <<< Adiciona 'next' como parâmetro
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn('Falha no login devido a erros de validação:', errors.array());
        return res.status(400).json(formatValidationErrors(errors));
    }

    try {
        const { username, password } = req.body;
        console.log('Tentativa de Login Recebida (após validação):', { username });

        const findUserQuery = 'SELECT id, username, password_hash, full_name, subscription_tier, max_patients FROM users WHERE username = $1';
        const userResult = await pool.query(findUserQuery, [username]);

        if (userResult.rows.length === 0) {
            console.warn(`Tentativa de login falhou: Usuário '${username}' não encontrado.`);
            return res.status(401).json({ errors: [{ msg: 'Credenciais inválidas.' }] });
        }

        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            console.warn(`Tentativa de login falhou: Senha incorreta para usuário '${username}'.`);
            return res.status(401).json({ errors: [{ msg: 'Credenciais inválidas.' }] });
        }

        console.log(`Login bem-sucedido para usuário ${user.username} (ID: ${user.id}). Gerando token JWT...`);

        const payload = {
            userId: user.id,
            username: user.username,
            tier: user.subscription_tier,
            max_patients: user.max_patients
        };
        const token = jwt.sign(payload, dbConfig.JWT_SECRET, { expiresIn: '1h' });
        console.log(`Token gerado para ${user.username}`);

        delete user.password_hash;
        res.status(200).json({
            message: `Login bem-sucedido para ${user.username}!`,
            token: token,
            user: user
        });

    } catch (error) {
        console.error('Erro inesperado no login:', error);
        // <<< MUDANÇA AQUI: Passa o erro para o middleware centralizado >>>
        next(error);
        // Linha antiga: res.status(500).json({ errors: [{ msg: 'Erro interno ao tentar fazer login.' }] });
    }
};
