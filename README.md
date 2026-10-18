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

## Instalar na TV

1. No Mac, gere o pacote (precisa do `@webos-tools/cli`):

   ```sh
   npm install -g @webos-tools/cli
   ares-package launcher
   python3 -m http.server 8000
   ```

2. Na TV, pelo telnet, baixe e instale (troque `IP_DO_MAC`):

   ```sh
   curl -o /tmp/launcher.ipk http://IP_DO_MAC:8000/com.pedrorenan.launcher_0.1.0_all.ipk
   luna-send -n 1 luna://com.webos.appInstallService/dev/install \
     '{"id":"com.pedrorenan.launcher","ipkUrl":"/tmp/launcher.ipk","subscribe":true}'
   ```

O app aparece na lista de apps como "Launcher".
