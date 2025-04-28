// -----------------------------------------------------------------------------
// Arquivo de Conexão com o Banco de Dados (backend/src/models/db.js) - ATUALIZADO PARA RENDER
// -----------------------------------------------------------------------------
// Este módulo configura e exporta um pool de conexões PostgreSQL.
// PRIORIZA o uso da variável de ambiente DATABASE_URL (fornecida pelo Render).
// Se DATABASE_URL não estiver definida, usa as variáveis separadas de db.config.js (para ambiente local).
// -----------------------------------------------------------------------------

// 1. Importar o cliente PostgreSQL e a configuração (para fallback)
// -----------------------------------------------------------------------------
const { Pool } = require('pg');
const dbConfig = require('../config/db.config.js'); // Usado apenas como fallback

// 2. Determinar a Configuração do Pool
// -----------------------------------------------------------------------------
let poolConfig;
const isProduction = process.env.NODE_ENV === 'production';

if (process.env.DATABASE_URL) {
  // --- Usar DATABASE_URL (Ambiente Render/Produção) ---
  console.log("INFO: Conectando ao PostgreSQL via DATABASE_URL.");
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    // Configurações de SSL podem ser necessárias dependendo do provedor (Render geralmente gerencia isso)
    // Adicione se necessário, baseado na documentação do Render ou logs de erro específicos de SSL:
    // ssl: {
    //   rejectUnauthorized: false // Use com cautela, apenas se exigido pelo Render
    // }
    // Você pode adicionar configurações de pool aqui também, se desejar sobrescrever padrões
     max: dbConfig.pool.max || 5, // Pega do config ou usa um padrão
     idleTimeoutMillis: dbConfig.pool.idle || 10000,
     connectionTimeoutMillis: dbConfig.pool.acquire || 30000,
  };
} else {
  // --- Usar Variáveis Separadas (Ambiente Local/Desenvolvimento) ---
  console.log("INFO: Conectando ao PostgreSQL via variáveis de ambiente separadas (local?).");
  // Verifica se as variáveis essenciais estão presentes localmente
  if (!dbConfig.USER || !dbConfig.HOST || !dbConfig.DB || !dbConfig.PASSWORD || !dbConfig.PORT) {
      console.error("ERRO FATAL: Variáveis de ambiente do banco de dados (DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT) não definidas localmente!");
      // Em um cenário local, você pode querer lançar um erro ou sair
      // process.exit(1); // Descomente se quiser que a aplicação pare localmente se faltar config
  }
  poolConfig = {
    host: dbConfig.HOST,
    port: dbConfig.PORT,
    user: dbConfig.USER,
    password: dbConfig.PASSWORD, // Lida a partir de db.config.js -> .env local
    database: dbConfig.DB,
    // Configurações do pool (mantidas do db.config.js)
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  };
}

// 3. Criar o Pool de Conexões
// -----------------------------------------------------------------------------
const pool = new Pool(poolConfig);

// 4. Testar a Conexão e Lidar com Erros
// -----------------------------------------------------------------------------
pool.connect((err, client, release) => {
  if (err) {
    // Log mais detalhado do erro de conexão inicial
    console.error('ERRO INICIAL ao conectar ao banco de dados PostgreSQL:', err.message);
    console.error('Detalhes do erro:', err.stack);
    // Não necessariamente encerra a aplicação, mas loga o erro claramente.
    // A aplicação pode tentar reconectar mais tarde.
    return;
  }
  console.log('INFO: Conexão inicial com o banco de dados PostgreSQL estabelecida com sucesso!');
  // Libera o cliente de volta para o pool.
  release();
});

// Adiciona um listener para erros no pool que podem ocorrer *depois* da conexão inicial
pool.on('error', (err, client) => {
  console.error('ERRO INESPERADO no cliente ocioso do pool PostgreSQL:', err);
  // Você pode querer implementar lógica para remover/recriar o pool aqui em casos graves.
});


// 5. Exportar o Pool
// -----------------------------------------------------------------------------
module.exports = pool;

// -----------------------------------------------------------------------------
// Fim do arquivo db.js
// -----------------------------------------------------------------------------
