// -----------------------------------------------------------------------------
// Arquivo de Conexão com o Banco de Dados (backend/src/models/db.js)
// -----------------------------------------------------------------------------
// Este módulo configura e exporta um pool de conexões PostgreSQL
// usando as configurações definidas em ../config/db.config.js.
// -----------------------------------------------------------------------------

// 1. Importar o cliente PostgreSQL e a configuração
// -----------------------------------------------------------------------------
const { Pool } = require('pg'); // Importa a classe Pool do pacote 'pg'
const dbConfig = require('../config/db.config.js'); // Importa as configurações do banco

// 2. Criar o Pool de Conexões
// -----------------------------------------------------------------------------
// Cria uma instância do Pool, passando as credenciais e configurações.
// O pool gerenciará múltiplas conexões para melhorar o desempenho.
const pool = new Pool({
  host: dbConfig.HOST,
  port: dbConfig.PORT,
  user: dbConfig.USER,
  password: dbConfig.PASSWORD,
  database: dbConfig.DB,
  // Configurações do pool (opcional, mas recomendado)
  max: dbConfig.pool.max, // Número máximo de clientes no pool
  idleTimeoutMillis: dbConfig.pool.idle, // Tempo que um cliente pode ficar ocioso
  connectionTimeoutMillis: dbConfig.pool.acquire, // Tempo para tentar conectar antes de erro
});

// 3. Testar a Conexão (Opcional, mas útil para depuração inicial)
// -----------------------------------------------------------------------------
// Tenta pegar uma conexão do pool para verificar se as credenciais estão corretas.
pool.connect((err, client, release) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados PostgreSQL:', err.stack);
    // Em um cenário real, você pode querer encerrar a aplicação aqui ou
    // implementar uma lógica de retentativa.
    return;
  }
  console.log('Conexão com o banco de dados PostgreSQL estabelecida com sucesso!');
  // Libera o cliente de volta para o pool, pois só queríamos testar.
  release();
});

// 4. Exportar o Pool
// -----------------------------------------------------------------------------
// Exportamos o pool para que outros módulos (controllers, services)
// possam usá-lo para executar queries no banco de dados.
module.exports = pool;

// -----------------------------------------------------------------------------
// Fim do arquivo db.js
// -----------------------------------------------------------------------------
