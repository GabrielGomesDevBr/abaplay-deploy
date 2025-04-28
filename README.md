# AbaPlay Fullstack

Este é o projeto full-stack para a aplicação AbaPlay.

## Estrutura do Projeto

```
.
├── backend/          # Código do servidor Node.js (API)
│   ├── src/
│   │   ├── config/     # Arquivos de configuração
│   │   ├── controllers/ # Lógica das requisições
│   │   ├── middleware/ # Funções intermediárias
│   │   ├── models/     # Definição dos dados (PostgreSQL)
│   │   ├── routes/     # Definição das rotas da API
│   │   ├── services/   # Lógica de negócio
│   │   └── server.js   # Ponto de entrada do servidor
│   ├── node_modules/   # Dependências (gerenciado pelo npm)
│   └── package.json    # Metadados e dependências do backend
├── frontend/         # Código da interface do usuário
│   ├── data/
│   │   └── programs.json # Dados estáticos dos programas
│   ├── js/
│   │   └── script.js   # JavaScript do frontend
│   └── index.html      # Estrutura HTML principal
├── .gitignore        # Arquivos/pastas ignorados pelo Git
└── README.md         # Este arquivo
```

## Como Iniciar

1.  **Backend:**
    *   Navegue até a pasta `backend`: `cd backend`
    *   Instale as dependências: `npm install`
    *   Inicie o servidor de desenvolvimento: `npm run dev` (requer nodemon) ou `npm start`

2.  **Frontend:**
    *   Abra o arquivo `frontend/index.html` no seu navegador.

## Próximos Passos

*   Implementar a lógica da API no backend.
*   Conectar o backend a um banco de dados PostgreSQL.
*   Desenvolver a interface do usuário no frontend para interagir com a API.
*   Refatorar o `frontend/js/script.js` para usar um framework (React, Vue, Svelte) ou organizar melhor o código vanilla JS.