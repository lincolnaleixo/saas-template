



- change the script so the first send to claude code (features) will use opus (se tiver disponivel, se não usar sonet) e o segundo (end flow) usar sonnet sempre
--model	Sets the model for the current session with an alias for the latest model (sonnet or opus) : claude --model or sonnet claude --model opus
- ver se seria melhor voltar em json a resposta, testar com o new-feature primeiro e depois ajustar para os outros (https://docs.anthropic.com/en/docs/claude-code/common-workflows)

- perguntar qual seria o melhor logger para frontend/jobs/backend (ou criar um)
- depois que escolher quais melhores loggers ou criar um , ajustar nos guidelines
- colocar no frontend e backend que tem que ter logs de debug bem detalhado para ajudar em possiveis bug fixes. tanto backend como no frontend

o script depois no final tem que rodar o git.ts
### 8. **Git Commit**
- Execute `./dev/git.ts` to:
  - Create intelligent branch name based on changes
  - Generate AI-powered commit message
  - Run pre-commit hooks (backup, migrations)
  - Push changes to remote repository


- criar e testar o new-feature
- criar e testar o bugfix (Bugfix talvez pensaria hard? Talvez até definir qual modelo usar dependendo?)
- criar e testar o improvement feature
- criar e testar o new job

- Ajustar os scripts no scripts folder


Para o claude code:

- Criar o template de CSS, pedir para ser igual ao shadcn ou outro elements, pegar um printscript
- pedir para criar os arquivos e folders de backend baseado no guidelines
- pedir para criar os arquivos e folders de worker baseado no guidelines
- pedir para criar os arquivos e folders de frontend baseado no guidelines
- Implementar login com google
- Criar 3 jobs baseado no worker

Para mim
- Testar dev
- Testar prod e deixar rodando em um server
- Ver o codigo que sai, se tem algo errado fora do acertado no guidelines
- Testar acessar openapi
- Testar mudar algo dev e depois testar em prod para ver se o backup do eschma funciona blz
- testar stats.sh