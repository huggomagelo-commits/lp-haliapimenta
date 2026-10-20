# LP Salário-Maternidade — Dra. Halia Georgete Lima Pimenta · OAB/MA 19.117

> Landing page de direct response, mobile first, com o quiz como ferramenta central de conversão
> e qualificação. Dados do cliente e pendências em `DADOS-CLIENTE.md` (fora do repositório).

Landing page de **direct response**, mobile first, com o quiz como ferramenta central de
conversão e qualificação.

| Arquivo | O que é |
|---|---|
| `index.html` | A página |
| `styles.css` | Estilos |
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

Repositório git já inicializado em `main`, com o primeiro commit pronto. O `.gitignore` deixa de
fora a documentação interna (`ESTRUTURA.md`, `COPY.md`, `DADOS-CLIENTE.md`, `DESIGN.md`), a pasta
`.claude/` e as cópias soltas das imagens na raiz. Vão para o servidor 10 arquivos, 268 KB.

**1.** Criar um repositório vazio no GitHub — sem README, sem .gitignore, sem licença.

**2.** Na pasta `D:\LP`:

```bash
git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPO.git
git push -u origin main
```

**3.** Na Vercel: *Add New → Project → Import Git Repository*. Framework **Other**, sem build
command, output directory na raiz. O `vercel.json` já cuida de cache e headers de segurança.

Sem build step — é HTML, CSS e JS estáticos.

---

## 1. Hierarquia

Reorganizada para conversão. A identidade visual não mudou.

```
Marquee → Header (só marca no mobile)
Hero .................. promessa + prazo + CTA        ← dobra
Duplo benefício ....... por que pode haver dois
Depoimentos ........... 4 relatos reais de clientes
Como funciona ......... 3 passos
A advogada ............ Dra. Halia + provas curtas
Dúvidas ............... 7 objeções
CTA final
Rodapé
[ Barra fixa de CTA — mobile, entra ao sair do hero ]
```

**Saiu:** "Quem tem direito" (os painéis viraram o próprio quiz), "Por que deixam de receber",
"Pedido negado" como seção (virou ramo do quiz + FAQ), "Por que contar com a gente" (virou lista
curta dentro de "A advogada"). FAQ de 11 para 7. Passos de 4 para 3.

**Entrou:** barra fixa de CTA no mobile, chips de prova no hero, tela de análise no quiz.

---

## 2. O quiz

**Sem número fixo de perguntas.** O fluxo ramifica, então a página promete
*"leva menos de 1 minuto"* e o progresso aparece como **"Análise 45% concluída"**.

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

São **3 ou 4 perguntas** conforme o caminho. As duas perguntas extras não existem por volume:

- **"Para quando é o parto?"** segmenta urgência. Resposta "neste mês" marca o lead como
  prioritário na tela final e no evento `qualified`.
- **"Tem a carta de negativa?"** define se a Dra. Halia consegue ler o motivo real da recusa já na
  primeira conversa.

**UX implementada:** uma pergunta por tela · cards de 68px no mobile · avanço automático no
clique · nenhum dropdown · nenhum campo de digitação · botão Voltar com histórico real ·
transição de 260ms entre telas · modal em `100dvh` (não quebra com a barra do navegador).

### A tela "Analisando"

Três checagens aparecem em sequência antes do resultado (~1,7s). Não é enfeite: os itens
descrevem a avaliação que de fato acontece com as respostas — prazo de 5 anos, vínculo,
qualidade de segurada. Separa `quiz_complete` de `qualified` e aumenta o valor percebido da
resposta que vem depois.

---

## 3. UTM

Capturados de `utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, gclid,
ttclid`. Persistem em `sessionStorage`, sobrevivem à ida e volta da Política de Privacidade e
são propagados nos links internos.

**Se a URL traz qualquer parâmetro de campanha, o conjunto é substituído — não mesclado.**
Mesclar fazia o `utm_content` de um anúncio antigo vazar para a atribuição do anúncio atual.
Foi um bug real, pego no teste.

### ⚠️ A UTM precisa estar na URL do anúncio

**Chrome, Brave, Firefox e Safari apagam o `fbclid` da URL antes da página carregar.** Testado
na própria LP: enviando `?fbclid=ABC123&teste=xyz`, o que chega é `?teste=xyz`.

Se o anúncio mandar só o `fbclid`, não chega nada — e o navegador in-app do Instagram
normalmente também não envia referrer. Sem UTM explícita, tráfego pago vira "sem origem".

**Por isso a URL do anúncio precisa carregar as UTMs**, sempre.

### Dedução de origem quando falta UTM

Quando `utm_source` não vem na URL, a origem é deduzida em cascata:

| Situação | Resultado |
|---|---|
| Navegador in-app do Instagram (user agent) | `instagram / social_inapp` |
| Navegador in-app do Facebook (`FBAN`, `FBAV`) | `facebook / social_inapp` |
| `fbclid` sobreviveu | `facebook / paid_sem_utm` |
| `gclid` presente | `google / paid_sem_utm` |
| Tem referrer | `<dominio> / referral` |
| Nada identificável | `desconhecido / desconhecido` |

A detecção por user agent é o que salva o caso mais comum: anúncio do Meta aberto no navegador
interno do app, sem fbclid e sem referrer.

**"desconhecido", não "direto".** Rotular de direto o que não se consegue identificar faz
tráfego pago parecer orgânico no relatório — é pior que admitir a ignorância.

### ⚠️ A origem aparece na mensagem do WhatsApp

A última linha da mensagem fica assim:

```
Origem: facebook / maternidade-frio / mulheres-25-40 / criativo-dobro
```

É o que permite atribuir a conversa a um anúncio. **Mas a lead lê isso.** Se as campanhas se
chamarem `frio-dor-medo-v3`, ela vê. Duas opções:

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

`CFG.pixelId` no `script.js` — Pixel **1887940685517084**. Todo evento vai para o
`dataLayer` (GTM) e para o `fbq` (Pixel).

### Eventos que você pediu

| Evento | Quando | Parâmetros |
|---|---|---|
| `page_view` | Carregamento | — |
| `quiz_start` | Abertura do quiz | `origem` (qual CTA) |
| `quiz_step` | Cada resposta | `etapa`, `pergunta`, `resposta` |
| `quiz_complete` | Fim da análise | `etapas` |
| `qualified` | Resultado positivo | `perfil`, `vinculo`, `urgente` |
| `unqualified` | Tela de saída | `motivo` |
| `whatsapp_click` | Clique no WhatsApp | `origem`, `perfil` |
| `instagram_redirect` | Clique numa saída | `motivo` |
| `quiz_restart` | "Refazer" | `etapa` |

### Eventos que eu adicionei

| Evento | Por quê |
|---|---|
| **`quiz_abandon`** | **O mais importante da lista.** Dispara ao fechar o quiz sem concluir, com `etapa` e `progresso`. É o que mostra em qual pergunta o funil vaza. Sem ele, abandono e "nunca abriu" ficam indistinguíveis. |
| `cta_click` | `origem` do botão que abriu o quiz (hero, barra_fixa, faq…). Diz qual seção vende. |
| `whatsapp_bypass` | Clique no "prefiro falar direto". Se passar de ~25% dos cliques de WhatsApp, o quiz está pesado demais. |
| `scroll_depth` | 25/50/75/100% |
| `faq_open` | Qual objeção a pessoa abriu |
| `consentimento` | Aceite ou recusa de cookies |

Todos carregam `utm_source`, `utm_campaign` e `utm_content` junto.

### Eventos padrão do Meta

`whatsapp_click → Lead` · `whatsapp_bypass → Lead` · `quiz_start → ViewContent`

**Otimize as campanhas para `Lead`**, não para PageView.

O `Lead` dispara **só quando a pessoa sai para o WhatsApp** — inclusive pelo atalho "prefiro
falar direto", que também é lead. Chegar na tela de resultado (`qualified`) não dispara Lead:
parte das pessoas para ali sem clicar, e contar isso como conversão ensinaria o Meta a otimizar
para o sinal errado.

### ⚠️ Consentimento vs. volume de eventos

`CFG.modoPixel = "consentimento"` (padrão): o Pixel só carrega após "Aceitar todos". É o que a
LGPD pede e o que a nossa própria Política de Privacidade promete — mas **perde os eventos de
quem recusa ou ignora o banner**, tipicamente 20–40%.

`"imediato"` dispara no carregamento. Mais dados, menos conformidade. A decisão é do cliente,
que é advogado. Deixei em `consentimento` porque é o padrão defensável.

Para recuperar o que o navegador bloqueia, o caminho é a **API de Conversões do Meta** (server
side). Não implementei: exige backend, e hoje o site é estático.

---

## 5. Urgência

Só urgência real. Nada de contador regressivo ou "últimas vagas" — em site de advogado isso é
risco de publicidade irregular além de queimar confiança.

- **Prescrição de 5 anos** — no hero, no quiz e no CTA final
- **Período de graça de 12 meses** — na FAQ
- **Parto neste mês** — o quiz marca prioridade quando a resposta indica
- **CTA final:** *"Cada mês que passa é um mês a menos dentro do prazo."*

---

## 6. Performance

- Fontes de **5 faces para 3** (DM Sans 400/700 + Playfair 600) — ~30KB a menos
- `preload` + carregamento não bloqueante das fontes
- `script.js` com `defer`
- Imagem com `width`/`height`, `loading="lazy"`, `decoding="async"` — **CLS zero**
- Scroll com `requestAnimationFrame` e listeners `passive`
- Reveal via `IntersectionObserver`, sem biblioteca
- Zero dependência externa além das fontes e do Pixel
- Animações em `transform`/`opacity` (compositor), nada de `width`/`top`
- `prefers-reduced-motion` desliga tudo

**Menu escondido no mobile.** Numa LP de tráfego pago, link de navegação é rota de fuga e custa
~45px da primeira dobra. O CTA do header também sai no mobile: era redundante com o do hero e
estourava a largura em 138px.

**O botão flutuante virou barra fixa.** Dois elementos flutuando competem por área de toque.

---

## 7. Verificado no navegador

Desktop 1534px e mobile 402/360px (via iframe — `resize_window` não funciona com a janela
maximizada).

**Quiz, todos os caminhos:** grávida (3 perguntas) · pós-parto (3) · pós-parto negado (4) ·
saída prazo · saída sem vínculo · saída antes da hora · Voltar · Refazer.

**Primeira dobra no mobile @402px:** header 63px · CTA em **328px**.

| | Antes | Depois |
|---|---|---|
| Header + marquee | 135px | 90px |
| Topo do CTA | 544px | 328px |

**Também conferido:** zero erro no console · zero overflow horizontal em 360 e 402 · modal em
387×844 sem quebrar viewport · opções com 68px de alvo · barra fixa some com o modal aberto ·
mensagem do WhatsApp montada nas 3 variações · eventos na ordem certa.

### Bugs pegos e corrigidos nesta rodada

1. **UTM mesclado em vez de substituído** — `utm_content` de campanha antiga vazava para a
   atribuição da campanha nova.
2. **Chips do hero acima do H1 no mobile** — sem `order` explícito, caíram em `order:0` e
   subiram na frente do título.
3. **Menu aparecendo no mobile** — a regra estava comentada mas nunca escrita.
4. **Header em duas linhas** — `flex-wrap:wrap` de `max-width:860px` vencia a minha regra por
   ordem de declaração.
5. **Overflow de 138px** — CTA do header não cabia em 402px com `nowrap`.
6. **Botão e nota lado a lado no hero** — faltava empilhar o `.cta-bloco`.

---

## 8. Antes de subir com tráfego

| # | Item | Trava? |
|---|---|---|
| 1 | **Autorização das 4 clientes** para publicar os depoimentos | 🔴 |
| 2 | Decidir `modoPixel`: consentimento ou imediato | 🔴 |
| 3 | E-mail profissional (o rodapé hoje tem só WhatsApp e Instagram) | 🟡 |
| 4 | Foto de estúdio da Dra. Halia (a atual é de evento, com crachá) | 🟡 |
| 5 | Logo em vetor (SVG) — a atual é PNG extraído de um post | 🟡 |
| 6 | Confirmar horário de atendimento (assumido 8h–18h) | 🟡 |
| 7 | Conferir nomes de campanha (aparecem na mensagem do WhatsApp) | 🟡 |
| 8 | Revisão dos Termos de Uso pela própria advogada | 🟡 |
| 9 | Alinhar R$ 6.000 da página com o valor usado nos criativos | 🟡 |

✅ Já resolvidos: WhatsApp, Instagram, Pixel (`1887940685517084`), razão social, CNPJ, endereço,
Termos de Uso, logo, foto e depoimentos.
