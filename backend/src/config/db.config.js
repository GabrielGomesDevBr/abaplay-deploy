// -----------------------------------------------------------------------------
// Arquivo de Configuração (backend/src/config/db.config.js) - ATUALIZADO
// -----------------------------------------------------------------------------
// Lê as configurações do banco de dados e o segredo JWT das variáveis de
// ambiente (carregadas pelo dotenv a partir do arquivo .env).
// Fornece valores padrão para facilitar o desenvolvimento local.
// -----------------------------------------------------------------------------

// Carrega as variáveis de ambiente do arquivo .env para process.env
// Fazemos isso aqui também como uma segurança extra, embora já seja carregado no server.js
require('dotenv').config();

module.exports = {
  // --- Configuração do Banco de Dados ---
  HOST: process.env.DB_HOST || "localhost", // Usa variável de ambiente ou 'localhost' como padrão
  PORT: process.env.DB_PORT || 5432,        // Usa variável de ambiente ou 5432 como padrão
  USER: process.env.DB_USER || "abaplay_user", // Usa variável de ambiente ou 'abaplay_user'
  PASSWORD: process.env.DB_PASSWORD,          // Usa variável de ambiente (SEM VALOR PADRÃO POR SEGURANÇA)
  DB: process.env.DB_NAME || "abaplay_db",     // Usa variável de ambiente ou 'abaplay_db'

  // Configurações do pool de conexões (mantidas)
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },

  // --- Configuração do JWT ---
  // IMPORTANTE: O segredo JWT AGORA VEM DA VARIÁVEL DE AMBIENTE!
  JWT_SECRET: process.env.JWT_SECRET // Usa variável de ambiente (SEM VALOR PADRÃO POR SEGURANÇA)
};

// -----------------------------------------------------------------------------
// Fim do arquivo db.config.js
// -----------------------------------------------------------------------------