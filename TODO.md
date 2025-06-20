- talvez pegar o prompt antes e ajustar usando AI? um AI free tipo deepseek groq or cerberas

- ver se seria melhor voltar em json a resposta, testar com o new-feature primeiro e depois ajustar para os outros (https://docs.anthropic.com/en/docs/claude-code/common-workflows)


- criar e testar o new-feature
- criar e testar o bugfix (Bugfix talvez pensaria hard? Talvez até definir qual modelo usar dependendo?)
- criar e testar o improvement feature
- criar e testar o new job


ok, now look at my infra folder, i copied from another project but we probably need to make some adjusments, in the infra folder you would find configuratino for nginx and certbot for production, docker images, docker compose files and scripts for all the services and one specificy frontend for production. please read them all and adjust following the guidelines inside prompts folder. You can remove the files that are not pertinentes to our project guidelines and add more or adjust the ones existants


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