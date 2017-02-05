
window.qsv = function (s) {
  return document.querySelector(s).value;
}
window.qsa = function (s) {
  return document.querySelectorAll(s);
}

window.cvv = {
  internal: { o: {}, v: {}, d: {} },
  boot: function () {
    if (!cvv.internal.boot)
      cvv.internal.boot = new Promise(function (resolve, reject) {
        var config = {
          apiKey: "AIzaSyDfaFK-b45-NlueU--RNUYTRqJV9w2wzyg",
          authDomain: "i-cvv-hoda5.firebaseapp.com",
          databaseURL: "https://i-cvv-hoda5.firebaseio.com",
          storageBucket: "i-cvv-hoda5.appspot.com",
          messagingSenderId: "912825779427"
        };
        firebase.initializeApp(config);

        var unsubscribe = firebase.auth().onAuthStateChanged(function (user) {
          if (user) {
            resolve(user);
            unsubscribe();
          }
        });

        setTimeout(function () {
          resolve();
          unsubscribe();
        }, 1000);
      });
    return cvv.internal.boot;
  },
  OP: {
    entrar: function (canais) {
      if (cvv.internal.o.uid)
        return Promise.resolve(cvv.internal.o.uid);
      return cvv.boot().then(function () {
        return coloca_na_filaOP(canais)
      });
    },
    sair: function () {
      return cvv.boot().then(function () {
        var uid = cvv.internal.o.uid;
        delete cvv.internal.o.uid;
        firebase.database().ref('filaOP/' + uid).remove().then(function () {
          firebase.auth().signOut();
        })
      });
    },
    canal: function (nome, checked) {
      return cvv.boot().then(function () {
        var u = {};
        u[nome] = checked;
        return coloca_na_filaOP(u);
      });
    },
    iniciar_atendimento: function (vuid) {
      return cvv.boot().then(function () {
        webrtc.onTimeout(function () {
          firebase.database().ref('atendimento/' + vuid)
            .remove()
            .then(function () {
              location.href = '/index.html';
            })
        });
        firebase.database().ref('atendimento/' + vuid).on('value', function (va) {
          var a = va.val();
          if (!a) {
            location.href = '/index.html';
            return
          }
          if (a.state == 2) {
            var ouid = localStorage.getItem('ouid');
            if (a && a.op == ouid) {
              try {
                cvv.internal.o.webrtc = webrtc.join(vuid, ouid, a.canal);
              }
              catch (e) {
                firebase.database().ref('atendimento/' + vuid).remove();
                return errcompat('o.iniciarAtendimento', e);
              }
            }
          }
        });
      });
    },
    finalizar_atendimento: function () {
      if (cvv.internal.o.webrtc) {
        webrtc.close();
        firebase.database().ref('atendimento/' + cvv.internal.o.webrtc).remove().then(function () {
          location.href = '/index.html';
        });
      }
    }
  },
  voluntario: {
    login: function (nome, senha) {
      return cvv.boot().then(function () {
        return firebase.auth().signInAnonymously();
      })
    },
    loginFacebook: function () {
      return cvv.boot().then(function () {
        return firebase.auth()
          .signInWithPopup(new firebase.auth.FacebookAuthProvider())
      });
    },
    loginGoogle: function () {
      return cvv.boot().then(function () {
        return firebase.auth()
          .signInWithPopup(new firebase.auth.GoogleAuthProvider())
      });
    },
    disponibilizarAtendimento: function () {
      return cvv.boot().then(function (user) {
        return firebase.database().ref('filaVoluntario/' + user.uid).set({
          "nome": 'Voluntário Teste',
          "texto": qs('#checkbox-texto').checked,
          "audio": qs('#checkbox-audio').checked,
          "video": qs('#checkbox-video').checked
        });
      });
    },
    retirarDisponibilidade: function (uid) {
      return firebase.database().ref('filaVoluntario/' + uid).remove();
    },
    esperar: function (fn) {
      var filaVoluntario = {};
      return cvv.boot().then(function () {
        var vuid = firebase.auth().currentUser.uid;
        firebase.database().ref('filaVoluntario/' + vuid).on('value', function (v) {
          filaVoluntario = v.val() || {};
        });
        firebase.database().ref('filaOP').on('value', function (v) {
          if (!cvv.internal.v.conectando) {
            var toda_filaOP = v.val();
            if (toda_filaOP)
              Object.keys(toda_filaOP).some(function (ouid) {
                var filaOP = toda_filaOP[ouid];
                if (!filaOP.conectando) {
                  var canal;
                  if (filaOP.texto && filaVoluntario.texto) canal = 'texto';
                  if (filaOP.audio && filaVoluntario.audio) canal = 'audio';
                  if (filaOP.video && filaVoluntario.video) canal = 'video';
                  if (canal) {
                    cvv.voluntario.iniciar_conexao(vuid, ouid, canal);
                    return true;
                  }
                }
              })
          }
        });
        firebase.database().ref('atendimento/' + vuid).on('value', function (val) {
          var a = val.val();
          if (a)
            fn(a);
        });
      });
    },
    iniciar_conexao: function (vuid, ouid, canal) {
      cvv.internal.v.conectando = {
        OP: ouid,
        canal: canal,
        ts: new Date().getTime()
      };
      return firebase.database().ref('filaOP/' + ouid).transaction(function (o) {
        if (o && !o.conectando) {
          o.conectando = {
            voluntario: vuid,
            canal: canal
          };
          return o;
        }
      });
      // TODO cancelar conexao
    },
    iniciar_atendimento: function () {
      return cvv.boot().then(function (ouid) {
        var vuid = firebase.auth().currentUser.uid;
        webrtc.onTimeout(function () {
          firebase.database().ref('atendimento/' + vuid)
            .remove()
            .then(function () {
              location.href = '/index.html';
            })
        });
        firebase.database().ref('atendimento/' + vuid).on('value', function (va) {
          var a = va.val();
          if (a) {
            if (a.state == 1)
              try {
                cvv.internal.v.webrtc = webrtc.create(vuid, a.op, a.canal, function () {
                  firebase.database().ref('atendimento/' + vuid + '/state').set(2);
                });
              }
              catch (e) {
                firebase.database().ref('atendimento/' + vuid);
                return errcompat('v.iniciarAtendimento', e);
              }
          }
          else location.href = '/v-disponibilidade.html';
        });
      });
    },
    finalizar_atendimento: function () {
      if (cvv.internal.v.webrtc) {
        webrtc.close();
        firebase.database().ref('atendimento/' + cvv.internal.v.webrtc).remove().then(function () {
          location.href = '/v-disponibilidade.html';
        }).then(function () {
          location.href = '/v-disponibilidade.html';
        });
      }
    }
  },
  dashboard: {
    update: function () {
      if (cvv.internal.d.on && cvv.internal.d.s)
        cvv.internal.d.on(cvv.internal.d.s);
    },
    on: function (fn) {
      cvv.internal.d.s = {
        texto: { a: 0, f: 0 },
        audio: { a: 0, f: 0 },
        video: { a: 0, f: 0 },
        voluntarios: { a: 0, f: 0 }
      };
      cvv.internal.d.on = fn;
      cvv.boot().then(function () {

        firebase.database().ref('filaOP').on('value', function (v) {
          var filaOP = v.val();
          cvv.internal.d.s.texto.f = 0;
          cvv.internal.d.s.audio.f = 0;
          cvv.internal.d.s.video.f = 0;
          if (filaOP)
            Object.keys(filaOP).forEach(function (uid) {
              var op = filaOP[uid];
              if (op.texto) cvv.internal.d.s.texto.f++;
              if (op.audio) cvv.internal.d.s.audio.f++;
              if (op.video) cvv.internal.d.s.video.f++;
            });
          cvv.dashboard.update();
        });

        firebase.database().ref('filaVoluntario').on('value', function (v) {
          var filaVoluntario = v.val();
          if (filaVoluntario)
            cvv.internal.d.s.voluntarios.f = Object.keys(filaVoluntario).length;
          else
            cvv.internal.d.s.voluntarios.f = 0;
          cvv.dashboard.update();
        });

        firebase.database().ref('atendimento').on('value', function (v) {
          var atendimentos = v.val();
          cvv.internal.d.s.texto.a = 0;
          cvv.internal.d.s.audio.a = 0;
          cvv.internal.d.s.video.a = 0;
          cvv.internal.d.s.voluntarios.a = 0;
          if (atendimentos)
            Object.keys(atendimentos).forEach(function (vuid) {
              var a = atendimentos[vuid];
              if (a.canal == 'texto') cvv.internal.d.s.texto.a++;
              if (a.canal == 'audio') cvv.internal.d.s.audio.a++;
              if (a.canal == 'video') cvv.internal.d.s.video.a++;
              cvv.internal.d.s.voluntarios.a++;
            });
          cvv.dashboard.update();
        });
      });
    }
  }
}

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
var peerOpts = {
  secure: true,
  host: 'hoda5webrtc.herokuapp.com',
  port: 443,
  path: '/',
  debug: 3
};

window.webrtc = {
  remote_stream: null,
  tracks: {
    audio: 0,
    video: 0
  },
  create: function (roomId, joinId, canal, callback) {
    if (canal == 'texto') webrtc.createChat(roomId, joinId, callback);
    else webrtc.createCall(roomId, joinId, canal == 'video', callback);
    return roomId;
  },
  join: function (roomId, myId, canal) {
    if (canal == 'texto') webrtc.joinChat(roomId, myId);
    else webrtc.joinCall(roomId, myId, canal == 'video');
    return roomId;
  },
  createChat: function (roomId, joinId, callback) {
    console.log('createChat ', roomId, ' ', joinId);
    webrtc.peer = new Peer(roomId, peerOpts);
    webrtc.peer.on('error', function (err) {
      console.log('createChat peer.error', roomId, ' ', joinId, err);
      reconnect(err);
    });
    webrtc.peer.on('disconnected', function (err) {
      console.log('createChat peer.disconnected', roomId, ' ', joinId, err);
      reconnect(err);
    });
    webrtc.peer.on('connection', function (conn) {
      console.log('createChat peer.error', roomId, ' ', joinId, ' label=', conn.label);
      if (conn.label != joinId) {
        errcompat('texto.create.label<>', err);
        conn.close();
        return
      }
      if (webrtc.connection)
        messager.online();
      else
        messager.online('Você já pode conversar com a Outra Pessoa');
      webrtc.connection = conn;
      conn.on('data', function (data) {
        if (data.ping)
          conn.send({
            pong: new Date().getTime(),
          });
        if (data.pong)
          webrtc.last_pong = new Date().getTime();
        if (data.confirm)
          messager.confirm(data.seq);
        if (data.message) {
          messager.add(data.message, 'OP', data.seq);
          conn.send({ confirm: true, seq: data.seq });
        }
        if (data.typing)
          messager.typing('OP');
      });
      conn.on('close', function () {
        console.log('createChat conn.close', roomId, ' ', joinId, ' label=', conn.label);
        reconnect('closed');
      });
      conn.on('error', function (err) {
        console.log('createChat conn.error', roomId, ' ', joinId, err);
        reconnect(err);
      });
      conn.send({ ping: new Date().getTime() });
    });
    function reconnect(err) {
      setTimeout(function () {
        // webrtc.connection = { reconnecting: true };
        messager.reconnecting();
        // webrtc.peer.reconnect();
        // webrtc.connection.reconnect();
        if (webrtc.peer.disconnected)
          webrtc.peer.reconnect();
      }, 50);
    }
    setTimeout(callback, 1);
  },
  joinChat: function (roomId, myId, canal) {
    webrtc.peer = new Peer(myId, peerOpts);
    connect();
    function connect() {
      var conn = webrtc.peer.connect(roomId, { label: myId });
      conn.on('error', function (err) {
        console.log('joinChat conn.close', roomId, ' ', myId);
        reconnect(err)
      });
      conn.on('open', function () {
        if (webrtc.connection)
          messager.online();
        else
          messager.online('O sigilo é muito importante para o CVV, nenhuma mensagem dessa conversa ficará gravada por nós.');
        webrtc.connection = conn;
        conn.on('data', function (data) {
          if (data.ping)
            conn.send({
              pong: new Date().getTime(),
            });
          if (data.pong)
            webrtc.last_pong = new Date().getTime();
          if (data.confirm)
            messager.confirm(data.seq);
          if (data.message) {
            messager.add(data.message, 'v', data.seq);
            conn.send({ confirm: true, seq: data.seq });
          }
          if (data.typing)
            messager.typing('v');
        });
        conn.on('close', function () {
          console.log('joinChat conn.close', roomId, ' ', myId);
          reconnect('closed');
        });
        conn.send({ ping: new Date().getTime() });
        function reconnect(err) {
          setTimeout(function () {
            webrtc.connection = { reconnecting: true };
            messager.reconnecting();
            webrtc.peer.destroy();
            webrtc.peer = null;
            connect();
          }, 50);
        }
      });
    }
  },
  createCall: function (roomId, joinId, video, callback) {
    debugger
    webrtc.peer = new Peer(roomId, peerOpts);
    webrtc_passo1(true, video, function () {
      setTimeout(callback, 1);
      webrtc.peer.on('call', function (call) {
        call.answer(window.localStream);
        webrtc_passo3(call);
        call.on('error', function (err) {
          console.log('createCall call.error', roomId, ' ', joinId, err);
          reconnect(err);
        });
        call.on('close', function (err) {
          console.log('createCall call.close', roomId, ' ', joinId);
          reconnect('closed');
        });
      });
      webrtc.peer.on('error', function (err) {
        console.log('createCall peer.error', roomId, ' ', joinId, err);
        reconnect(err);
      });
    });
    function reconnect(err) {
      setTimeout(function () {
        webrtc_passo2();
        webrtc.peer.reconnect();
      }, 50);
    }
  },
  joinCall: function (roomId, myId, video) {
    debugger
    webrtc_passo1(true, video, function (err) {
      webrtc.peer = new Peer(myId, peerOpts);
      try_call();
      function try_call() {
        var call = webrtc.peer.call(roomId, window.localStream);
        if (!call) return setTimeout(reconnect, 100);
        webrtc_passo3(call);
        webrtc.peer.on('error', function (err) {
          console.log('joinCall peer.error', roomId, ' ', myId, err);
          reconnect(err);
        });
        call.on('close', function () {
          console.log('joinCall peer.close', roomId, ' ', myId);
          reconnect('closed');
        });
      }
      function reconnect() {
        setTimeout(function () {
          webrtc_passo2();
          webrtc.peer.reconnect();
          setTimeout(try_call, 300);
        }, 50)
      }
    });
  },
  close: function () { },
  onTimeout: function (fn) {
    setTimeout(function () {
      if (!webrtc.connection) fn();
    }, 180000)
  }
};

function webrtc_passo1(audio, video, callback) {
  console.log('webrtc_passo1');
  qs('#passo1').style.display = 'block';
  qs('#passo3').style.display = 'none';

  setTimeout(function () {
    if (!window.localStream)
      qs('#passo1-erro').style.display = 'block';
  }, 2000);

  navigator.getUserMedia({ audio: audio, video: video },
    function (stream) {
      qs('#my-video').setAttribute('src', URL.createObjectURL(stream));
      qs('#my-video').play();
      qs('#passo1-erro').style.display = 'none';
      window.localStream = stream;
      webrtc_passo2();
      if (callback)
        callback();
    }, function () {
      qs('#passo1-erro').style.display = 'block';
      setTimeout(function () {
        webrtc_passo1(audio, video, callback);
      }, 1000);
    });
}

function webrtc_passo2() {
  console.log('webrtc_passo2');
  qs('#passo1').style.display = 'block';
  qs('#passo3').style.display = 'none';
  qs('#passo1-erro').style.display = 'none';
}

function webrtc_passo3(call) {
  console.log('webrtc_passo3');
  if (window.existingCall) {
    window.existingCall.close();
  }

  call.on('stream', function (stream) {
    setTimeout(function () {
      webrtc.remote_stream = stream;
      var audioTracks = stream && stream.getAudioTracks()
      webrtc.tracks.audio = audioTracks ? audioTracks.length : 0;
      var videoTracks = stream && stream.getVideoTracks()
      webrtc.tracks.video = videoTracks ? videoTracks.length : 0;
      setTimeout(function () {
        qs('#their-video').setAttribute('src', URL.createObjectURL(stream));
        setTimeout(function () {
          qs('#their-video').play();
        }, 100);
      }, 100);
    }, 100);
  });

  window.existingCall = call;

  qs('#passo1').style.display = 'none';
  qs('#passo3').style.display = 'block';
}

window.Messager = function (you) {
  var ul;
  qs('#send').addEventListener('click', function () {
    send_input()
  });
  qs('#input').addEventListener('keyup', function (e) {
    if (e.keyCode == 13) {
      send_input();
      return false;
    }
    messager.typing(you);
  });
  var _sending = [];

  var seq = you == 'OP' ? 1 : 100000;
  function send_input() {
    var input = qs('#input');
    if (input.value && input.value.trim()) {
      var data = {
        message: input.value,
        seq: seq++,
      };
      _sending.push(data);
      messager.add(data.message, you, data.seq, true);
      smart_send();
    }
    input.value = '';
  }

  function smart_send() {
    if (!webrtc.connection.send) {
      debug
      return;
    }
    var data = _sending[0];
    while (data && data.confirmed) {
      _sending.shift()
      data = _sending[0];
    }
    if (data)
      webrtc.connection.send(data);
  }

  var _reconnecting = false;
  var _typing;

  var messager = {
    reconnecting: function () {
      _reconnecting = true;
    },
    online: function (msg) {
      if (_reconnecting) return;
      var e = qs('#conectando');
      e.parentNode.removeChild(e);
      ul = document.createElement('ul');
      ul.classList.add('chatmessages');
      if (msg)
        messager.add(msg, 'sys')
      qs('.chat').appendChild(ul);
    },
    typing: function (who) {
      if (who == you)
        webrtc.connection.send({ typing: true });
      else {
        if (_typing) {
          clearTimeout(_typing.tm);
          _typing.tm = setTimeout(_typing.desliga, 1000);
          return;
        }
        var li = document.createElement('li');

        var message_div = document.createElement('div');
        message_div.classList.add('typing-indicator');
        var p_div = document.createElement('p');
        p_div.innerHTML = '<span></span><span></span><span></span>';
        // p_div.innerHTML = you == ('OP' ? 'Voluntário Teste está digitando' : 'A Outra Pessoa está digitando');
        message_div.appendChild(p_div);
        li.appendChild(message_div);
        ul.appendChild(li);
        li.scrollIntoView(true);
        _typing = {
          li: li,
          desliga: desliga,
          tm: setTimeout(desliga, 4000)
        }
        function desliga() {
          if (_typing) {
            clearTimeout(_typing.tm);
            ul.removeChild(li);
          }
          _typing = null;
        }
      }
    },
    add: function (message, who, seq, need_confirm) {
      if (_typing)
        _typing.desliga();

      if (qs(['.seq', seq].join(''))) return;
      var li = document.createElement('li');

      if (who != 'sys') {
        li.classList.add(who == you ? 'you' : 'other');
        var a_user = document.createElement('a');
        a_user.classList.add('user');
        a_user.setAttribute('href', '#');

        var img_user = document.createElement('img');
        img_user.setAttribute('src', who == 'OP' ? 'images/person.png' : 'images/cvv.png');
        a_user.appendChild(img_user);
        li.appendChild(a_user);
      }

      var date_div = document.createElement('div');
      date_div.textContent = who == 'sys' ? '' : who == you ? 'Você' : (you == 'OP' ? 'Voluntário Teste' : 'a outra pessoa');
      li.appendChild(date_div);

      var message_div = document.createElement('div');
      message_div.classList.add(who == "sys" ? 'sysmessage' : 'message');
      if (seq)
        message_div.classList.add(['seq', seq].join(''));
      if (need_confirm)
        message_div.classList.add('need_confirm');
      var p_div = document.createElement('p');
      p_div.textContent = message
      message_div.appendChild(p_div);
      li.appendChild(message_div);
      ul.appendChild(li);
      li.scrollIntoView(true);
    },
    confirm(seq) {
      if (_sending.some(function (data) {
        if (data.seq == seq) {
          data.confirmed = true;
          var m = qs(['.seq', seq].join(''));
          if (m) {
            m.classList.remove('need_confirm');
            m.classList.add('was_confirmed');
          }
          return true;
        }
      })) smart_send();
    }
  };
  return messager;
}

cvv.boot();

function trataErro(error) {
  // Handle Errors here.
  var errorCode = error.code;
  var errorMessage = error.message;

  if (errorCode === 'auth/operation-not-allowed') {
    alert('You must enable Anonymous auth in the Firebase Console.');
  } else {
    console.error(error);
  }
}

function coloca_na_filaOP(opts) {
  var ouid = localStorage.getItem('ouid');
  var ref;
  if (ouid) {
    ref = firebase.database().ref('filaOP/' + ouid);
    ref.transaction(dados_fila);
  }
  else {
    ouid = firebase.database().ref('filaOP').push(dados_fila()).key;
    localStorage.setItem('ouid', ouid);
    ref = firebase.database().ref('filaOP/' + ouid);
  }
  ref.on('value', function (v) {
    var filaOP = v.val();
    if (filaOP && filaOP.conectando) {
      firebase.database()
        .ref('atendimento/' + filaOP.conectando.voluntario)
        .transaction(function (a) {
          if (a) cvv.OP.abortar_conexao();
          return {
            "op": ouid,
            "canal": filaOP.conectando.canal,
            "inicio": new Date().getTime(),
            "dhFila": filaOP.dhFila,
            "state": 1
          };
        }).then(function () {
          return ref.remove();
        }).then(function () {
          firebase.database().ref('filaVoluntario/' + filaOP.conectando.voluntario).remove();
        }).then(function () {
          location.href = ['/a-', filaOP.conectando.canal, '-o.html#', filaOP.conectando.voluntario].join('');
        });
    }
  });
  cvv.internal.o.uid = ouid;
  return ouid;
  function dados_fila(o) {
    o = o || {};
    if (typeof opts.texto === 'boolean')
      o.texto = opts.texto;
    else if (typeof o.texto !== 'boolean')
      o.texto = true;
    if (typeof opts.audio === 'boolean')
      o.audio = opts.audio;
    else if (typeof o.audio !== 'boolean')
      o.audio = true;
    if (typeof opts.video === 'boolean')
      o.video = opts.video;
    else if (typeof o.video !== 'boolean')
      o.video = true;
    o.dhFila = o.dhFila || new Date().getTime();
    return o;
  }
}

function webrtc_lost() {
  setTimeout(function () {
    qs('#demo-container').textContent = 'A conexão foi perdida';
    setTimeout(function () {
      location.href = '/index.html'
    }, 5000)
  }, 5000)
}

function errcompat(id, e) {
  try {
    firebase.database().ref('errcompat').push({
      id: id,
      agent: navigator.userAgent,
      e: e.stack ? e.stack.toString() : e.toString(),
    }).then(function () {
      location.href = '/errcompat.html';
    })
  }
  catch (e2) {
    location.href = '/errcompat.html';
  }
}