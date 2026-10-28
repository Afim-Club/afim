# Roadmap de monetização: planos, descontos Lightning e próximos passos

Status: proposta (2026-10-28). Versão em inglês (referência): [monetization.md](monetization.md).

## Objetivos

1. **Planos pagos.** O Afim continua gratuito para todos no diretório. Um plano pago para anunciantes (donos de perfis) destrava os recursos abaixo. O Afim cobra via Stripe (cartão) e Lightning.
2. **Descontos entre perfis Afim.** O anunciante oferece desconto a membros do Afim, opcionalmente só a quem compartilha certas afinidades.
3. **Desconto só ao pagar com Lightning.** O Afim calcula o valor com desconto e pede a fatura à carteira do próprio anunciante. O pagante pode dividir a conta: uma parte em Lightning (com desconto) e o resto em dinheiro, Pix ou cartão, pago direto ao anunciante.
4. **O Afim não é gateway de pagamento.** O dinheiro do cliente vai da carteira de quem paga para a carteira do anunciante. O Afim nunca guarda, roteia nem liquida esse dinheiro.

Também aprovados: avaliações após pagamento, recompensa por indicação no convite que já existe, cupons e campanhas por afinidade, painel do anunciante, selo de verificado e app instalável (PWA) com "perto de mim".

## Por que Lightning

É o principal argumento para o anunciante. A reforma tributária (EC 132/2023, LC 214/2025) traz o **split payment** para pagamentos eletrônicos como Pix e cartão, em fases a partir de 2026: o imposto (CBS/IBS) é separado na hora do pagamento e o vendedor recebe só o valor líquido, mesmo quando a venda dá prejuízo. Um pagamento Lightning chega inteiro ao anunciante, que continua pagando seus impostos normalmente, pela própria contabilidade. A oferta de desconto é como o anunciante divide esse ganho de caixa com os afins.

O Afim nunca apresenta Lightning como forma de não pagar imposto: os termos e a página de planos dizem que o anunciante continua responsável por todos os tributos da venda. Como e quando o split payment se aplica a cada caso deve ser confirmado com um contador.

**Parceiros integradores.** Quem não quiser depender de carteiras de terceiros pode ter o próprio nó Bitcoin e Lightning. Parceiros integradores (empresas de TI que montam e dão suporte a nós) aparecem no diretório como perfis `company` numa categoria "Integradores Bitcoin", e a página de planos e o formulário da Lightning Address apontam para eles. Não precisa de modelo de dados novo; selo de parceiro ou acordo de indicação podem vir depois.

## Planos

Dois planos para começar (KISS). Preços em aberto (ver o final).

| Chave do recurso | Grátis | Pago |
| --- | --- | --- |
| Perfil no diretório, afinidades, mapa, páginas por lugar | sim | sim |
| `lightningOffers`: ofertas de desconto Lightning e página de pagamento | | sim |
| `affinityCampaigns`: ofertas por afinidade, com datas e cupom | | sim |
| `dashboard`: visitas, cliques, pagamentos e desconto concedido | | sim |
| `verifiedBadge`: verificação de documento e selo | | sim |
| `reviewReplies`: responder avaliações | | sim |

Membros (pessoas buscando afins) nunca pagam. Pagar uma conta com desconto, avaliar e convidar são gratuitos.

### Modelo de dados (Strapi)

`plan` (collection, `find`/`findOne` públicos, lida pela página de planos do site público): `name`, `slug` (a linha `free` existe com preço 0), `description`, `priceMonthlyBrl`, `priceYearlyBrl`, `priceMonthlySats` (opcional; vazio = converte do BRL), `features` (json, lista de chaves da tabela), `highlights` (json, frases do card), `featured`, `active`, `sortOrder`, `stripePriceIdMonthly`/`stripePriceIdYearly` (privados).

`subscription` (collection privada, só via `/api/members/me/subscription`): `member` (o plano é do membro e vale para todos os perfis dele), `plan`, `provider` (`stripe`, `lightning`, `gift`), `status` (`active`, `past_due`, `canceled`, `expired`), `currentPeriodEnd` (a única data que decide o acesso), `stripeCustomerId`, `stripeSubscriptionId`.

**Regra de acesso**, num único helper (`cms/src/lib/entitlements.ts`): um perfil tem o recurso X quando o `owner` tem assinatura `active` ou `past_due`, com `currentPeriodEnd` no futuro, num plano cujo `features` contém X. Quando o plano vence, os dados ficam guardados mas ocultos, e voltam na renovação.

### Cobrança com Stripe

- `POST /api/members/me/subscription/checkout {plan, interval}` cria uma Checkout Session (modo `subscription`); `POST .../portal` abre o Customer Portal (trocar cartão, cancelar). Nenhum dado de cartão passa pelo Afim.
- `POST /api/billing/stripe/webhook` (público, validado pela assinatura do Stripe, que exige o corpo cru) trata `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` e `invoice.payment_failed`.
- Página `/conta/plano`. Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

### Cobrança com Lightning (receita do próprio Afim)

Aqui o Afim é quem recebe, como qualquer loja, então precisa da própria carteira. Proposta: **BTCPay Server** auto-hospedado (open source, roda no Swarm).

- Planos Lightning são **pré-pagos** (1 ou 12 meses), com lembrete de renovação, já que Lightning não tem cobrança recorrente.
- `POST /api/members/me/subscription/lightning {plan, months}` cria a fatura no BTCPay; o webhook `InvoiceSettled` estende `currentPeriodEnd`.
- Env: `BTCPAY_URL`, `BTCPAY_STORE_ID`, `BTCPAY_API_KEY`, `BTCPAY_WEBHOOK_SECRET`.

## Descontos Lightning entre afins

### Modelo de dados

- `profile.lightningAddress` (público): Lightning Address do anunciante (`nome@dominio`, LUD-16) ou link LNURL-pay, validado ao salvar. Editado pelo dono sem nova moderação.
- `offer` (collection gerida pelo dono; leitura pública só das ofertas ativas de perfis com o plano): `profile`, `title`, `percent` (1 a 50), `maxDiscountBrl`, `minAmountBrl`, `audience` (`members` ou `affinities`), `affinities` (sem pautas políticas, mesma regra dos perfis), `startsAt`/`endsAt`, `code` (cupom), `active`.

O desconto é sempre para membros logados: "entre perfis Afim" significa que quem paga é membro. O visitante vê a oferta e é convidado a entrar.

### Fluxo de pagamento

1. `POST /api/payments/quote {profile, billBrl, lightningBrl, code?}` (autenticado). O servidor acha as ofertas válidas (ativa, datas, mínimo, cupom e, para `affinities`, interseção com as afinidades do membro lidas no servidor) e escolhe a de maior desconto. Ofertas não se somam.
2. Conta, só sobre a parte Lightning: `desconto = min(lightningBrl × percent, maxDiscountBrl)`; `pagarLightning = lightningBrl − desconto`; `pagarOutro = billBrl − lightningBrl`. Exemplo: conta de R$ 200, R$ 120 em Lightning, 10% → R$ 108 em Lightning, R$ 80 em Pix/dinheiro, R$ 12 de economia.
3. Converte para sats com a cotação BRL/BTC (cache de 60 s, fonte em `BTC_RATE_URL`). A cotação vale 5 minutos.
4. Resolve a Lightning Address (LUD-16 → callback LUD-06) com o valor em millisats e recebe uma fatura BOLT11 **da carteira do anunciante**. O Afim só mostra o QR code e o link `lightning:`.
5. Confirmação: se a carteira suporta LUD-21 (URL `verify`), a página consulta e marca como `paid`; senão o anunciante confirma no painel. A parte em Pix/dinheiro nunca passa pelo Afim.

`payment` (collection privada; o pagante vê os seus, o anunciante vê os do perfil sem a identidade do pagante): `profile`, `offer`, `payer` (privado), `billBrl`, `lightningBrl`, `discountBrl`, `amountSats`, `rateBrlPerBtc`, `invoiceHash`, `verifyUrl`, `status` (`pending`, `paid`, `expired`).

## Avaliações

`review`: `profile`, `payment` (uma por pagamento confirmado), `author` (privado), `rating` 1 a 5, `text`, `showName` (padrão falso: aparece "Membro Afim"), `reply` (do dono, plano pago), `moderationStatus`. Média e avaliações ativas aparecem na página do perfil.

## Recompensa por indicação

Usa o convite existente (`inviteCode`, `invitedBy`). Quando o convidado paga a primeira assinatura, quem convidou ganha **um mês grátis** (assinatura `gift` ou um mês somado ao período atual), uma vez por convidado. Pagar em sats ficou de fora de propósito: o Afim passaria a enviar dinheiro e precisaria de uma carteira com saldo.

## Cupons e campanhas

São linhas de `offer` com `audience = affinities`, datas e/ou `code`. Ex.: "15% em novembro para quem marcou Software livre". O anunciante nunca sabe quem tem qual afinidade: o cruzamento roda no servidor, como em `/matches`.

## Painel do anunciante

- `profile-stat` (privada): `profile`, `day`, `views`, `contactClicks`, `quotes`, `paidPayments`, `discountBrl`. Só contadores diários, sem IP, cookie ou identificador de visitante.
- `POST /api/profiles/:slug/hit {kind: view|click}` soma no dia (com limite por IP, como o cadastro), enviado com `navigator.sendBeacon`.
- Página `/conta/painel` com os últimos 30 dias. Números de público abaixo de 5 aparecem como "<5".

## Selo de verificado

`profile.verifiedAt` e `profile.verificationMethod` (`cnpj`, `professionalRegistry`, `manual`), definidos só no admin após checar uma fonte pública (consulta de CNPJ, conselho profissional). O Afim não guarda imagens de documentos. O selo só aparece enquanto o dono tem `verifiedBadge`.

## PWA e "perto de mim"

Manifest e service worker no `web/`. "Perto de mim" pede a localização ao navegador e ordena **no navegador**, com as coordenadas que já vêm no build. A localização do membro nunca é enviada ao Afim.

## LGPD, notas jurídicas e regulatórias

Não é parecer jurídico: um advogado deve revisar antes do lançamento, principalmente os itens 1 a 3.

1. **Não é gateway nem custódia.** O Afim nunca recebe, guarda ou repassa dinheiro de clientes: a fatura vem da carteira do anunciante e o pagamento vai para ela. A intenção é manter o Afim fora das regras de instituições de pagamento e de prestadores de serviços de ativos virtuais (Lei 14.478/2022 e normas do Banco Central). Receber sats pelos **próprios** planos é uma venda normal de serviço.
2. **Preço diferente por forma de pagamento** é permitido pela Lei 13.455/2017, e quem define o desconto é o anunciante. Os termos devem dizer que o anunciante responde pelo preço mostrado e pelos próprios documentos fiscais e impostos sobre a venda inteira.
3. **Receita do Afim em sats** é receita como outra qualquer: registrar em BRL na data do recebimento e verificar com o contador as obrigações de declarar cripto recebida (Receita Federal).
4. **Afinidades continuam sendo dado sensível.** O cruzamento das ofertas roda no servidor, o anunciante só vê contagens agregadas (mínimo 5) e nada das afinidades do membro vai para URLs, faturas (a descrição é só o nome do perfil e "Afim") ou o registro de pagamento.
5. **Pagamentos ligam um membro a um negócio.** `payment` e `review` são dados pessoais: o anunciante não vê quem pagou, avaliações são anônimas por padrão, apagar a conta apaga pagamentos e avaliações do membro, e pagamentos pendentes com mais de 30 dias são apagados.
6. **Stripe e BTCPay** são operadores: listar no aviso de privacidade. Dados de cartão ficam no Stripe.
7. **Localização** do "perto de mim" nunca sai do aparelho; a posição do perfil continua opcional e arredondada (cerca de 1 km).

## Marcos

Cada marco é um ou poucos PRs pequenos, nesta ordem:

1. **Planos + Stripe** (`plan`, `subscription`, helper de acesso, Checkout, webhook, Portal, `/conta/plano`; a página pública de planos lê `plan`).
2. **Lightning para os planos** (BTCPay, meses pré-pagos, lembrete).
3. **Descontos Lightning** (`lightningAddress`, `offer` para membros, cotação + fatura LNURL, pagamento dividido, checagem LUD-21).
4. **Avaliações.**
5. **Campanhas** por afinidade, datas e cupom.
6. **Painel.**
7. **Selo de verificado.**
8. **Recompensa por indicação.**
9. **PWA e perto de mim.**

## Perguntas em aberto

- Nome e preços do plano (mensal, anual, sats).
- BTCPay auto-hospedado (proposto) ou um provedor hospedado para a carteira do Afim.
- Fonte da cotação BRL/BTC.
- Avaliações ficam públicas (como texto anônimo) quando o autor apaga a conta, ou são removidas?
- O anunciante pode confirmar pagamentos quando a carteira não tem LUD-21 (proposto: sim)?
- Parceiros integradores: só uma categoria por enquanto, ou selo de parceiro e acordo de indicação?
