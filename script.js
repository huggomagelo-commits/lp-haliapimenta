/* ==========================================================================
   LP Salário-Maternidade — Dra. Halia Georgete Lima Pimenta · OAB/MA 19.117
   Direct response · mobile first · quiz como ferramenta central de conversão
   ========================================================================== */

var CFG = {
  /* (98) 99133-8517 — número de atendimento confirmado pelo cliente.
     Não usar o do bio.site/haliamatos, que é outro. */
  whatsapp:   "5598991338517",
  /* Perfil do escritório: é onde ficam os conteúdos sobre os demais
     benefícios do INSS que as telas de saída do quiz prometem. */
  instagram:  "https://www.instagram.com/m.p_advocacia/",
  horaInicio: 8,
  horaFim:    18,

  pixelId: "1887940685517084",

  /* Anexa a origem da campanha na mensagem do WhatsApp, para atribuir o lead.
     ATENÇÃO: o texto fica visível para a lead. Use nomes de campanha
     apresentáveis, ou troque para IDs. Ver README > UTM. */
  origemNaMensagem: true,

  /* "consentimento" respeita o banner de cookies (LGPD, coerente com a nossa
     Política). "imediato" dispara o pixel no load — mais eventos, menos
     conformidade. Ver README > Rastreamento. */
  modoPixel: "consentimento"
};

var REDUZ = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Estados iniciais de animação no CSS ficam sob .js: sem script, nada some. */
document.documentElement.classList.add("js");

/* Avisa no console enquanto os dados de contato ainda forem placeholder —
   rede de segurança para não subir a página com os CTAs quebrados. */
(function () {
  var faltando = [];
  if (CFG.whatsapp.indexOf("PENDENTE") > -1)  faltando.push("WhatsApp");
  if (CFG.instagram.indexOf("PENDENTE") > -1) faltando.push("Instagram");
  if (!CFG.pixelId || CFG.pixelId.length < 10) faltando.push("Pixel do Meta");
  if (faltando.length) {
    console.warn("[LP Halia] Dados ainda pendentes em CFG: " + faltando.join(", ") +
                 ". Os CTAs correspondentes não funcionam até serem preenchidos.");
  }
})();

/* ========================================================================
   1. UTM — captura e persistência
   ======================================================================== */
var UTM = (function () {
  var CHAVE = "mr_utm";
  var CAMPOS = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term",
                "fbclid","gclid","ttclid"];
  var dados = {};

  try { dados = JSON.parse(sessionStorage.getItem(CHAVE) || "{}"); } catch (e) {}

  var q = new URLSearchParams(location.search), novo = false;

  /* Se a URL traz QUALQUER parâmetro de campanha, é um clique novo: substitui o
     conjunto inteiro. Mesclar faria o utm_content de um anúncio antigo vazar
     para a atribuição do anúncio atual e sujar o relatório. */
  var cliqueNovo = CAMPOS.some(function (c) { return q.get(c); });
  if (cliqueNovo) { dados = {}; novo = true; }

  CAMPOS.forEach(function (c) {
    var v = q.get(c);
    if (v) dados[c] = v.slice(0, 120);
  });

  /* Sem utm_source explícito, tenta deduzir a origem em três níveis.
     Importante: Chrome, Brave, Firefox e Safari APAGAM o fbclid da URL antes
     da página carregar. Se o anúncio só mandar fbclid, não chega nada aqui —
     por isso a UTM precisa estar na URL do anúncio. */
  if (!dados.utm_source) {
    var ref = document.referrer || "";
    var ua  = navigator.userAgent || "";

    /* 1. Navegador in-app do Instagram/Facebook: o user agent entrega a origem
          mesmo sem fbclid e sem referrer. */
    if (/Instagram/i.test(ua)) {
      dados.utm_source = "instagram"; dados.utm_medium = "social_inapp";
    } else if (/FBAN|FBAV|FB_IAB/i.test(ua)) {
      dados.utm_source = "facebook";  dados.utm_medium = "social_inapp";
    /* 2. fbclid sobreviveu: veio de anúncio do Meta sem UTM configurada. */
    } else if (dados.fbclid) {
      dados.utm_source = "facebook";  dados.utm_medium = "paid_sem_utm";
    } else if (dados.gclid) {
      dados.utm_source = "google";    dados.utm_medium = "paid_sem_utm";
    /* 3. Referrer, quando existe. */
    } else if (ref) {
      dados.utm_source = ref.split("/")[2] || "referral";
      dados.utm_medium = "referral";
    /* 4. Nada identificável. Não é "direto" — é desconhecido. Rotular de
          direto faz tráfego pago parecer orgânico no relatório. */
    } else {
      dados.utm_source = "desconhecido"; dados.utm_medium = "desconhecido";
    }
    novo = true;
  }
  if (novo) { try { sessionStorage.setItem(CHAVE, JSON.stringify(dados)); } catch (e) {} }

  return {
    dados: dados,
    /* Linha curta para a mensagem do WhatsApp. */
    ref: function () {
      var p = [dados.utm_source, dados.utm_campaign, dados.utm_term, dados.utm_content]
        .filter(Boolean).map(function (s) { return s.slice(0, 40); });
      return p.length ? p.join(" / ") : "";
    },
    /* Mantém os parâmetros ao navegar para páginas internas. */
    propagar: function () {
      var qs = new URLSearchParams();
      CAMPOS.forEach(function (c) { if (dados[c]) qs.set(c, dados[c]); });
      if (qs.toString()) {
        document.querySelectorAll('a[href$=".html"]').forEach(function (a) {
          if (a.hostname && a.hostname !== location.hostname) return;
          a.href = a.href.split("?")[0] + "?" + qs.toString();
        });
      }
    }
  };
})();

/* ========================================================================
   2. Rastreamento — dataLayer + Meta Pixel
   ======================================================================== */
window.dataLayer = window.dataLayer || [];

var PIXEL_PRONTO = false;
var PAGE_VIEW_ENVIADO = false;

/* Sem consentimento o page_view sai só para o dataLayer; se a pessoa aceitar
   depois, o Pixel carrega e tentaria mandar de novo. Uma flag resolve. */
function pageViewUmaVez() {
  if (PAGE_VIEW_ENVIADO) return;
  PAGE_VIEW_ENVIADO = true;
  track("page_view", {}, true);
}

function carregarPixel() {
  if (PIXEL_PRONTO || !CFG.pixelId || CFG.pixelId.length < 10) return;
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
  (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  fbq("init", CFG.pixelId);
  PIXEL_PRONTO = true;
  fbq("track", "PageView");
  pageViewUmaVez();
}

/* nome: evento custom. padrao: evento padrão do Meta, quando existir equivalente. */
function track(nome, params, soDataLayer) {
  var p = params || {};
  p.utm_source   = UTM.dados.utm_source || "";
  p.utm_campaign = UTM.dados.utm_campaign || "";
  p.utm_content  = UTM.dados.utm_content || "";

  var ev = { event: nome };
  for (var k in p) ev[k] = p[k];
  window.dataLayer.push(ev);

  if (soDataLayer || !window.fbq) return;

  /* Para o Meta vai só o que diz ONDE a pessoa está no funil, nunca O QUE ela
     respondeu. Resposta do quiz, perfil (gestante/pós-parto), vínculo, motivo de
     saída e pergunta do FAQ são dado de saúde ou permitem inferi-lo: a Política
     promete não enviar, e o Meta restringe Pixel que recebe esse tipo de dado.
     O detalhe completo continua no dataLayer, que não sai do navegador. */
  var PERMITIDOS = ["etapa", "etapas", "progresso", "origem", "profundidade",
                    "utm_source", "utm_campaign", "utm_content"];
  var pm = {};
  PERMITIDOS.forEach(function (k) { if (p[k] !== undefined) pm[k] = p[k]; });

  /* Lead só quando a pessoa efetivamente sai para o WhatsApp — inclusive pelo
     atalho "prefiro falar direto", que também é lead. Chegar na tela de
     resultado (qualified) não dispara Lead: muita gente para ali. */
  var PADRAO = {
    whatsapp_click:  "Lead",
    whatsapp_bypass: "Lead",
    quiz_start:      "ViewContent"
  };
  if (PADRAO[nome]) fbq("track", PADRAO[nome], pm);
  fbq("trackCustom", nome, pm);
}

/* ========================================================================
   3. Quiz
   ======================================================================== */
var Q = {
  resp: {},
  pilha: [],        // histórico de telas, para o "Voltar"
  aberto: false,
  iniciado: false,
  concluido: false,
  ultimoPasso: 0
};

var modal, corpo, barra, pct;

function qAbrir(origem) {
  modal.classList.add("aberto");
  document.body.classList.add("modal-aberto");
  Q.aberto = true;
  Q.concluido = false;
  Q.resp = {};
  Q.pilha = [];
  if (!Q.iniciado) { Q.iniciado = true; }
  track("quiz_start", { origem: origem || "desconhecida" });
  ir("bebe");
}

function qFechar() {
  if (Q.aberto && !Q.concluido && Q.ultimoPasso > 0) {
    track("quiz_abandon", { etapa: Q.ultimoPasso, progresso: Q.progressoAtual || 0 });
  }
  modal.classList.remove("aberto");
  document.body.classList.remove("modal-aberto");
  Q.aberto = false;
}

/* ---------- render ---------- */
function pintar(html, progresso, opts) {
  opts = opts || {};
  corpo.innerHTML = html;
  corpo.style.animation = "none";
  void corpo.offsetHeight;
  corpo.style.animation = "";
  corpo.scrollTop = 0;

  Q.progressoAtual = progresso;
  barra.style.width = progresso + "%";
  pct.textContent = opts.rotulo || ("Análise " + progresso + "% concluída");

  var alvo = corpo.querySelector(".sq-op, .btn");
  if (alvo && !opts.semFoco) alvo.focus({ preventScroll: true });
}

function opcoes(lista, destino) {
  return '<div class="sq-opcoes">' + lista.map(function (o) {
    return '<button type="button" class="sq-op" data-v="' + o.v + '" data-ir="' + destino + '">' +
           '<span class="b"></span><span class="t">' + o.t +
           (o.sub ? '<em>' + o.sub + '</em>' : '') + '</span></button>';
  }).join("") + '</div>';
}

function voltar() {
  if (Q.pilha.length < 2) return;
  Q.pilha.pop();
  var anterior = Q.pilha.pop();
  ir(anterior);
}

function botaoVoltar() {
  return Q.pilha.length > 1
    ? '<button type="button" class="sq-voltar" data-voltar>← Voltar</button>' : '';
}

/* ---------- telas ---------- */
var TELAS = {

  bebe: function () {
    Q.ultimoPasso = 1;
    pintar(
      '<p class="sq-passo">Sobre o seu bebê</p>' +
      '<h3 class="sq-pergunta" id="sqTitulo">Quando seu bebê nasceu ou vai nascer?</h3>' +
      '<p class="sq-ajuda">É isso que define se o pedido ainda está dentro do prazo.</p>' +
      opcoes([
        { v: "gravida",  t: "Estou grávida" },
        { v: "menos1",   t: "Nasceu há menos de 1 ano" },
        { v: "1a5",      t: "Nasceu entre 1 e 5 anos" },
        { v: "mais5",    t: "Nasceu há mais de 5 anos" },
        { v: "naoainda", t: "Ainda não estou grávida" }
      ], "r_bebe"), 15);
  },

  r_bebe: function (v) {
    track("quiz_step", { etapa: 1, pergunta: "bebe", resposta: v });
    if (v === "mais5")    return ir("saida_prazo");
    if (v === "naoainda") return ir("saida_antes");
    Q.resp.gravida = (v === "gravida");
    Q.resp.bebe = { gravida: "estou grávida", menos1: "nasceu há menos de 1 ano",
                    "1a5": "nasceu entre 1 e 5 anos" }[v];
    ir("vinculo");
  },

  vinculo: function () {
    Q.ultimoPasso = 2;
    var g = Q.resp.gravida;
    pintar(
      '<p class="sq-passo">Sua situação de trabalho</p>' +
      '<h3 class="sq-pergunta">' +
        (g ? "Hoje, qual é o seu vínculo de trabalho?"
           : "Na época em que o bebê nasceu, qual era o seu vínculo?") + '</h3>' +
      '<p class="sq-ajuda">' +
        (g ? "É o que o INSS vai olhar quando o bebê nascer."
           : "Vale o que você fazia naquele momento, não o que faz hoje.") + '</p>' +
      opcoes([
        { v: "clt",       t: "Carteira assinada (CLT)" },
        { v: "mei",       t: "MEI, autônoma ou pagava por conta" },
        { v: "domestica", t: "Trabalho doméstico com carteira" },
        { v: "rural",     t: "Trabalho rural, roça ou pesca" },
        { v: "graca",     t: "Sem trabalhar", sub: "mas tinha saído de um emprego com carteira há pouco tempo" },
        { v: "nunca",     t: "Nunca contribuí ao INSS" }
      ], "r_vinculo") + botaoVoltar(), 45);
  },

  r_vinculo: function (v) {
    track("quiz_step", { etapa: 2, pergunta: "vinculo", resposta: v });
    if (v === "nunca") return ir("saida_sem_vinculo");
    Q.resp.vinculo = {
      clt: "carteira assinada", mei: "MEI, autônoma ou pagava por conta",
      domestica: "trabalho doméstico com carteira", rural: "trabalho rural, roça ou pesca",
      graca: "sem trabalhar, mas tinha saído de um emprego com carteira há pouco tempo"
    }[v];
    ir(Q.resp.gravida ? "parto" : "inss");
  },

  /* Só para grávidas: segmenta urgência e ajuda a equipe a priorizar. */
  parto: function () {
    Q.ultimoPasso = 3;
    pintar(
      '<p class="sq-passo">Quase lá</p>' +
      '<h3 class="sq-pergunta">Para quando está previsto o parto?</h3>' +
      '<p class="sq-ajuda">Quanto antes a documentação estiver pronta, mais simples fica.</p>' +
      opcoes([
        { v: "mes",    t: "Neste mês" },
        { v: "1a3",    t: "Em 1 a 3 meses" },
        { v: "mais3",  t: "Em mais de 3 meses" },
        { v: "naosei", t: "Ainda não sei" }
      ], "r_parto") + botaoVoltar(), 72);
  },

  r_parto: function (v) {
    track("quiz_step", { etapa: 3, pergunta: "parto", resposta: v });
    Q.resp.parto = { mes: "neste mês", "1a3": "em 1 a 3 meses",
                     mais3: "em mais de 3 meses", naosei: "ainda não sei" }[v];
    Q.resp.urgente = (v === "mes");
    ir("analisando");
  },

  inss: function () {
    Q.ultimoPasso = 3;
    pintar(
      '<p class="sq-passo">Pedido no INSS</p>' +
      '<h3 class="sq-pergunta">Você já pediu o salário-maternidade?</h3>' +
      '<p class="sq-ajuda">Se já pediu e foi negado, o caminho costuma ser outro.</p>' +
      opcoes([
        { v: "nao",     t: "Ainda não pedi" },
        { v: "negado",  t: "Pedi e foi negado" },
        { v: "analise", t: "Pedi e está em análise" }
      ], "r_inss") + botaoVoltar(), 72);
  },

  r_inss: function (v) {
    track("quiz_step", { etapa: 3, pergunta: "inss", resposta: v });
    Q.resp.inss = { nao: "ainda não pedi", negado: "pedi e foi negado",
                    analise: "pedi e está em análise" }[v];
    ir(v === "negado" ? "carta" : "analisando");
  },

  /* Só para quem foi negado: define se dá para ler o motivo já na primeira conversa. */
  carta: function () {
    Q.ultimoPasso = 4;
    pintar(
      '<p class="sq-passo">Última pergunta</p>' +
      '<h3 class="sq-pergunta">Você tem a carta de negativa do INSS?</h3>' +
      '<p class="sq-ajuda">É nela que está o motivo real da recusa.</p>' +
      opcoes([
        { v: "sim",    t: "Tenho em mãos" },
        { v: "acesso", t: "Consigo acessar pelo Meu INSS" },
        { v: "nao",    t: "Não tenho" }
      ], "r_carta") + botaoVoltar(), 86);
  },

  r_carta: function (v) {
    track("quiz_step", { etapa: 4, pergunta: "carta", resposta: v });
    Q.resp.carta = { sim: "tenho a carta em mãos",
                     acesso: "consigo acessar pelo Meu INSS",
                     nao: "não tenho a carta" }[v];
    ir("analisando");
  },

  /* Tela de análise: os itens abaixo descrevem a checagem que realmente é feita
     com as respostas (prazo, vínculo, qualidade de segurada). Não é enfeite. */
  analisando: function () {
    var itens = [
      "Conferindo o prazo de 5 anos",
      "Verificando o seu vínculo com o INSS",
      "Cruzando com as regras de qualidade de segurada"
    ];
    pintar(
      '<div class="sq-analise">' +
        '<div class="sq-spin" aria-hidden="true"></div>' +
        '<h3 class="sq-pergunta">Analisando suas respostas</h3>' +
        '<ul class="sq-checks">' +
          itens.map(function (t, i) {
            return '<li data-i="' + i + '"><span class="mk"></span>' + t + '</li>';
          }).join("") +
        '</ul>' +
      '</div>', 92, { rotulo: "Análise 92% concluída", semFoco: true });

    var lis = corpo.querySelectorAll(".sq-checks li");
    var atraso = REDUZ ? 0 : 420;
    lis.forEach(function (li, i) {
      setTimeout(function () { li.classList.add("ok"); }, atraso * (i + 1));
    });
    setTimeout(function () {
      track("quiz_complete", { etapas: Q.ultimoPasso });
      ir("resultado");
    }, REDUZ ? 300 : atraso * lis.length + 480);
  },

  resultado: function () {
    Q.concluido = true;
    var g = Q.resp.gravida;
    track("qualified", {
      perfil: g ? "gestante" : "pos_parto",
      vinculo: Q.resp.vinculo || "",
      urgente: Q.resp.urgente ? 1 : 0
    });

    var t = "Olá! Vim pelo site e fiz a verificação.\n\n";
    t += (g ? "Situação: " : "Bebê: ") + Q.resp.bebe + "\n";
    t += (g ? "Trabalho hoje: " : "Na época: ") + Q.resp.vinculo + "\n";
    if (g && Q.resp.parto) t += "Parto previsto: " + Q.resp.parto + "\n";
    if (!g) t += "INSS: " + Q.resp.inss + "\n";
    if (Q.resp.carta) t += "Carta de negativa: " + Q.resp.carta + "\n";
    t += "\nQuero saber se tenho direito ao salário-maternidade.";
    if (CFG.origemNaMensagem && UTM.ref()) t += "\n\nOrigem: " + UTM.ref();

    var link = "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent(t);

    var docs = g
      ? '<li>Carteira de trabalho ou comprovante de contribuição</li>'
      : '<li>Carteira de trabalho ou comprovante de contribuição</li>' +
        '<li>Certidão de nascimento do bebê</li>' +
        (Q.resp.carta ? '<li>A carta de negativa do INSS</li>' : '');

    var urg = Q.resp.urgente
      ? '<p class="sq-urg">Como o parto está previsto para este mês, o seu caso entra na frente da fila.</p>'
      : '';

    pintar(
      '<p class="sq-selo">Resultado da verificação</p>' +
      '<h3 class="sq-res-tit">Seu caso pode se encaixar</h3>' +
      '<p class="sq-res-txt">Pelas suas respostas, vale a análise do seu histórico. Quem vai te ' +
      'responder é a <strong>equipe da Dra. Halia</strong>, OAB/MA 19.117. Suas respostas já vão ' +
      'junto na mensagem, você não precisa repetir nada.</p>' + urg +
      '<div class="sq-lista-doc"><p>Se já tiver em mãos, vale separar:</p><ul>' + docs + '</ul></div>' +
      '<a class="btn btn-grande" id="sqWhats" href="' + link + '" target="_blank" rel="noopener">' +
      'Falar no WhatsApp</a>' +
      '<p class="sq-horario">' + horario() + '</p>' +
      '<button type="button" class="sq-voltar" data-reiniciar>Refazer a verificação</button>',
      100, { rotulo: "Análise concluída" });
  },

  /* ---------- saídas ---------- */
  saida_prazo: function () {
    Q.concluido = true;
    track("unqualified", { motivo: "prazo" });
    saida("prazo",
      "Pelo tempo que passou, esse caminho fica mais difícil",
      '<p class="sq-res-txt">O salário-maternidade prescreve em 5 anos. Passado esse prazo, o INSS ' +
      'geralmente não aceita mais o pedido.</p>' +
      '<p class="sq-res-txt">Isso não significa que você não tenha direito a nada. Existem outros ' +
      'benefícios do INSS que olham para a sua situação <strong>de hoje</strong>, e não para o passado.</p>' +
      '<p class="sq-res-txt">No nosso Instagram a gente fala sobre aposentadorias, pensões e os ' +
      'demais benefícios do INSS.</p>');
  },

  saida_sem_vinculo: function () {
    Q.concluido = true;
    track("unqualified", { motivo: "sem_vinculo" });
    saida("sem_vinculo",
      "Esse benefício funciona diferente do que parece",
      '<p class="sq-res-txt">O salário-maternidade vem do INSS. Para recebê-lo é preciso ter ' +
      'contribuído em algum momento, nem que seja por pouco tempo.</p>' +
      '<p class="sq-res-txt"><strong>Mas existem benefícios feitos justamente para quem nunca ' +
      'contribuiu</strong>, como o BPC/LOAS. No nosso Instagram a gente explica quem pode receber.</p>');
  },

  saida_antes: function () {
    Q.concluido = true;
    track("unqualified", { motivo: "antes_hora" });
    saida("antes_hora",
      "Você chegou antes da hora. E isso é bom.",
      '<p class="sq-res-txt">O benefício só existe depois que o bebê nasce.</p>' +
      '<p class="sq-res-txt">Mas tem uma coisa que quase ninguém sabe a tempo: <strong>quem já ' +
      'está contribuindo quando engravida costuma ter um caminho muito mais simples.</strong> ' +
      'Quem deixa para depois costuma descobrir tarde.</p>');
  }
};

function saida(motivo, titulo, corpoHtml) {
  pintar(
    '<p class="sq-selo alerta">Resultado da verificação</p>' +
    '<h3 class="sq-res-tit">' + titulo + '</h3>' + corpoHtml +
    '<a class="btn" id="sqInsta" href="' + CFG.instagram + '" target="_blank" rel="noopener" ' +
    'data-motivo="' + motivo + '">Acompanhar no Instagram</a>' +
    '<button type="button" class="sq-voltar" data-reiniciar>Respondi errado? Refazer</button>',
    100, { rotulo: "Análise concluída" });
}

function horario() {
  var d = new Date(), dia = d.getDay(), h = d.getHours();
  return (dia >= 1 && dia <= 5 && h >= CFG.horaInicio && h < CFG.horaFim)
    ? "Atendimento de segunda a sexta, das 8h às 18h."
    : "Fora do horário de atendimento. Pode mandar agora, a equipe responde no próximo dia útil, a partir das 8h.";
}

function ir(tela, valor) {
  if (!TELAS[tela]) return;
  if (tela.indexOf("r_") !== 0) Q.pilha.push(tela);
  TELAS[tela](valor);
}

/* ========================================================================
   4. Ligações de evento
   ======================================================================== */
document.addEventListener("DOMContentLoaded", function () {
  modal = document.getElementById("sqModal");
  corpo = document.getElementById("sqCorpo");
  barra = document.getElementById("sqBarra");
  pct   = document.getElementById("sqPct");

  UTM.propagar();

  /* Abre o quiz: qualquer elemento com data-quiz */
  document.addEventListener("click", function (e) {
    var alvo = e.target;
    if (!alvo || typeof alvo.closest !== "function") return;

    var abre = alvo.closest("[data-quiz]");
    if (abre) {
      e.preventDefault();
      fecharMenu();
      track("cta_click", { origem: abre.getAttribute("data-quiz") });
      return qAbrir(abre.getAttribute("data-quiz"));
    }

    /* Primeira pergunta exibida na própria página: abre o quiz já com a
       resposta registrada, direto na pergunta seguinte. */
    var vq = alvo.closest(".vq-op");
    if (vq) {
      track("cta_click", { origem: "verificacao_pagina" });
      qAbrir("verificacao_pagina");
      return ir("r_bebe", vq.getAttribute("data-v"));
    }

    var op = alvo.closest(".sq-op");
    if (op) { return ir(op.getAttribute("data-ir"), op.getAttribute("data-v")); }

    if (alvo.closest("[data-voltar]"))    return voltar();
    if (alvo.closest("[data-reiniciar]")) {
      track("quiz_restart", { etapa: Q.ultimoPasso });
      Q.resp = {}; Q.pilha = []; Q.concluido = false;
      return ir("bebe");
    }

    if (alvo.closest("#sqWhats")) {
      return track("whatsapp_click", { origem: "quiz", perfil: Q.resp.gravida ? "gestante" : "pos_parto" });
    }
    var insta = alvo.closest("#sqInsta");
    if (insta) return track("instagram_redirect", { motivo: insta.getAttribute("data-motivo") });

    var hedge = alvo.closest("[data-hedge]");
    if (hedge) {
      fecharMenu();
      return track("whatsapp_bypass", { origem: hedge.getAttribute("data-hedge") });
    }

    var wa = alvo.closest('a[href*="wa.me"]');
    if (wa) return track("whatsapp_click", { origem: wa.closest("footer") ? "rodape" : "pagina" });
  });

  document.getElementById("sqFechar").addEventListener("click", qFechar);
  modal.addEventListener("click", function (e) { if (e.target === modal) qFechar(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && Q.aberto) qFechar();
    else if (e.key === "Escape") fecharMenu();
  });

  /* Anúncio pode linkar direto para o quiz: ?quiz=1 ou #quiz */
  if (location.hash === "#quiz" || new URLSearchParams(location.search).get("quiz")) {
    setTimeout(function () { qAbrir("link_direto"); }, 250);
  }

  iniciarPagina();
});

/* ========================================================================
   5. Página
   ======================================================================== */
function iniciarPagina() {

  /* --- entradas ao rolar ---
     .reveal: blocos inteiros. .surge: itens de grade, em cascata dentro do
     grupo (ver comentário no CSS sobre o hover). */
  var GRUPOS = [
    [".cards-casos", ".card-caso"], [".comparativo", ".via"], [".compromissos", "li"],
    [".etapas", ".etapa"], [".selos", "li"], [".numeros-grid", ".stat"]
  ];
  GRUPOS.forEach(function (g) {
    document.querySelectorAll(g[0]).forEach(function (grupo) {
      grupo.querySelectorAll(g[1]).forEach(function (el, i) {
        el.classList.add("surge");
        el.style.setProperty("--d", Math.min(i * 90, 450) + "ms");
      });
    });
  });
  var alvos = document.querySelectorAll(".reveal, .surge");
  if (REDUZ || !("IntersectionObserver" in window)) {
    alvos.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    alvos.forEach(function (el) { io.observe(el); });
  }

  /* --- barra de progresso, header compacto, barra fixa, scroll depth --- */
  var topo = document.querySelector(".topo");
  var fixa = document.getElementById("barraFixa");
  var hero = document.querySelector(".hero");
  var caixaEtapas = document.getElementById("etapas");
  var etapas = [].slice.call(document.querySelectorAll(".etapa"));
  var totalEtapas = etapas.length, acesas = 0;
  var marcos = [25, 50, 75, 100], vistos = {}, tick = false;

  /* Seções que o menu acompanha, na ordem da página. */
  var secoes = [];
  document.querySelectorAll("[data-secao]").forEach(function (a) {
    var id = a.getAttribute("data-secao"), s = document.getElementById(id);
    if (s && secoes.indexOf(s) < 0) secoes.push(s);
  });
  secoes.sort(function (a, b) {
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });
  var secaoAtual = null;

  function aoRolar() {
    var d = document.documentElement;
    var total = d.scrollHeight - d.clientHeight;
    var y = window.scrollY;

    if (topo) topo.classList.toggle("compacto", y > 60);

    /* Etapas acendem uma a uma quando chegam a ~70% da altura da tela, e a
       linha que liga os círculos avança junto. */
    if (etapas.length) {
      var linhaAtiva = window.innerHeight * 0.72;
      etapas = etapas.filter(function (el) {
        if (el.getBoundingClientRect().top < linhaAtiva) {
          el.classList.add("ativa"); acesas++; return false;
        }
        return true;
      });
      if (caixaEtapas && totalEtapas > 1) {
        caixaEtapas.style.setProperty("--prog", Math.max(0, acesas - 1) / (totalEtapas - 1));
      }
    }

    /* Menu: marca a seção em que a pessoa está. */
    var atual = null;
    for (var i = 0; i < secoes.length; i++) {
      if (secoes[i].getBoundingClientRect().top <= 140) atual = secoes[i];
    }
    if (atual !== secaoAtual) {
      secaoAtual = atual;
      var idAtual = atual ? atual.id : "";
      document.querySelectorAll("[data-secao]").forEach(function (a) {
        var ativo = a.getAttribute("data-secao") === idAtual;
        a.classList.toggle("ativo", ativo);
        if (ativo) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    }

    /* A barra fixa entra depois que o CTA do hero sai da tela. */
    if (fixa && hero) {
      var limite = hero.offsetTop + hero.offsetHeight - 120;
      fixa.classList.toggle("visivel", y > limite);
    }

    if (total > 0) {
      var p = (y / total) * 100;
      marcos.forEach(function (m) {
        if (p >= m && !vistos[m]) { vistos[m] = true; track("scroll_depth", { profundidade: m }); }
      });
    }
    tick = false;
  }
  window.addEventListener("scroll", function () {
    if (!tick) { tick = true; requestAnimationFrame(aoRolar); }
  }, { passive: true });
  window.addEventListener("resize", aoRolar, { passive: true });
  aoRolar();

  iniciarMenu();
  iniciarContadores();
  iniciarRelatos();

  /* --- FAQ --- */
  document.querySelectorAll(".faq details").forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (!d.open) return;
      var s = d.querySelector("summary");
      track("faq_open", { pergunta: s ? s.textContent.trim().slice(0, 70) : "" });
    });
  });

  /* --- cookies + pixel --- */
  var CHAVE = "mr_cookies";
  var banner = document.getElementById("cookieBanner");
  var escolha = null;
  try { escolha = localStorage.getItem(CHAVE); } catch (e) {}

  if (CFG.modoPixel === "imediato") {
    carregarPixel();
    if (banner && !escolha) banner.classList.add("aberto");
  } else if (escolha === "aceito") {
    carregarPixel();
  } else if (banner && !escolha) {
    banner.classList.add("aberto");
  }
  pageViewUmaVez();

  function decidir(v) {
    try { localStorage.setItem(CHAVE, v); } catch (e) {}
    if (banner) banner.classList.remove("aberto");
    track("consentimento", { escolha: v }, true);
    if (v === "aceito") carregarPixel();
  }
  var bA = document.getElementById("ckAceitar"), bR = document.getElementById("ckRecusar");
  if (bA) bA.addEventListener("click", function () { decidir("aceito"); });
  if (bR) bR.addEventListener("click", function () { decidir("recusado"); });
}

/* ========================================================================
   6. Menu lateral (mobile) e contadores
   ======================================================================== */
var MENU = { aberto: false, btn: null, gaveta: null };

function abrirMenu() {
  if (!MENU.gaveta || MENU.aberto) return;
  MENU.aberto = true;
  MENU.gaveta.classList.add("aberta");
  MENU.gaveta.setAttribute("aria-hidden", "false");
  MENU.btn.setAttribute("aria-expanded", "true");
  document.body.classList.add("menu-aberto");
  track("menu_abrir", {}, true);
  /* foco no primeiro link depois que o painel fica visível */
  setTimeout(function () {
    var primeiro = MENU.gaveta.querySelector(".gaveta-links a");
    if (primeiro) primeiro.focus({ preventScroll: true });
  }, 60);
}

/* semFoco: ao navegar por um link, o foco não volta para o botão (a página
   está rolando até a seção escolhida). */
function fecharMenu(semFoco) {
  if (!MENU.aberto) return;
  MENU.aberto = false;
  MENU.gaveta.classList.remove("aberta");
  MENU.gaveta.setAttribute("aria-hidden", "true");
  MENU.btn.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-aberto");
  if (!semFoco) MENU.btn.focus({ preventScroll: true });
}

function iniciarMenu() {
  MENU.btn = document.getElementById("menuBtn");
  MENU.gaveta = document.getElementById("gaveta");
  if (!MENU.btn || !MENU.gaveta) return;

  MENU.btn.addEventListener("click", abrirMenu);
  MENU.gaveta.addEventListener("click", function (e) {
    if (e.target.closest("[data-fechar-menu]")) return fecharMenu();
    var link = e.target.closest('a[href^="#"]');
    if (link) {
      fecharMenu(true);
      track("menu_navegar", { origem: link.getAttribute("href").slice(1) }, true);
    }
  });

  /* Tab circula dentro do painel enquanto ele está aberto. */
  MENU.gaveta.addEventListener("keydown", function (e) {
    if (e.key !== "Tab" || !MENU.aberto) return;
    var focaveis = MENU.gaveta.querySelectorAll("a[href], button");
    var primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  });

  /* Se a tela crescer para desktop com o menu aberto, fecha. */
  window.addEventListener("resize", function () {
    if (MENU.aberto && window.innerWidth > 900) fecharMenu(true);
  }, { passive: true });
}

/* Números da faixa escura contam do zero quando aparecem. Sem script ou com
   movimento reduzido, o valor final já está no HTML. */
function iniciarContadores() {
  var nums = [].slice.call(document.querySelectorAll("[data-count]"));
  if (!nums.length || REDUZ || !("IntersectionObserver" in window)) return;

  function contar(el) {
    var alvo = +el.getAttribute("data-count"), t0 = 0, dur = 1400;
    function quadro(t) {
      if (!t0) t0 = t;
      var k = Math.min((t - t0) / dur, 1);
      el.textContent = Math.round(alvo * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(quadro);
    }
    requestAnimationFrame(quadro);
  }

  nums.forEach(function (n) { n.textContent = "0"; });
  var io = new IntersectionObserver(function (ents) {
    ents.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      contar(e.target);
    });
  }, { threshold: 0.6 });
  nums.forEach(function (n) { io.observe(n); });
}

/* ========================================================================
   7. Relatos — faixa contínua de mensagens
   ======================================================================== */
function iniciarRelatos() {
  var trilho = document.getElementById("relatosTrilho");
  var faixa  = document.getElementById("relatosFaixa");
  if (!trilho || !faixa) return;

  /* Clona o conjunto para o loop: quando a faixa anda uma "metade", volta ao
     início sem salto visível. Clones ficam fora da leitura de tela. */
  var msgs = [].slice.call(faixa.children);
  msgs.forEach(function (m, i) { m.style.setProperty("--i", i); });
  msgs.forEach(function (m) {
    var c = m.cloneNode(true);
    c.setAttribute("aria-hidden", "true");
    faixa.appendChild(c);
  });

  var VEL = 28;            // px por segundo na rolagem automática
  var meia = 0, x = 0, ultimo = 0;
  var visivel = false, visto = false, autoOk = false;
  var pausaHover = false, pausaAte = 0, arrasto = null, tween = null;

  if (!REDUZ) trilho.classList.add("anima");

  function medir() {
    var primeira = !meia;
    meia = faixa.scrollWidth / 2;
    if (primeira) {
      /* Começa com a primeira mensagem alinhada à margem do conteúdo. O que
         fica à esquerda é o fim do conjunto anterior — o loop é contínuo. */
      var ref = document.querySelector("#relatos .wrap");
      var margem = ref ? ref.getBoundingClientRect().left +
                         parseFloat(getComputedStyle(ref).paddingLeft) : 0;
      x = margem - meia;
    }
    aplicar();
  }

  function normaliza(v) {
    while (v <= -meia) v += meia;
    while (v > 0) v -= meia;
    return v;
  }

  function aplicar() {
    if (!meia) return;
    var n = normaliza(x);
    if (tween) { tween.de += n - x; tween.para += n - x; }
    x = n;
    faixa.style.transform = "translate3d(" + x.toFixed(2) + "px,0,0)";
  }

  function quadro(t) {
    var dt = ultimo ? Math.min((t - ultimo) / 1000, 0.05) : 0;
    ultimo = t;
    if (visivel && meia) {
      if (tween) {
        var k = Math.min((t - tween.t0) / 480, 1);
        x = tween.de + (tween.para - tween.de) * (1 - Math.pow(1 - k, 3));
        if (k === 1) tween = null;
      } else if (autoOk && !arrasto && !pausaHover && t > pausaAte) {
        x -= VEL * dt;
      }
      aplicar();
    }
    requestAnimationFrame(quadro);
  }

  /* Passo de uma mensagem para setas e teclado. */
  function deslizar(dir) {
    if (!meia) return;
    var passo = meia / msgs.length;
    var de = tween ? tween.para : x;
    tween = { de: x, para: de - dir * passo, t0: performance.now() };
    pausaAte = performance.now() + 4000;
  }

  /* Só começa quando aparece na tela: primeiro as mensagens "chegam", depois
     a faixa passa a rolar sozinha. Fora da tela, para. */
  function comecar() {
    if (visto) return;
    visto = true;
    trilho.classList.add("visto");
    setTimeout(function () { autoOk = !REDUZ; }, REDUZ ? 0 : msgs.length * 420 + 1400);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (ents) {
      visivel = ents[0].isIntersecting;
      if (visivel) comecar();
    }, { threshold: 0.3 }).observe(trilho);
  } else {
    visivel = true; comecar();
  }

  /* Mouse em cima pausa. Só mouse: no toque, o "hover" ficaria preso. */
  trilho.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") pausaHover = true; });
  trilho.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") pausaHover = false; });
  trilho.addEventListener("focusin",  function () { pausaHover = true; });
  trilho.addEventListener("focusout", function () { pausaHover = false; });

  /* Arrastar com dedo ou mouse. touch-action: pan-y no CSS deixa a rolagem
     vertical da página com o navegador e entrega o gesto lateral para cá. */
  trilho.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    arrasto = { x0: e.clientX, base: x, moveu: false };
    tween = null;
    trilho.classList.add("arrastando");
    try { trilho.setPointerCapture(e.pointerId); } catch (err) {}
  });
  trilho.addEventListener("pointermove", function (e) {
    if (!arrasto) return;
    var dx = e.clientX - arrasto.x0;
    if (!arrasto.moveu && Math.abs(dx) > 4) {
      arrasto.moveu = true;
      track("relatos_interacao", { origem: "arrastar" }, true);
    }
    x = arrasto.base + dx;
  });
  function soltar() {
    if (!arrasto) return;
    arrasto = null;
    trilho.classList.remove("arrastando");
    pausaAte = performance.now() + 2500;
  }
  trilho.addEventListener("pointerup", soltar);
  trilho.addEventListener("pointercancel", soltar);

  document.querySelectorAll("[data-relatos]").forEach(function (b) {
    b.addEventListener("click", function () {
      deslizar(+b.getAttribute("data-relatos"));
      track("relatos_interacao", { origem: "seta" }, true);
    });
  });
  trilho.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); deslizar(1); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); deslizar(-1); }
  });

  window.addEventListener("resize", function () { meia = faixa.scrollWidth / 2; aplicar(); },
                          { passive: true });
  medir();
  requestAnimationFrame(quadro);
}
