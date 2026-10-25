# LP Salário-Maternidade — Dra. Halia Georgete Lima Pimenta · OAB/MA 19.117

> Landing page de direct response, mobile first, com o quiz como ferramenta central de conversão
> e qualificação. Dados do cliente e pendências em `DADOS-CLIENTE.md` (fora do repositório).

No ar em **https://lp-haliapimenta.vercel.app** · repositório
`github.com/huggomagelo-commits/lp-haliapimenta` · deploy automático a cada push na `main`.

| Arquivo | O que é |
|---|---|
| `index.html` | A página |
| `styles.css` | Estilos (também usado pelas páginas legais) |
| `legal.css` | Tipografia de documento das páginas legais |
| `script.js` | Quiz, UTM, rastreamento, interações |
| `politica-privacidade.html` | Política de Privacidade (LGPD) |
| `termos-de-uso.html` | Termos de Uso |
| `vercel.json` | Cache e headers de segurança |
| `img/logo.png` | Brasão MP — header, rodapé e favicon |
| `img/halia.jpg` | Retrato da Dra. Halia — seção "A advogada" |

A documentação de projeto (`ESTRUTURA.md`, `COPY.md`, `DADOS-CLIENTE.md`, `DESIGN.md`) fica fora
do repositório por conter dados do cliente — está apenas na pasta local.

---

## Deploy

Sem build step — é HTML, CSS e JS estáticos. O `.gitignore` deixa de fora a documentação
interna, a pasta `.claude/` e as cópias soltas das imagens na raiz.

Na Vercel: projeto importado do GitHub, framework **Other**, sem build command, output na raiz.
Publicar é só `git commit` + `git push` na `main`.

### Onde o projeto é editado

| Máquina | Pasta | Observação |
|---|---|---|
| PC do escritório | `D:\LP` | Git e Python instalados; preview `lp` do `.claude/launch.json` |
| Notebook | `OneDrive\Área de Trabalho\design\summit\TNF\LP Halia` | **Sem Git e sem Python.** Preview `lp-notebook` (servidor em PowerShell, porta 8901). Para publicar daqui, instalar o Git: `winget install Git.Git` |

As duas pastas apontam para o mesmo repositório. **Antes de editar numa máquina, `git pull`** —
senão o push da outra conflita.

### Cache

Os arquivos têm nome fixo, sem build que gere hash. Cachear CSS e JS por tempo faz o HTML novo
encontrar o CSS antigo depois de um deploy, e a página quebra para quem já visitou. Por isso
`max-age=0, must-revalidate`: o navegador manda um condicional e recebe `304` quando nada mudou.
Imagens ficam em 1 dia, já que a foto e a logo ainda podem ser trocadas.

`cleanUrls: true` serve `politica-privacidade.html` em `/politica-privacidade`; os links internos
com `.html` são redirecionados e mantêm a query string (UTM).

> ⚠️ **O `vercel.json` não aceita propriedades fora do schema.** Uma chave `comment` dentro de
> `headers[]` faz a validação falhar e o deploy não acontece — silenciosamente, com check `0/1`
> no commit do GitHub e o site continuando no build anterior. JSON não tem comentários; a
> documentação das regras mora aqui.

---

## 1. Hierarquia

```
Header ................ marca + menu + CTA (no mobile, só a marca)
Hero .................. chamada + promessa (dois salários) + CTA + atalho WhatsApp   ← dobra
  faixa: base legal (Lei 8.213, arts. 71 a 73)
Quem tem direito ...... 6 situações em que a mãe se reconhece
  faixa: período de graça (art. 15)
Relatos ............... 4 depoimentos reais, faixa deslizante
O benefício ........... comparativo de 2 vias (CLT x contribuinte individual) + ressalva
Dúvida central ........ "Isso é legal? Posso ter algum problema?"
  faixa: prazo de 5 anos (art. 103)
Atendimento ........... 4 compromissos + 4 etapas
A advogada ............ retrato + texto + números (OAB, alcance, horário, atuação)
Dúvidas ............... 5 perguntas
Rodapé ................ navegação, contato, institucional, bloco legal
[ Barra fixa de CTA — mobile, entra ao sair do hero ]
```

Toda seção termina com o mesmo CTA, "Verificar minha situação", que abre o quiz. Cada botão tem
um `data-quiz` diferente, que vira o parâmetro `origem` no rastreamento.

O menu do header funciona também como **sitelinks** nos anúncios.

---

## 2. O quiz

**Sem número fixo de perguntas.** O fluxo ramifica — de 1 a 4 perguntas —, então a página promete
*"leva menos de um minuto"* e o progresso aparece como **"Análise 45% concluída"**.

```
Quando o bebê nasceu/vai nascer?            15%
├─ há mais de 5 anos      → saída: prazo
├─ ainda não engravidei   → saída: antes da hora
└─ grávida / <1 ano / 1-5 anos
   │
   Qual o seu vínculo?                      45%
   ├─ nunca contribuí     → saída: sem vínculo
   └─ CLT / MEI / doméstica / rural / graça
      │
      ├─ grávida → Para quando é o parto?   72%
      └─ já nasceu → Já pediu ao INSS?      72%
                     └─ negado → Tem a carta?  86%
      │
      Analisando suas respostas             92%
      Resultado                            100%
```

As perguntas extras não existem por volume:

- **"Para quando é o parto?"** segmenta urgência. Resposta "neste mês" mostra o aviso de
  prioridade na tela final e marca `urgente` no evento `qualified`.
- **"Tem a carta de negativa?"** define se a equipe consegue ler o motivo real da recusa já na
  primeira conversa.

As três saídas levam ao Instagram do escritório (`@m.p_advocacia`), que fala dos demais
benefícios do INSS.

**UX:** uma pergunta por tela · alvos de 64–66px · avanço automático no clique · nenhum dropdown
· nenhum campo de digitação · botão Voltar com histórico real · modal em `100dvh` no mobile.

### A tela "Analisando"

Três checagens aparecem em sequência antes do resultado (~1,7s). Os itens descrevem a avaliação
que de fato acontece com as respostas — prazo de 5 anos, vínculo, qualidade de segurada. Separa
`quiz_complete` de `qualified`.

### A mensagem do WhatsApp

O resultado monta a mensagem com as respostas, para que a equipe não precise perguntar de novo:

```
Olá! Vim pelo site e fiz a verificação.

Bebê: nasceu há menos de 1 ano
Na época: MEI, autônoma ou pagava por conta
INSS: pedi e foi negado
Carta de negativa: tenho a carta em mãos

Quero saber se tenho direito ao salário-maternidade.

Origem: facebook / nome-da-campanha / conjunto / anuncio
```

O horário mostrado abaixo do botão muda conforme o dia e a hora (seg–sex, 8h–18h, no relógio do
aparelho de quem acessa).

---

## 3. UTM

Capturados de `utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, gclid,
ttclid`. Persistem em `sessionStorage`, sobrevivem à ida e volta da Política de Privacidade e
são propagados nos links internos.

**Se a URL traz qualquer parâmetro de campanha, o conjunto é substituído — não mesclado.**
Mesclar fazia o `utm_content` de um anúncio antigo vazar para a atribuição do anúncio atual.

### ⚠️ A UTM precisa estar na URL do anúncio

**Chrome, Brave, Firefox e Safari apagam o `fbclid` da URL antes da página carregar.** Se o
anúncio mandar só o `fbclid`, não chega nada — e o navegador in-app do Instagram normalmente
também não envia referrer.

### Dedução de origem quando falta UTM

| Situação | Resultado |
|---|---|
| Navegador in-app do Instagram (user agent) | `instagram / social_inapp` |
| Navegador in-app do Facebook (`FBAN`, `FBAV`) | `facebook / social_inapp` |
| `fbclid` sobreviveu | `facebook / paid_sem_utm` |
| `gclid` presente | `google / paid_sem_utm` |
| Tem referrer | `<dominio> / referral` |
| Nada identificável | `desconhecido / desconhecido` |

**"desconhecido", não "direto".** Rotular de direto o que não se consegue identificar faz
tráfego pago parecer orgânico no relatório.

### ⚠️ A origem aparece na mensagem do WhatsApp

É o que permite atribuir a conversa a um anúncio. **Mas a lead lê isso.** Duas opções:

1. Nomear campanhas de forma apresentável — recomendado
2. `CFG.origemNaMensagem = false` no `script.js`, e atribuir só pelo Pixel

**Sugestão de URL no anúncio:**
```
?utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}
&utm_term={{adset.name}}&utm_content={{ad.name}}
```

Anúncio pode abrir o quiz direto com `?quiz=1` ou `#quiz`.

---

## 4. Rastreamento

`CFG.pixelId` no `script.js` — Pixel **1887940685517084**. Todo evento vai para o `dataLayer`
com todos os parâmetros, e para o `fbq` (Pixel) **só com parâmetros de funil**.

### O que o Meta recebe — e o que não recebe

O `track()` filtra os parâmetros antes de chamar o `fbq`. Passam só:

`etapa` · `etapas` · `progresso` · `origem` · `profundidade` · `utm_source` · `utm_campaign` · `utm_content`

**Nunca vão para o Meta:** a resposta de cada pergunta, o perfil (gestante/pós-parto), o vínculo,
o motivo da saída e a pergunta do FAQ aberta. São dado de saúde ou permitem inferi-lo:

- a Política de Privacidade promete que o conteúdo das respostas não sai do navegador;
- o Meta restringe Pixels que recebem informação de saúde, o que pode limitar a otimização da
  campanha ou a conta de anúncios.

O detalhe completo continua no `dataLayer`. Hoje não há GTM instalado, então ele não sai do
navegador. **Se um dia instalar GTM, não repassar esses campos para o Meta nem para outra
ferramenta.** Ao criar um parâmetro novo de evento, ele só chega ao Pixel se for incluído na
lista `PERMITIDOS`.

### Eventos

| Evento | Quando | Parâmetros no dataLayer | Vai ao Meta com |
|---|---|---|---|
| `page_view` | Carregamento | — | — (Pixel manda `PageView`) |
| `cta_click` | Clique num CTA do quiz | `origem` | `origem` |
| `quiz_start` | Abertura do quiz | `origem` | `origem` |
| `quiz_step` | Cada resposta | `etapa`, `pergunta`, `resposta` | `etapa` |
| `quiz_complete` | Fim da análise | `etapas` | `etapas` |
| `quiz_abandon` | Fechar o quiz sem concluir | `etapa`, `progresso` | `etapa`, `progresso` |
| `qualified` | Resultado positivo | `perfil`, `vinculo`, `urgente` | — |
| `unqualified` | Tela de saída | `motivo` | — |
| `whatsapp_click` | Clique no WhatsApp | `origem`, `perfil` | `origem` |
| `whatsapp_bypass` | "Falar no WhatsApp" do hero, sem quiz | `origem` | `origem` |
| `instagram_redirect` | Clique numa saída | `motivo` | — |
| `quiz_restart` | "Refazer" | `etapa` | `etapa` |
| `scroll_depth` | 25/50/75/100% | `profundidade` | `profundidade` |
| `faq_open` | Abrir uma pergunta | `pergunta` | — |
| `consentimento` | Aceite ou recusa de cookies | `escolha` | só dataLayer |

Todos levam também `utm_source`, `utm_campaign` e `utm_content`.

**`quiz_abandon`** é o mais útil para otimizar: mostra em qual pergunta o funil vaza.
**`whatsapp_bypass`** acima de ~25% dos cliques de WhatsApp indica quiz pesado demais.

### Eventos padrão do Meta

`whatsapp_click → Lead` · `whatsapp_bypass → Lead` · `quiz_start → ViewContent`

**Otimize as campanhas para `Lead`**, não para PageView. O `Lead` dispara só quando a pessoa sai
para o WhatsApp. Chegar na tela de resultado (`qualified`) não dispara Lead: parte das pessoas
para ali sem clicar.

### ⚠️ Consentimento vs. volume de eventos

`CFG.modoPixel = "consentimento"` (padrão): o Pixel só carrega após "Aceitar todos". É o que a
LGPD pede e o que a Política promete — mas **perde os eventos de quem recusa ou ignora o
banner**, tipicamente 20–40%. `"imediato"` dispara no carregamento: mais dados, menos
conformidade.

Para recuperar o que o navegador bloqueia, o caminho é a **API de Conversões do Meta** (server
side). Não implementada: exige backend, e o site é estático.

---

## 5. Urgência

Só urgência real. Nada de contador regressivo ou "últimas vagas" — em site de advogado isso é
risco de publicidade irregular além de queimar confiança.

- **Prazo de 5 anos** — na chamada do hero, na faixa do art. 103 e na saída "prazo" do quiz
- **Período de graça** — no card "grávida e desempregada" e na faixa do art. 15
- **Parto neste mês** — o quiz mostra o aviso de prioridade quando a resposta indica

---

## 6. Performance

- Duas famílias de fonte, quatro pesos (Cormorant Garamond 500/600 + DM Sans 400/700)
- `preload` + carregamento não bloqueante das fontes
- `script.js` com `defer`
- Imagem com `width`/`height`, `loading="lazy"`, `decoding="async"` — sem CLS
- Scroll com `requestAnimationFrame` e listeners `passive`
- Reveal via `IntersectionObserver`, sem biblioteca
- Zero dependência externa além das fontes e do Pixel
- `prefers-reduced-motion` desliga animações e transições

**Menu escondido no mobile.** Numa LP de tráfego pago, link de navegação é rota de fuga e custa
espaço na primeira dobra. O CTA do header também sai no mobile — a barra fixa cumpre o papel.

---

## 7. Verificação — 25/10/2026

Feita no site no ar e no preview local, desktop e mobile 375px.

**Quiz, todos os caminhos:** grávida · pós-parto · pós-parto negado · saída prazo · saída sem
vínculo · saída antes da hora · Voltar · Refazer · Fechar. Mensagem do WhatsApp conferida nas
três variações, inclusive o aviso de urgência.

**Também conferido:** zero erro no console · zero overflow horizontal em 375px · UTM capturada,
persistida e propagada para os links legais · Pixel recebendo só parâmetros permitidos (testado
com `fbq` simulado, sem enviar nada ao Meta) · páginas legais com o visual da LP e favicon.

### Correções desta rodada

1. **Pixel recebia as respostas do quiz** (resposta, perfil gestante, vínculo, motivo, FAQ).
   Agora só parâmetros de funil — ver seção 4.
2. **Política apontava para um e-mail inexistente** como canal da LGPD. Trocado pelo WhatsApp.
3. **Termos exibiam a nota interna "Revisão recomendada"** no site. Removida.
4. **Política e Termos diziam "três" / "três a quatro" perguntas.** Agora "até 4".
5. **Política citava Google Analytics, Tag Manager e Google Ads**, que não estão instalados.
   Removidos; a tabela de cookies lista só o que existe (essenciais + Meta Pixel).
6. **Páginas legais com o visual antigo** (Playfair, ouro claro, caixas arredondadas, Política
   sem favicon). Agora usam o `styles.css` da LP + `legal.css`.

---

## 8. Pendências

| # | Item | Trava? |
|---|---|---|
| 1 | Decidir `modoPixel`: consentimento ou imediato (padrão atual: consentimento) | 🟡 |
| 2 | Conferir nomes de campanha (aparecem na mensagem do WhatsApp) | 🟡 |
| 3 | Confirmar horário de atendimento (assumido seg–sex, 8h–18h) | 🟡 |
| 4 | E-mail profissional — opcional; hoje o canal de contato e da LGPD é o WhatsApp | 🟡 |
| 5 | Foto de estúdio da Dra. Halia (a atual é de evento, com crachá) | 🟡 |
| 6 | Logo em vetor (SVG) — a atual é PNG extraído de um post | 🟡 |
| 7 | Leitura final da Política e dos Termos pela própria advogada | 🟡 |

✅ Já resolvidos: WhatsApp, Instagram, Pixel, razão social, CNPJ, endereço, Termos de Uso, logo,
foto, depoimentos e **autorização das 4 clientes para publicação** (confirmada em 25/10/2026).
