// -----------------------------------------------------------------------------
// Arquivo de Middleware de Autenticação (backend/src/middleware/authMiddleware.js)
// -----------------------------------------------------------------------------
// Contém funções de middleware para proteger rotas, verificando o JWT.
// -----------------------------------------------------------------------------

// 1. Importar dependências
// -----------------------------------------------------------------------------
const jwt = require('jsonwebtoken'); // Para verificar o token
const dbConfig = require('../config/db.config.js'); // Para pegar o segredo JWT

// 2. Middleware de Verificação de Token
// -----------------------------------------------------------------------------
/**
 * @description Middleware para verificar se um token JWT válido foi enviado
 * na requisição e anexar os dados do usuário decodificado a req.user.
 * @param {object} req - Objeto da requisição.
 * @param {object} res - Objeto da resposta.
 * @param {function} next - Função para chamar o próximo middleware ou a rota final.
 */
const verifyToken = (req, res, next) => {
  // Pega o token do cabeçalho Authorization. Formato esperado: "Bearer TOKEN_JWT"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extrai apenas o token

  // 1. Verifica se o token existe
  if (!token) {
    console.warn('Tentativa de acesso negada: Token não fornecido.');
    // 401 Unauthorized - indica que a autenticação é necessária
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  // 2. Verifica a validade do token
  try {
    // Tenta verificar o token usando o segredo.
    // Se for inválido ou expirado, jwt.verify lançará um erro.
    const decodedPayload = jwt.verify(token, dbConfig.JWT_SECRET);

    // 3. Anexa os dados do usuário à requisição
    // Se o token for válido, 'decodedPayload' conterá os dados que colocamos
    // ao assinar (userId, username, tier). Anexamos isso a req.user.
    req.user = decodedPayload;
    console.log('Token verificado com sucesso para:', req.user.username); // Log útil para depuração

    // 4. Chama a próxima função na cadeia (outro middleware ou a rota final)
    next();

  } catch (error) {
    console.warn('Tentativa de acesso falhou: Token inválido ou expirado.', error.message);
    // 403 Forbidden - indica que o servidor entendeu a requisição,
    // mas se recusa a autorizá-la (token inválido/expirado).
    if (error instanceof jwt.TokenExpiredError) {
        return res.status(403).json({ error: 'Token expirado. Faça login novamente.' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
        return res.status(403).json({ error: 'Token inválido.' });
    }
    // Outro erro inesperado durante a verificação
    return res.status(403).json({ error: 'Falha na autenticação do token.' });
  }
};

// 3. Exportar o middleware
// -----------------------------------------------------------------------------
module.exports = {
  verifyToken
  // Poderíamos adicionar outros middlewares aqui no futuro (ex: verificar permissões de admin)
};

// -----------------------------------------------------------------------------
// Fim do arquivo authMiddleware.js
// -----------------------------------------------------------------------------
