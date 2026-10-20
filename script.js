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
      if (![].length && qs.toString()) {
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
  /* Lead só quando a pessoa efetivamente sai para o WhatsApp — inclusive pelo
     atalho "prefiro falar direto", que também é lead. Chegar na tela de
     resultado (qualified) não dispara Lead: muita gente para ali. */
  var PADRAO = {
    whatsapp_click:  "Lead",
    whatsapp_bypass: "Lead",
    quiz_start:      "ViewContent"
  };
  if (PADRAO[nome]) fbq("track", PADRAO[nome], p);
  fbq("trackCustom", nome, p);
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
      'junto na mensagem — você não precisa repetir nada.</p>' + urg +
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
    : "Fora do horário de atendimento. Pode mandar agora — a equipe responde no próximo dia útil, a partir das 8h.";
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
      track("cta_click", { origem: abre.getAttribute("data-quiz") });
      return qAbrir(abre.getAttribute("data-quiz"));
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
    if (hedge) return track("whatsapp_bypass", { origem: hedge.getAttribute("data-hedge") });

    var wa = alvo.closest('a[href*="wa.me"]');
    if (wa) return track("whatsapp_click", { origem: wa.closest("footer") ? "rodape" : "pagina" });
  });

  document.getElementById("sqFechar").addEventListener("click", qFechar);
  modal.addEventListener("click", function (e) { if (e.target === modal) qFechar(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && Q.aberto) qFechar();
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

  /* --- reveal com stagger --- */
  document.querySelectorAll(".reveal").forEach(function (bloco) {
    bloco.querySelectorAll(".via, .citacao, .etapa, .compromissos li")
      .forEach(function (fi, i) {
        fi.classList.add("reveal");
        fi.style.setProperty("--d", Math.min(i * 60, 260) + "ms");
      });
  });
  var alvos = document.querySelectorAll(".reveal");
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
  var marcos = [25, 50, 75, 100], vistos = {}, tick = false;

  function aoRolar() {
    var d = document.documentElement;
    var total = d.scrollHeight - d.clientHeight;
    var y = window.scrollY;

    if (topo) topo.classList.toggle("compacto", y > 60);

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
