// Serviço do launcher. Consulta a presença da conta PSN para mostrar o jogo aberto no PS5.
// Usa a API não oficial da PSN (mesmos endpoints da biblioteca psn-api).
// Escrito em ES5 com callbacks: o Node do webOS 4 é antigo.
//
// Métodos (luna://com.pedrorenan.launcher.service/...):
//   setToken { npsso, onlineId? } -> guarda o NPSSO e testa o login
//   presence {}                  -> { online, platform, game: { name, icon } | null }

var Service = require('webos-service');
var https = require('https');
var fs = require('fs');
var path = require('path');
var querystring = require('querystring');

var service = new Service('com.pedrorenan.launcher.service');

var AUTH_URL = 'https://ca.account.sony.com/api/authz/v3/oauth';
var PROFILE_URL = 'https://us-prof.np.community.playstation.net/userProfile/v1/users/';
var PRESENCE_URL = 'https://m.np.playstation.com/api/userProfile/v1/internal/users/';
var CLIENT_ID = '09515159-7237-4370-9b40-3806e67c0891';
var CLIENT_BASIC = 'Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=';
var REDIRECT_URI = 'com.scee.psxandroid.scecompcall://redirect';
var SCOPE = 'psn:mobile.v2.core psn:clientapp';
var CACHE_MS = 45 * 1000;

var STATE_FILES = [path.join(__dirname, 'state.json'), '/tmp/com.pedrorenan.launcher.psn.json'];
var state = loadState();
var cache = { at: 0, value: null };

function loadState() {
  for (var i = 0; i < STATE_FILES.length; i++) {
    try { return JSON.parse(fs.readFileSync(STATE_FILES[i], 'utf8')); } catch (e) {}
  }
  return {};
}

function saveState() {
  var data = JSON.stringify(state);
  for (var i = 0; i < STATE_FILES.length; i++) {
    try { fs.writeFileSync(STATE_FILES[i], data, { mode: 384 }); return; } catch (e) {}
  }
}

function fail(code, text) {
  var err = new Error(text);
  err.code = code;
  return err;
}

// Requisição HTTPS simples, sem seguir redirecionamentos.
function request(method, url, headers, body, cb) {
  var u = require('url').parse(url);
  var req = https.request({
    method: method, hostname: u.hostname, path: u.path, headers: headers || {}
  }, function (res) {
    var chunks = [];
    res.on('data', function (c) { chunks.push(c); });
    res.on('end', function () {
      var text = Buffer.concat(chunks).toString('utf8');
      var json = null;
      try { json = JSON.parse(text); } catch (e) {}
      cb(null, { status: res.statusCode, headers: res.headers, json: json });
    });
  });
  req.on('error', function (e) { cb(fail('NETWORK', e.message)); });
  req.setTimeout(15000, function () { req.abort(); });
  if (body) req.write(body);
  req.end();
}

function requestTokens(form, cb) {
  var body = querystring.stringify(form);
  request('POST', AUTH_URL + '/token', {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(body),
    Authorization: CLIENT_BASIC
  }, body, function (err, res) {
    if (err) return cb(err);
    var t = res.json || {};
    if (!t.access_token) return cb(fail('AUTH', 'A PSN recusou o login (' + res.status + ')'));
    var now = Date.now();
    state.accessToken = t.access_token;
    state.accessExpires = now + t.expires_in * 1000;
    if (t.refresh_token) {
      state.refreshToken = t.refresh_token;
      state.refreshExpires = now + t.refresh_token_expires_in * 1000;
    }
    saveState();
    cb(null);
  });
}

// NPSSO -> código de acesso -> tokens
function loginWithNpsso(cb) {
  if (!state.npsso) return cb(fail('NO_TOKEN', 'Nenhum NPSSO configurado'));
  var url = AUTH_URL + '/authorize?' + querystring.stringify({
    access_type: 'offline', client_id: CLIENT_ID, redirect_uri: REDIRECT_URI,
    response_type: 'code', scope: SCOPE
  });
  request('GET', url, { Cookie: 'npsso=' + state.npsso }, null, function (err, res) {
    if (err) return cb(err);
    var location = res.headers.location || '';
    var match = /[?&]code=([^&]+)/.exec(location);
    if (!match) return cb(fail('NPSSO_EXPIRED', 'NPSSO inválido ou expirado'));
    requestTokens({
      code: decodeURIComponent(match[1]), redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code', token_format: 'jwt'
    }, cb);
  });
}

function withAccessToken(cb) {
  var now = Date.now();
  if (state.accessToken && now < state.accessExpires - 60000) return cb(null, state.accessToken);
  var done = function (err) { cb(err, state.accessToken); };
  if (state.refreshToken && now < state.refreshExpires - 60000) {
    return requestTokens({
      refresh_token: state.refreshToken, grant_type: 'refresh_token',
      token_format: 'jwt', scope: SCOPE
    }, function (err) {
      if (err) loginWithNpsso(done);
      else done(null);
    });
  }
  loginWithNpsso(done);
}

function getJson(url, token, cb) {
  request('GET', url, { Authorization: 'Bearer ' + token, 'Accept-Language': 'pt-BR' }, null, function (err, res) {
    if (err) return cb(err);
    if (res.status !== 200 || !res.json) return cb(fail('HTTP', 'PSN respondeu ' + res.status));
    cb(null, res.json);
  });
}

function withAccountId(token, cb) {
  if (state.accountId) return cb(null, state.accountId);
  var user = encodeURIComponent(state.onlineId || 'me');
  getJson(PROFILE_URL + user + '/profile2?fields=accountId,onlineId', token, function (err, json) {
    if (err) return cb(err);
    var id = json.profile && json.profile.accountId;
    if (!id) return cb(fail('HTTP', 'Conta PSN não encontrada'));
    state.accountId = id;
    saveState();
    cb(null, id);
  });
}

function fetchPresence(cb) {
  withAccessToken(function (err, token) {
    if (err) return cb(err);
    withAccountId(token, function (err2, accountId) {
      if (err2) return cb(err2);
      getJson(PRESENCE_URL + accountId + '/basicPresences?type=primary', token, function (err3, json) {
        if (err3) return cb(err3);
        var p = json.basicPresence || {};
        var platform = p.primaryPlatformInfo || {};
        var online = platform.onlineStatus === 'online';
        var title = online && p.gameTitleInfoList && p.gameTitleInfoList[0];
        cb(null, {
          online: online,
          platform: platform.platform || null,
          game: title ? { name: title.titleName, icon: title.conceptIconUrl || null } : null
        });
      });
    });
  });
}

function respondError(message, err) {
  message.respond({ returnValue: false, errorCode: err.code || 'ERROR', errorText: err.message });
}

service.register('setToken', function (message) {
  var p = message.payload || {};
  if (!p.npsso || typeof p.npsso !== 'string') {
    return message.respond({ returnValue: false, errorCode: 'BAD_INPUT', errorText: 'Informe o npsso' });
  }
  state = { npsso: p.npsso.trim(), onlineId: p.onlineId || null };
  cache = { at: 0, value: null };
  saveState();
  loginWithNpsso(function (err) {
    if (err) return respondError(message, err);
    withAccountId(state.accessToken, function (err2, accountId) {
      if (err2) return respondError(message, err2);
      message.respond({ returnValue: true, accountId: accountId });
    });
  });
});

service.register('presence', function (message) {
  if (cache.value && Date.now() - cache.at < CACHE_MS) {
    return message.respond(Object.assign({ returnValue: true }, cache.value));
  }
  fetchPresence(function (err, value) {
    if (err) return respondError(message, err);
    cache = { at: Date.now(), value: value };
    message.respond(Object.assign({ returnValue: true }, value));
  });
});
