# PROMPT PARA CURSOR AGENT — KANBAN DE RECEPCAO
## Andy Na Regua — Tela operacional unificada

Leia este prompt inteiro antes de escrever qualquer codigo.
Leia cada arquivo mencionado antes de editar.
Faca edicoes cirurgicas — nao reescreva blocos fora do escopo.
Se qualquer ponto estiver ambiguo, PARE e pergunte.

---

## CONTEXTO

Projeto: chatbot barbearia em Node.js/Express, SQLite (better-sqlite3).
Painel: server-side rendered, HTML puro, sem framework frontend.
Arquivo principal: src/panel.mjs (~3742 linhas).

Leia antes de comecar:
- src/panel.mjs — entender shell(), receptionRouter, patterns de rota
- src/db.mjs — funcoes disponíveis
- src/config.mjs — array staff com barbeiros
- src/booking.mjs — logica de slots livres
- src/tools.mjs — funcao criarAgendamentoTool
