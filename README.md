# lg-tv

Launcher leve para a LG 43LM6300 (webOS 4.10, rooteada). Mostra só Netflix, Globoplay, Crunchyroll e as entradas HDMI.

O app fica em `launcher/` e é uma página única (`index.html`) sem dependências, escrita para o Chromium 53 do webOS 4.

## Testar no computador

Abra `launcher/index.html` no navegador. Setas navegam, Enter "abre" (no navegador só aparece um aviso com o ID do app).

## Confirmar os IDs dos apps na TV

Pelo telnet (`nc 192.168.1.27 23`):

```sh
luna-send -n 1 -f luna://com.webos.applicationManager/listApps '{}' | grep '"id"'
```

Ajuste os IDs marcados com `VERIFICAR` em `launcher/index.html` (Globoplay e Crunchyroll).

## Aparelhos nas entradas HDMI

Cada entrada mostra o logo do aparelho ligado: PlayStation, Xbox ou Nintendo. Aparelho não reconhecido ou porta vazia usa o ícone padrão. Os logos ficam em `launcher/img/devices/` (`playstation.svg`, `xbox.svg`, `nintendo.svg`, `default.svg`).

A detecção usa o serviço de entradas da TV (EIM) e o nome que o aparelho envia pelo HDMI-CEC. Para conferir o que a TV informa, ligue os consoles e rode pelo telnet:

```sh
luna-send -n 1 -f luna://com.webos.service.eim/getAllInputStatus '{}'
```

Se algum aparelho não for reconhecido, fixe o tipo em `OVERRIDES` no `launcher/index.html`, por exemplo `{ HDMI_2: 'xbox' }`.

No navegador, as teclas 1, 2 e 3 trocam o aparelho simulado em cada entrada.

## Jogo aberto no PS5

A entrada do PlayStation mostra o nome do jogo aberto, lido da presença da sua conta PSN. Quem consulta a PSN é o serviço em `launcher-service/`, que vai no mesmo pacote do app. A API da PSN não é oficial e pode mudar.

Para ativar:

1. No computador, entre em https://www.playstation.com com sua conta. Depois abra https://ca.account.sony.com/api/v1/ssocookie e copie o valor de `npsso`. Ele vale cerca de 2 meses e dá acesso à sua conta, então não compartilhe nem coloque no repositório.
2. Na TV, pelo telnet, entregue o NPSSO ao serviço:

   ```sh
   luna-send -n 1 -f luna://com.pedrorenan.launcher.service/setToken '{"npsso":"COLE_AQUI"}'
   ```

   A resposta deve ter `"returnValue": true`. Se vier um erro de conta não encontrada, repita com o seu ID online: `'{"npsso":"COLE_AQUI","onlineId":"SEU_ID"}'`.
3. Para testar: `luna-send -n 1 -f luna://com.pedrorenan.launcher.service/presence '{}'`

O jogo só aparece se o PS5 estiver online e o seu status de presença não estiver oculto nas configurações de privacidade da PSN. Quando o NPSSO expirar, o serviço responde `NPSSO_EXPIRED`; repita os passos 1 e 2.

O Nintendo Switch não tem API de presença, então a entrada dele mostra só o nome do console.

## Instalar na TV

1. No Mac, gere o pacote (precisa do `@webos-tools/cli`):

   ```sh
   npm install -g @webos-tools/cli
   ares-package launcher launcher-service
   python3 -m http.server 8000
   ```

2. Na TV, pelo telnet, baixe e instale (troque `IP_DO_MAC`):

   ```sh
   curl -o /tmp/launcher.ipk http://IP_DO_MAC:8000/com.pedrorenan.launcher_0.1.0_all.ipk
   luna-send -n 1 luna://com.webos.appInstallService/dev/install \
     '{"id":"com.pedrorenan.launcher","ipkUrl":"/tmp/launcher.ipk","subscribe":true}'
   ```

O app aparece na lista de apps como "Launcher".
