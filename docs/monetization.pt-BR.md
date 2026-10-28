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
| `featuredListing`: card em destaque e listado primeiro | | sim |
| `cityFeatured`: pode comprar vagas de "Destaque na sua cidade" (cobrança extra) | | sim |

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

## Destaque, destaque na cidade e recomendados do Afim

Três coisas diferentes, separadas para o diretório continuar confiável:

- **Destaque** (`featuredListing`, no plano pago): o perfil pago tem card em destaque e aparece primeiro entre os perfis que **já combinam** com a página e o filtro de afinidades. Nunca faz um perfil aparecer onde ele não combina.
- **Destaque na sua cidade** (`cityFeatured`, adicional pago sobre o plano): uma faixa no topo da página da cidade, no máximo 3 vagas por página, por 30 dias. O card leva o selo "Destaque" para o visitante saber que é pago (transparência do CDC).
- **Recomendados do Afim na cidade** (grátis, nunca vendido): faixa escolhida pelo admin seguindo critérios: selo de verificado, pelo menos 5 avaliações com média 4,5 ou mais, ativo nos últimos 90 dias e sem moderação em aberto. Vender isso quebraria a confiança que as regras de avaliação constroem.

`city-highlight` (collection compartilhada com o site público, que lê só as linhas vigentes no build): `profile`, `uf`, `citySlug`, `kind` (`recommended` ou `paid`), `startsAt`, `endsAt`, `sortOrder`, mais `provider` (stripe|lightning) e `paymentRef` privados nas linhas pagas. Uma linha paga vale 30 dias e é criada quando o Checkout avulso do Stripe ou a fatura do BTCPay comprados em `/conta/plano` são pagos, só com plano ativo. Linhas `recommended` são criadas só pelo admin, seguindo os critérios acima, e nunca são vendidas.

O site é estático, então ordem de destaque, vagas e recomendados só mudam num novo build: um build agendado diário no Jenkins faz as vagas começarem e terminarem no dia certo.

## Pontos de Afinidade

Membros ganham **1 ponto por sat** pago em Lightning pelo Afim, e o anunciante pode dar um desconto maior em troca de pontos.

### O que dá para registrar com fidelidade

O Afim nunca toca no dinheiro, então só consegue contar pagamentos cuja fatura **o próprio Afim pediu** no fluxo acima. Um pagamento feito na loja com outro QR code é invisível para o Afim e não gera pontos. Dentro do fluxo, todo pagamento tem prova criptográfica:

1. **A fatura é conferida quando chega.** O Afim a buscou no callback LNURL do anunciante, então decodifica o BOLT11 e confere o valor igual à cotação, a validade e que o `payment_hash` nunca foi usado antes. O hash fica em `payment`.
2. **A prova de pagamento é o preimage.** Uma fatura Lightning só é paga quando a carteira de quem paga recebe um segredo (o preimage) cujo SHA-256 é o `payment_hash`. Ninguém consegue esse segredo sem o pagamento acontecer. O Afim o recebe de um de dois jeitos e confere `sha256(preimage) == payment_hash` antes de creditar:
   - **Da carteira de quem paga.** Se o navegador tem carteira WebLN (Alby e outras), a página chama `webln.sendPayment(fatura)`, que devolve o preimage. Senão, o membro cola o preimage dos detalhes do pagamento na carteira.
   - **Da carteira do anunciante.** A URL `verify` do LUD-21 devolve `settled` e o preimage.
3. **Sem preimage, sem pontos.** Pagamento confirmado só à mão pelo anunciante vale para avaliação e painel, mas não gera pontos: não há prova, e permitiria anunciante e membro inventarem pagamentos.

Os pontos contam sobre o **valor efetivamente pago em sats** (depois do desconto). A parte em Pix ou dinheiro não gera pontos.

### Extrato (ledger)

`point-entry` (collection privada, escrita só pelo servidor; sem rota de alterar ou apagar): `member`, `kind` (`earn`, `redeem`, `expire`, `reverse`), `points` (positivo no `earn`, negativo nos outros), `payment` (único no `earn`: um crédito por pagamento provado), `status` (`pending`, `available`; o `earn` fica `pending` por 7 dias), `prevHash` e `hash` (`hash = sha256(prevHash + campos)`, uma corrente por membro).

O saldo é a soma das entradas `available`. Nada é editado: um erro se corrige com uma entrada `reverse`. A corrente de hashes torna visível qualquer alteração no banco: um job diário confere todas e avisa o admin. Pontos vencem 12 meses depois de liberados.

### Seguro, idempotente e sempre verificável

- **Seguro:** um ponto só existe com um preimage que bate com o `payment_hash` da fatura; a fatura foi pedida pelo Afim e é assinada pelo nó Lightning do anunciante. Só o servidor escreve no extrato, numa única transação do banco.
- **Idempotente:** `point-entry` tem chave única em (`kind`, `payment_hash`), então o mesmo pagamento nunca é creditado duas vezes, não importa quantas vezes a carteira, a página ou a checagem LUD-21 o informem. O endpoint `POST /api/members/me/points/claim {paymentId, preimage}` devolve a entrada que já existe numa chamada repetida, em vez de erro, e o resgate usa o id da cotação do mesmo jeito.
- **Sempre verificável:** cada entrada `earn` guarda a fatura BOLT11 e o preimage (a descrição da fatura tem só o nome do perfil e "Afim", sem dado pessoal). Qualquer pessoa com eles confere a prova sem confiar no Afim: a assinatura da fatura mostra qual nó a emitiu e o valor, e `sha256(preimage) == payment_hash` mostra que foi paga. Em `/conta/pontos` o membro baixa o extrato com as provas, e a página as confere no navegador.
- **O histórico não pode ser reescrito em silêncio:** todo dia o Afim publica o `hash` final de cada corrente combinado numa raiz Merkle em `GET /api/points/roots/:dia`, e registra essa raiz na blockchain do Bitcoin com OpenTimestamps (grátis, sem carteira). O extrato baixado traz o caminho da corrente do membro até a raiz do dia, então ele prova que o saldo existia naquela data, até contra o Afim.

### Ancoragem diária em detalhe

Biblioteca: `javascript-opentimestamps` (npm `opentimestamps`), chamada por jobs agendados do Strapi. Sem carteira e sem taxa.

Nova collection `point-root` (leitura pública): `day` (data, única), `merkleRoot`, `leafCount`, `otsProof` (o arquivo `.ots` em base64), `status` (`pending`, `confirmed`), `bitcoinBlock` (altura do bloco, quando confirmado).

1. **Cada nova entrada estende a corrente do membro.** Ao gravar um `point-entry`, o servidor lê o último `hash` do membro (na mesma transação, com trava na linha) e grava `prevHash` e `hash = sha256(prevHash | id da corrente | kind | points | payment_hash | createdAt)`. A primeira entrada usa um `prevHash` fixo de zeros. O id da corrente é um id aleatório por membro, não o id do usuário.
2. **00:05 todo dia: monta a árvore.** Um job pega o `hash` final de cada corrente (só esses hashes, que não revelam nada sobre ninguém), ordena e monta uma árvore Merkle. A raiz vai para `point-root` com a data do dia anterior. Dia sem movimento também ganha raiz, para não haver buracos.
3. **Carimba a raiz.** O job chama `OpenTimestamps.stamp` com a raiz. A biblioteca envia para vários calendários públicos e recebe uma prova `.ots` pendente, salva em `otsProof` com `status = pending`. A raiz fica pública em `GET /api/points/roots/:dia`.
4. **De hora em hora: upgrade.** Um job chama `OpenTimestamps.upgrade` nas provas pendentes. Quando a transação dos calendários entra num bloco (em geral algumas horas), a prova ganha o caminho até esse bloco, e o job marca `status = confirmed` e `bitcoinBlock`. Calendário fora do ar é só tentado de novo; raiz pendente por mais de 48 horas avisa o admin.
5. **O membro confere.** Em `/conta/pontos` o membro baixa um JSON com as entradas dele (fatura, preimage, hashes), o caminho Merkle do hash final dele até a raiz de cada dia e o `.ots` daquele dia. A página confere no navegador: cada preimage contra a fatura, a corrente da primeira entrada até a última, o caminho até a raiz publicada, e o `.ots` contra o Bitcoin (a biblioteca consulta o cabeçalho do bloco em exploradores públicos; qualquer pessoa também pode soltar a raiz e o `.ots` em opentimestamps.org, ou usar `ots verify` com o próprio nó).
6. **O que isso garante.** Depois que um dia é confirmado, o Afim não consegue alterar, remover ou antedatar nenhuma entrada daquele dia sem que o arquivo do membro deixe de bater com uma raiz que já está na blockchain do Bitcoin. Entradas mais novas que a última raiz ficam protegidas só pelo banco até o dia seguinte.

### Antifraude

O risco é anunciante e membro (ou a mesma pessoa nos dois papéis) pagarem um ao outro em círculo para acumular pontos, já que os sats voltam para eles.

- Sem pontos em pagamentos a um perfil do próprio pagante, ou cujo dono convidou o pagante.
- Limites: no máximo 100.000 pontos por membro por mês e 20.000 por membro por perfil por mês (valores a ajustar).
- `pending` por 7 dias antes do uso, para o admin poder estornar uma rajada suspeita.
- O admin vê os mesmos sinais das avaliações (idade da conta, convite em comum, pares que se repetem).

### Resgate

A `offer` ganha `pointsCost` e `pointsBonusPercent` opcionais: "use 5.000 pontos e ganhe mais 10%". Na cotação o membro escolhe usar pontos; o desconto extra vale sobre a parte Lightning e o total continua limitado a 50% e ao `maxDiscountBrl`. Os pontos só são debitados (`redeem`) quando aquele pagamento é provado; uma cotação vencida os libera.

Cada anunciante decide se aceita pontos e quanto valem na loja dele. O Afim não paga o anunciante pelos pontos: é um desconto que o anunciante escolhe dar a afins com histórico de pagar em Lightning. Oferecer resgate exige `lightningOffers` (plano pago); ganhar pontos é grátis para todo membro.

### Pontos não são dinheiro

Pontos não têm valor em dinheiro, não podem ser vendidos, transferidos nem convertidos em sats ou reais, e são só um direito a desconto oferecido pelo anunciante. Isso os mantém como programa de fidelidade, fora das regras de pagamento ou de ativos virtuais (confirmar na revisão jurídica). Os termos dizem que o Afim pode encerrar o programa com aviso prévio.

### LGPD

O extrato liga o membro aos negócios em que pagou, então é dado pessoal. O membro vê o próprio extrato em `/conta/pontos`; o anunciante vê só quantos pontos foram resgatados com ele, nunca por quem. Apagar a conta apaga o extrato e o saldo.

## Avaliações

`review`: `profile`, `payment` (uma por pagamento confirmado), `author` (privado), `rating` 1 a 5, `text`, `showName` (padrão falso: aparece "Membro Afim"), `reply` (do dono, plano pago), `moderationStatus`. Média e avaliações ativas aparecem na página do perfil.

### Separar avaliação verdadeira de ataque

O risco são avaliações falsas para prejudicar o negócio, de concorrentes ou de quem quer boicotá-lo por discordar de um posicionamento. Regras, da mais barata à mais manual:

1. **Só com compra paga.** A avaliação exige um pagamento `paid` confirmado pela carteira (LUD-21) ou pelo anunciante, acima de um mínimo (ex.: R$ 10), feito há no máximo 60 dias. Quem ataca precisa pagar ao negócio para avaliar, o que torna a campanha cara. Cada avaliação mostra "Pagamento confirmado".
2. **Uma voz por pessoa.** Uma avaliação por membro por perfil (um novo pagamento atualiza, não soma) e só contas com pelo menos 7 dias.
3. **Avalia-se o serviço, não as opiniões.** O formulário e os termos dizem que a avaliação é sobre o serviço recebido. Avaliações sobre crenças, política ou afinidades do negócio, ofensas ou dados pessoais são removidas na moderação. Isso também tira dado sensível do texto público.
4. **Direito de resposta antes de publicar.** Notas 1 e 2 ficam ocultas por 48 horas: o anunciante é avisado e pode responder ou denunciar. Depois são publicadas com a resposta ao lado. A denúncia sozinha não esconde a avaliação; quem decide é o admin.
5. **Freio de rajada.** Quando um perfil recebe muitas notas baixas em pouco tempo (ex.: 3 ou mais notas 1 ou 2 em 48 horas, acima do ritmo normal dele), as novas avaliações vão para moderação e o perfil mostra "Avaliações em análise". Isso segura um ataque coordenado enquanto é verificado.
6. **Sinais para o admin, nunca públicos.** Na fila de moderação o admin vê, por avaliação: idade da conta, valor pago, se a carteira confirmou o pagamento, se outros autores da rajada foram convidados pela mesma pessoa (`invitedBy`) e quantas avaliações o autor fez em outros perfis. As afinidades do membro nunca são usadas para julgar avaliações: seria um novo uso de dado sensível.
7. **Mostrar mais que a média.** O perfil mostra o número de avaliações e a distribuição de 1 a 5, não só a média, e a média só aparece a partir de 3 avaliações.

`review` ganha `heldUntil` (datetime), `reportReason` (texto, privado) e `reportedAt` (datetime, privado).

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
5. **Pagamentos ligam um membro a um negócio.** `payment` e `review` são dados pessoais: o anunciante não vê quem pagou e avaliações são anônimas por padrão. Quando o membro apaga a conta, o Afim apaga: o vínculo `payer` de cada pagamento dele (a linha fica sem ninguém ligado, para o histórico, o painel e os totais de desconto do anunciante continuarem certos), as avaliações dele (texto, nota e dados de denúncia; a média do perfil é recalculada) e tudo o que já é apagado hoje (membro, afinidades, usuário, sessões e perfis dele). Pagamentos pendentes com mais de 30 dias são apagados.
6. **Stripe e BTCPay** são operadores: listar no aviso de privacidade. Dados de cartão ficam no Stripe.
7. **Localização** do "perto de mim" nunca sai do aparelho; a posição do perfil continua opcional e arredondada (cerca de 1 km).

## Marcos

Cada marco é um ou poucos PRs pequenos, nesta ordem:

1. **Planos + Stripe** (`plan`, `subscription`, helper de acesso, Checkout, webhook, Portal, `/conta/plano`; a página pública de planos lê `plan`).
2. **Lightning para os planos** (BTCPay, meses pré-pagos, lembrete).
3. **Descontos Lightning** (`lightningAddress`, `offer` para membros, cotação + fatura LNURL, pagamento dividido, checagem LUD-21 e do preimage via WebLN).
4. **Avaliações.**
5. **Campanhas** por afinidade, datas e cupom.
6. **Painel.**
7. **Selo de verificado.**
8. **Recompensa por indicação.**
9. **PWA e perto de mim.**
10. **Destaque, destaque na cidade e recomendados.** A ordem de destaque pode sair junto com o marco 1; as vagas na cidade e os recomendados dependem de avaliações e do selo.
11. **Pontos de Afinidade.** Depois dos descontos (marco 3), que já guardam o hash e a prova de cada pagamento.

## Perguntas em aberto

- Nome e preços do plano (mensal, anual, sats).
- BTCPay auto-hospedado (proposto) ou um provedor hospedado para a carteira do Afim.
- Fonte da cotação BRL/BTC.
- O anunciante pode confirmar pagamentos quando a carteira não tem LUD-21 (proposto: sim)?
- Pontos de Afinidade: valores dos limites mensais, da carência e da validade.
- Preço e duração da vaga na cidade (ex.: por mês) e limite de vagas por página.
- Parceiros integradores: só uma categoria por enquanto, ou selo de parceiro e acordo de indicação?
