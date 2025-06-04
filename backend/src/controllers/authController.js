// -----------------------------------------------------------------------------
// Arquivo Controlador de Autenticação (backend/src/controllers/authController.js) - ATUALIZADO
// -----------------------------------------------------------------------------
// Lida com registro e login, incluindo os novos campos 'role' e 'associated_patient_id'.
// Usa next(error) para erros inesperados.
// -----------------------------------------------------------------------------

const bcrypt = require('bcrypt');
const pool = require('../models/db.js');
const jwt = require('jsonwebtoken');
const dbConfig = require('../config/db.config.js');
const { validationResult } = require('express-validator');

// Função auxiliar para formatar erros de validação
const formatValidationErrors = (errors) => {
    return { errors: errors.array().map(err => ({ msg: err.msg, param: err.param || err.path })) };
};

exports.registerUser = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn('Falha no registro devido a erros de validação:', errors.array());
        return res.status(400).json(formatValidationErrors(errors));
    }

    try {
        // Adiciona role e associated_patient_id ao desestruturar o corpo da requisição
        const {
            username,
            password,
            fullName,
            subscriptionTier = 'basic', // Valor padrão se não fornecido
            maxPatients = 10,         // Valor padrão se não fornecido
            role = 'terapeuta',       // Valor padrão 'terapeuta' se não fornecido
            associated_patient_id = null // Valor padrão null se não fornecido
        } = req.body;

        console.log('Tentativa de Registro Recebida (após validação):', { username, fullName, subscriptionTier, maxPatients, role, associated_patient_id });

        // Validação adicional: se o papel for 'pai', associated_patient_id não deve ser null
        // No entanto, a lógica de quem pode criar quem e validar esse ID de paciente
        // pode ser mais complexa e ficar para um endpoint específico de "criar usuário pai".
        // Por agora, apenas garantimos que se 'pai' for o papel, o ID é armazenado.
        if (role === 'pai' && !associated_patient_id) {
            // Poderíamos retornar um erro aqui, mas por enquanto vamos permitir,
            // assumindo que a lógica de atribuição será tratada em outro lugar ou
            // que um terapeuta criaria o usuário pai já com o ID do paciente.
            console.warn(`Usuário sendo registrado como 'pai' sem 'associated_patient_id': ${username}`);
        }
        if (role !== 'pai' && associated_patient_id) {
            console.warn(`Usuário sendo registrado como '${role}' com 'associated_patient_id' (${associated_patient_id}) que será ignorado ou definido como null para este papel: ${username}`);
            // Para garantir consistência, se não for 'pai', associated_patient_id deve ser null.
            // associated_patient_id = null; // Descomente se quiser forçar null para não-pais
        }


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
          INSERT INTO users (username, password_hash, full_name, subscription_tier, max_patients, role, associated_patient_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, username, full_name, subscription_tier, max_patients, role, associated_patient_id, created_at
        `;
        // Inclui role e associated_patient_id nos valores
        const values = [username, hashedPassword, fullName, subscriptionTier, maxPatients, role, (role === 'pai' ? associated_patient_id : null)];
        const newUserResult = await pool.query(insertUserQuery, values);
        const newUser = newUserResult.rows[0];

        console.log(`Usuário ${newUser.username} (ID: ${newUser.id}, Role: ${newUser.role}) registrado com sucesso.`);

        res.status(201).json({
            message: `Usuário ${newUser.username} registrado com sucesso!`,
            user: newUser // Retorna o usuário completo, incluindo os novos campos
        });

    } catch (error) {
        console.error('Erro inesperado no registro:', error);
        if (error.code === '23505') { // Erro de violação de unicidade (username)
             return res.status(409).json({ errors: [{ msg: 'Nome de usuário já está em uso (conflito DB).', param: 'username' }] });
        }
        if (error.code === '23503' && error.constraint === 'users_associated_patient_id_fkey') { // Erro de chave estrangeira
            console.warn(`Falha ao registrar usuário '${username}' devido a associated_patient_id inválido: ${associated_patient_id}`);
            return res.status(400).json({ errors: [{ msg: 'ID do paciente associado inválido.', param: 'associated_patient_id' }] });
        }
        next(error);
    }
};

exports.loginUser = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn('Falha no login devido a erros de validação:', errors.array());
        return res.status(400).json(formatValidationErrors(errors));
    }

    try {
        const { username, password } = req.body;
        console.log('Tentativa de Login Recebida (após validação):', { username });

        // Busca os novos campos 'role' e 'associated_patient_id'
        const findUserQuery = 'SELECT id, username, password_hash, full_name, subscription_tier, max_patients, role, associated_patient_id FROM users WHERE username = $1';
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

        console.log(`Login bem-sucedido para usuário ${user.username} (ID: ${user.id}, Role: ${user.role}). Gerando token JWT...`);

        // Inclui role e associated_patient_id no payload do JWT
        const payload = {
            userId: user.id,
            username: user.username,
            tier: user.subscription_tier,
            max_patients: user.max_patients,
            role: user.role, // Novo campo no payload
            associated_patient_id: user.associated_patient_id // Novo campo no payload
        };
        const token = jwt.sign(payload, dbConfig.JWT_SECRET, { expiresIn: '1h' }); // O tempo de expiração pode ser ajustado
        console.log(`Token gerado para ${user.username}`);

        // Remove o hash da senha antes de enviar os dados do usuário
        delete user.password_hash;

        // Retorna os dados do usuário, incluindo role e associated_patient_id
        res.status(200).json({
            message: `Login bem-sucedido para ${user.username}!`,
            token: token,
            user: user // Usuário completo, incluindo os novos campos
        });

    } catch (error) {
        console.error('Erro inesperado no login:', error);
        next(error);
    }
};
