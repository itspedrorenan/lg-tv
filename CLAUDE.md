# lg-tv

Launcher customizado para uma LG 43LM6300PSB rooteada. Converse em português (Brasil).

## A TV

- webOS 4.10.2, ~658MB de RAM (sobram ~150–200MB livres), armazenamento quase cheio.
- IP na rede local: 192.168.1.27. Rooteada via DejaVuln, Homebrew Channel 0.7.3, updates bloqueados.
- Acesso: telnet root sem senha na porta 23. O SSH por chave não funcionou até agora.
- Para rodar um comando na TV a partir do Mac sem sessão interativa:

  ```sh
  printf 'free -m\nexit\n' | nc -w 5 192.168.1.27 23
  ```

- Lentidão: YouTube (`youtube.leanback.v4`), Netflix (`netflix`) e navegador (`com.webos.app.browser`) ficam pré-carregados. `tools/liberar-memoria.sh` fecha os dois que o usuário não usa. Não editar arquivos de sistema sem um método confirmado para esta versão do webOS.

## O código

- `launcher/`: app web (página única `index.html`, `appinfo.json`, logos em `img/devices/`). Alvo é o Chromium 53 do webOS 4: ES5, sem CSS grid, sem flex `gap`.
- `launcher-service/`: serviço Node empacotado junto com o app. Consulta a presença PSN (API não oficial, login por NPSSO) para mostrar o jogo aberto no PS5. Métodos `setToken` e `presence`.
- No navegador, `launcher/index.html` roda em modo prévia, com aparelhos simulados (teclas 1–3).
- Prévia publicada: https://claude.ai/artifact/1iNWeDnHncjr4YdJUtjZTT

## Pendências (precisam da TV)

1. Confirmar os IDs do Globoplay e do Crunchyroll (`VERIFICAR` no `index.html`) com `luna-send -n 1 -f luna://com.webos.applicationManager/listApps '{}'`.
2. Ver o que `luna-send -n 1 -f luna://com.webos.service.eim/getAllInputStatus '{}'` devolve com os consoles ligados (PS5 e Switch), e ajustar a detecção.
3. Empacotar (`ares-package launcher launcher-service`) e instalar; passos no `README.md`.
4. Configurar o NPSSO da PSN via `setToken`. O NPSSO é segredo: nunca colocar no repositório. Antes, desligar o telnet e ficar só com SSH.
5. Confirmar a pasta de scripts de boot do Homebrew Channel (`ls /var/lib/webosbrew/`) para rodar a limpeza de memória a cada boot.
