#!/bin/sh
# Fecha apps que a TV deixa pré-carregados em segundo plano e mostra a RAM antes e depois.
# Rodar na TV como root (telnet/SSH). Não altera arquivos do sistema: no próximo boot
# ou uso, a TV pode carregar os apps de novo.
#
# Uso: sh liberar-memoria.sh            -> fecha YouTube e navegador
#      sh liberar-memoria.sh --netflix  -> fecha também a Netflix (ela vai abrir mais devagar)

APPS="youtube.leanback.v4 com.webos.app.browser"
[ "$1" = "--netflix" ] && APPS="$APPS netflix"

echo "Antes:"
free -m | sed -n '1,2p'

for app in $APPS; do
  echo "Fechando $app"
  luna-send -n 1 luna://com.webos.applicationManager/closeByAppId "{\"id\":\"$app\"}" >/dev/null 2>&1
done

sleep 3
echo "Depois:"
free -m | sed -n '1,2p'
