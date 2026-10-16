# Mudanças do Controle de Presença

## 2026-10-16
- **Login novo da Central** (`SGE.acesso.entrar` do sge-core) no lugar do `sso_client.js`. O sistema só abre com a sessão real de quem entrou; sem ela, vai para o login da Central. Erro de rede não deixa entrar.
- O banco é lido e gravado **com a sessão da pessoa** (uma conexão só, a mesma do login), e não mais como anônimo. Prepara o fechamento da leitura sem login das tabelas gps_mec (P-035).
- Nível pela régua única: Administrador → ADM, Gestor → GESTAO, Supervisor → SUPERVISOR (continua achando o supervisor pelo e-mail), os outros → VISAO.
- Saíram o login local (com "Criar conta") e o `sge-session-ping.js` (o radar da Central agora vem do sge-core).
