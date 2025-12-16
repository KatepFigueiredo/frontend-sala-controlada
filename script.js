import { API_URL } from "./config.js";



let cartoes = [];


// Carrega dados ao iniciar
document.addEventListener('DOMContentLoaded', function() {
  carregarDadosArmazenados();
  
document.getElementById('btn-saida').addEventListener('click', ativarSaida);
document.getElementById('btn-limpar').addEventListener('click', limparLog); 
  
  fetch(`${API_URL}/cartoes`)
    .then(r => r.json())
    .then(d => {
      cartoes = d.cartoes;
    })
    .catch(e => console.error('Erro cartoes:', e));
  
  atualizar();
  setInterval(atualizar, 2000);
  
  // polling para receber eventos do backend

  setInterval(function() {
    fetch(`${API_URL}/ultimo_evento`)
      .then(r => {
        if (r.status === 204) {
          // Nenhum evento
          return null;
        }
        return r.json();
      })
      .then(evento => {
        if (evento) {
          adicionarLogDoArduino(evento.tipo, evento.dados);
        }
      })
      .catch(e => console.error('Erro ao obter evento:', e));
  }, 500);  // Polling a cada 500ms
});


// persistencia dos dados (localStorage)


function carregarDadosArmazenados() {
  const dadosArmazenados = localStorage.getItem('salaIoT');
  
  if (dadosArmazenados) {
    try {
      const dados = JSON.parse(dadosArmazenados);
      document.getElementById('ocupacao-atual').textContent = dados.ocupacao || 0;
      document.getElementById('lugares-disponiveis').textContent = dados.disponivel || 3;
      document.getElementById('temperatura').textContent = dados.temperatura || '--';
      document.getElementById('humidade').textContent = dados.humidade || '--';
      
      // Restaurar log
      if (dados.log && Array.isArray(dados.log)) {
        const logDiv = document.getElementById('log');
        logDiv.innerHTML = '';
        dados.log.forEach(msg => {
          const p = document.createElement('p');
          p.textContent = msg;
          logDiv.appendChild(p);
        });
      }
      
      log('Sistema - Dados restaurados do armazenamento local');
    } catch (e) {
      console.error('Erro ao carregar dados armazenados:', e);
    }
  }
}


function guardarDados() {
  const ocupacao = document.getElementById('ocupacao-atual').textContent;
  const disponivel = document.getElementById('lugares-disponiveis').textContent;
  const temperatura = document.getElementById('temperatura').textContent;
  const humidade = document.getElementById('humidade').textContent;
  
  // Guardar log
  const logDiv = document.getElementById('log');
  const logMensagens = [];
  Array.from(logDiv.getElementsByTagName('p')).forEach(p => {
    logMensagens.push(p.textContent);
  });
  
  const dados = {
    ocupacao: ocupacao,
    disponivel: disponivel,
    temperatura: temperatura,
    humidade: humidade,
    log: logMensagens,
    timestamp: new Date().toISOString()
  };
  
  localStorage.setItem('salaIoT', JSON.stringify(dados));
}


//funcoes de contolo


function ativarSaida() {
  const ocupacaoAtual = parseInt(document.getElementById('ocupacao-atual').textContent);
  
  if (ocupacaoAtual <= 0) {
    log('Controlo - Sala vazia. Nao e possivel sair');
    return;
  }
  
  fetch(`${API_URL}/botao_saida`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({acao: 'ativar'})
  })
    .then(r => r.json())
    .then(d => {
      if (d.status === 'ok') {
        log('Saida - SAIDA ATIVADA - Pode sair, obrigado');
      } else {
        log('Saida - Erro: ' + d.mensagem);
      }
    })
    .catch(e => {
      log('Saida - Erro de comunicacao com servidor');
    });
}


function atualizar() {
  // GET /ocupacao
  fetch(`${API_URL}/ocupacao`)
    .then(r => r.json())
    .then(data => {
      document.getElementById('ocupacao-atual').textContent = data.ocupacao_atual;
      document.getElementById('lugares-disponiveis').textContent = data.disponivel;
      guardarDados();
    })
    .catch(e => console.error('Erro ocupacao:', e));


  // GET /temperatura
  fetch(`${API_URL}/temperatura`)
    .then(r => r.json())
    .then(data => {
      if (data && data.temperatura) {
        document.getElementById('temperatura').textContent = data.temperatura.toFixed(1);
        document.getElementById('humidade').textContent = data.humidade.toFixed(1);
        guardarDados();
      }
    })
    .catch(e => console.error('Erro temp:', e));
}


//logs


function obterDataHoraFormatada() {
  const agora = new Date();
  
  // Formatar data: DD/MM/YYYY
  const dia = String(agora.getDate()).padStart(2, '0');
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const ano = agora.getFullYear();
  
  // Formatar hora: HH:MM:SS
  const horas = String(agora.getHours()).padStart(2, '0');
  const minutos = String(agora.getMinutes()).padStart(2, '0');
  const segundos = String(agora.getSeconds()).padStart(2, '0');
  
  return `[${dia}/${mes}/${ano}, ${horas}:${minutos}:${segundos}]`;
}


function log(mensagem) {
  const div = document.getElementById('log');
  const p = document.createElement('p');
  
  const dataHora = obterDataHoraFormatada();
  p.textContent = `${dataHora} ${mensagem}`;
  
 
  if (mensagem.includes('Entrada')) {
    p.className = 'entrada';
  } else if (mensagem.includes('Saida')) {
    p.className = 'saida';
  } else if (mensagem.includes('Nao Permitido') || mensagem.includes('Erro')) {
    p.className = 'negado';
  } else if (mensagem.includes('cheia') || mensagem.includes('Lotacao')) {
    p.className = 'lotacao';
  } else if (mensagem.includes('Permitido')) {
    p.className = 'permitido';
  }
  
  div.appendChild(p);
  div.scrollTop = div.scrollHeight;
  
  // Manter apenas últimas 50 mensagens
  while (div.children.length > 50) {
    div.children[0].remove();
  }
  
  // Guardar dados (log atualizado)
  guardarDados();
}


function limparLog() {
  if (confirm('Tens a certeza que queres limpar o log?')) {
    document.getElementById('log').innerHTML = '<p>[Sistema iniciado]</p>';
    guardarDados();
    log('Sistema - Log foi limpo');
  }
}





// Esta funcao vai serchamada pelo backend quando houver novos eventos do Arduino
function adicionarLogDoArduino(tipo, dados) {
  switch(tipo) {
    case 'rfid_permitido':
      log(`RFID - Detetado RFID Permitido - ${dados.nome}`);
      break;
    case 'rfid_negado':
      log(`RFID - Detetado RFID Nao Permitido - ${dados.chave_rfid}`);
      break;
    case 'rfid_lotacao':
      log(`RFID - Sala cheia, entrada nao permitida - ${dados.nome}`);
      break;
    case 'entrada':
      log(`Entrada - Utilizador entrou na sala - Ocupacao atual: ${dados.ocupacao}`);
      break;
    case 'saida':
      log(`Saida - Utilizador saiu da sala - Ocupacao atual: ${dados.ocupacao}`);
      break;
    case 'temperatura':
      log(`Clima - Temperatura: ${dados.temperatura}°C, Humidade: ${dados.humidade}%`);
      break;
    default:
      log(`Evento - ${dados.mensagem || 'Evento desconhecido'}`);
  }
}


// Guardar dados quando a página está a fechar
window.addEventListener('beforeunload', function() {
  guardarDados();
});


// Guardar dados a cada 30 segundos como backup
setInterval(guardarDados, 30000);