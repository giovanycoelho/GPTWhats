# 🚀 Guia de Deploy e Distribuição - GPTWhats

## 📋 Configuração Inicial do Repositório GitHub

### 1. Criar Repositório
```bash
# No seu terminal, na pasta do projeto
git init
git remote add origin https://github.com/giovanycoelho/GPTWhats.git

# Configurar seu username no package.json (linha 129):
# "owner": "giovanycoelho",
```

### 2. Primeiro Commit
```bash
git add .
git commit -m "feat: initial GPTWhats release with Electron packaging"
git push -u origin main
```

### 3. Configurar GitHub Token (se necessário)
- Vá em GitHub Settings → Developer Settings → Personal Access Tokens
- Crie token com permissões: `repo`, `write:packages`
- **Não precisa adicionar nas Actions** (já configurado automaticamente)

## 🏗️ Sistema de Build e Releases

### Métodos de Release

#### **Método 1: Release Assistido (Recomendado)**
```bash
npm run release
```
- Interface interativa
- Permite editar release notes
- Controle total do processo

#### **Método 2: Quick Release**
```bash
npm run release:quick
```
- Release rápido
- Auto-incrementa versão patch (1.0.0 → 1.0.1)
- Ideal para hot-fixes

#### **Método 3: Manual**
```bash
# 1. Atualizar versão no package.json
# 2. Build
node build-electron.js

# 3. Commit e tag
git add .
git commit -m "chore: release v1.0.1"
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

## 🤖 GitHub Actions (Automático)

### O que acontece automaticamente:
1. **Trigger**: Push de tag `v*` (ex: `v1.0.0`)
2. **Build**: Windows runner instala dependências
3. **Compile**: Gera executável e instalador
4. **Release**: Publica automaticamente no GitHub
5. **Auto-Update**: Gera `latest.yml` para updates automáticos

### Arquivos gerados:
- `GPTWhats Setup 1.0.0.exe` - Instalador completo
- `latest.yml` - Arquivo para auto-updates
- Release notes automáticas

## 📦 Distribuição

### Para Usuários Finais:

1. **Download**: https://github.com/giovanycoelho/GPTWhats/releases
2. **Instalação**: 
   - Baixar `GPTWhats Setup X.X.X.exe`
   - Executar como administrador
   - Seguir wizard de instalação
3. **Updates**: Automáticos (notificação no app)

### Para Desenvolvedores:

1. **Clone** do repositório
2. **Development**: `npm run electron:dev`
3. **Build local**: `node build-electron.js`
4. **Release**: `npm run release`

## 🔄 Sistema de Auto-Updates

### Como funciona:
1. **Check automático** a cada 30 minutos
2. **Download em background** quando disponível
3. **Notificação** no header do app
4. **Instalação** no próximo restart (ou imediata)

### Configuração:
- ✅ **Já configurado** no `electron.js`
- ✅ **GitHub releases** como fonte
- ✅ **Preserva dados** entre updates
- ✅ **Rollback automático** se falhar

### Testando updates:
```bash
# 1. Release versão 1.0.0
npm run release:quick

# 2. Instalar o .exe gerado
# 3. Release versão 1.0.1
npm run release:quick

# 4. App instalado deve notificar update
```

## 🛠️ Troubleshooting

### Build falha
```bash
# Limpar cache
rm -rf dist/ node_modules/ client/node_modules/
npm install
cd client && npm install && cd ..
node build-electron.js
```

### GitHub Actions falha
- Verifique se o repositório é público
- Confirme que as permissões estão corretas
- Check logs em: https://github.com/giovanycoelho/GPTWhats/actions

### Auto-update não funciona
- Confirme se `latest.yml` existe no release
- Verifique se a URL do repositório está correta
- App deve estar instalado via .exe (não portable)

### Ícones não aparecem
```bash
# Adicionar ícones reais
# assets/icon.png (256x256)
# assets/icon.ico (multi-resolution)
```

## 📊 Workflow de Desenvolvimento

### Desenvolvimento Local:
```bash
git clone https://github.com/giovanycoelho/GPTWhats.git
cd GPTWhats
npm install
cd client && npm install && cd ..
npm run electron:dev
```

### Cycle de Releases:
1. **Develop** → Fazer mudanças no código
2. **Test** → `npm run electron:dev`
3. **Release** → `npm run release`
4. **Distribute** → GitHub release automático
5. **Update** → Users notificados automaticamente

### Versionamento:
- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features
- **Patch** (1.0.0 → 1.0.1): Bug fixes

## 🎯 Checklist Pré-Release

### ✅ Antes de cada release:
- [ ] Código testado localmente
- [ ] `npm run electron:dev` funcionando
- [ ] Versão atualizada no package.json
- [ ] Release notes preparadas
- [ ] Ícones atualizados (se necessário)
- [ ] Dependencies atualizadas (se necessário)

### ✅ Após release:
- [ ] Testar download do GitHub
- [ ] Instalar e verificar funcionamento
- [ ] Confirmar auto-update em versão anterior
- [ ] Comunicar aos usuários (se breaking changes)

## 🔐 Segurança

### Certificado de Código:
```bash
# Para distribuição profissional, considere:
# 1. Comprar certificado de code signing
# 2. Configurar no electron-builder
# 3. Evita warnings de "publisher unknown"
```

### Atualizações Seguras:
- ✅ Updates só via HTTPS
- ✅ Verificação de assinatura automática
- ✅ Rollback em caso de erro
- ✅ Sandbox do Electron habilitado

## 📈 Analytics e Monitoramento

### Métricas úteis:
- Downloads por release (GitHub Insights)
- Update adoption rate
- Crash reports (implementar Sentry se necessário)
- Usage statistics (implementar Telemetry se necessário)

---

## 🎉 Resultado Final

Após seguir este guia:
- ✅ **Distribuição profissional** via GitHub Releases
- ✅ **Auto-updates automáticos** e transparentes  
- ✅ **Build pipeline** completamente automatizado
- ✅ **Instalação simples** para usuários finais
- ✅ **Manutenção fácil** para desenvolvedores

**Seu GPTWhats agora está pronto para distribuição profissional!** 🚀