# PRD — BI de tráfego pago (Meta Ads + Google Ads)

Oct 21, 2026 · @Ultra-x-ti · revisado em Oct 22, 2026

## Situação atual

As Fases 0 a 2 (MVP) estão implementadas e a importação foi validada com relatórios reais do Meta e do Google. A próxima etapa é a **Fase 2.5 — acompanhamento e análises**, que só usa dados já importados e não depende das APIs (ver Requisitos funcionais, RF22 a RF29).

| Fase | Situação |
| --- | --- |
| 0 · Base (banco com RLS, login, clientes, empresas, contas) | Pronta |
| 1 · Importação por upload | Pronta e validada com relatórios reais |
| 2 · Dashboards Meta, Google e visão geral | Pronta; falta conferir o investimento contra as plataformas (portão da fase) |
| 2.5 · Acompanhamento e análises | Próxima |
| 3 · Coleta por API | Futura |

## Visão geral

Um painel web próprio para gestor de tráfego, hospedado na Vercel com banco no Supabase, que transforma relatórios exportados do Meta Ads e do Google Ads em dashboards separados por empresa.

No MVP não há integração por API: os dados entram pelo upload dos relatórios (CSV ou Excel) exportados de cada plataforma. O sistema lê o arquivo, identifica as colunas, grava no banco sem duplicar e atualiza os dashboards daquela empresa.

Os dados se organizam em dois níveis: o **cliente** é quem contrata o gestor, e cada cliente tem uma ou mais **empresas**. Cada empresa funciona como um espaço próprio, com suas contas de anúncios, seus relatórios importados e seus painéis. A coleta automática pelas APIs fica para uma fase posterior, aproveitando o mesmo banco.

## Objetivos e métricas de sucesso

O objetivo do MVP é que, a partir dos relatórios exportados, cada empresa tenha um dashboard de Meta Ads e um de Google Ads prontos para análise e apresentação.

**Objetivos**

- Cadastrar clientes e suas empresas e alternar entre as empresas, com os dados de cada uma isolados.
- Importar relatórios do Meta Ads e do Google Ads por upload, sem retrabalho em planilha.
- Guardar histórico próprio por empresa, acumulando as importações.
- Exibir dashboards de Meta Ads, de Google Ads e uma visão consolidada das duas plataformas por empresa.
- Comparar períodos (esta semana × anterior, este mês × anterior).
- Fase 2.5: acompanhar a competência de cada cliente, ser avisado de contas paradas e de criativos desgastados, e gerar a apresentação mensal direto do sistema.

**Métricas de sucesso**

| Métrica | Meta |
| --- | --- |
| Tempo para importar um relatório e ver o dashboard atualizado | < 1 min |
| Diferença entre o painel e a plataforma (investimento) | < 1% no mesmo período |
| Importações com erro de leitura | < 5% |
| Empresas acompanhadas no painel em vez de planilhas | todos os ativos |

## Usuário e casos de uso

O usuário é o gestor de tráfego, que acessa sozinho e administra vários clientes e suas empresas a partir de um único login.

| Caso de uso | Como o sistema atende |
| --- | --- |
| Trocar de empresa e ver só os dados dela | Seletor de empresa no topo, agrupado por cliente; tudo na tela passa a ser daquela empresa |
| Atualizar os dados depois de exportar os relatórios | Upload do arquivo na tela de importação da empresa |
| Ver investimento e resultados do Meta Ads no período | Dashboard Meta com cards, gráfico diário e tabela de campanhas |
| Ver investimento, conversões e CPA do Google Ads | Dashboard Google com cards, gráfico diário e tabela de campanhas |
| Comparar Meta e Google da mesma empresa | Visão consolidada com investimento e resultados por plataforma |
| Achar a campanha com melhor e pior custo por resultado | Tabelas ordenáveis por custo por resultado ou CPA |
| Mostrar os números para o cliente numa reunião | Dashboard limpo, com período e empresa visíveis, e exportação da tabela |
| Conferir o que já foi importado | Histórico de importações por empresa, com período e plataforma |

## Clientes e empresas

O sistema se organiza em dois níveis: **clientes** (quem contrata o gestor) e **empresas** (as marcas de cada cliente). A empresa é o espaço isolado: cada uma tem suas contas de anúncios, importações e dashboards, e o usuário troca entre elas como quem troca de conta num app.

Hoje há um cliente com duas empresas, cada uma com visualizações próprias. Os nomes "cliente" e "empresa" estão decididos para a interface.

**Usuários e papéis**

- Todo usuário tem um papel (role). No MVP só existe `admin`: o gestor, que cria e gerencia todos os clientes e empresas.
- A estrutura já prevê o papel `client`: um usuário do cliente com login próprio e acesso só de leitura às empresas liberadas para ele, a ser ativado numa fase futura.
- O acesso passa por uma tabela de vínculo entre usuário e empresa (`company_members`). Um mesmo usuário pode ter vínculo com várias empresas, como o dono das duas empresas do cliente atual, e a RLS já filtra por esse vínculo desde o MVP.

**Regras**

- O admin tem vários clientes; cada cliente tem uma ou mais empresas.
- Cliente: nome e status (ativo ou arquivado). Empresa: nome, logo opcional, cor de identificação e status.
- Uma empresa pode ter várias contas de anúncios do Meta e várias contas do Google Ads.
- Todo dado importado (relatórios, campanhas, métricas) fica ligado a uma empresa e a uma conta de anúncios.
- Ao trocar de empresa, todos os dashboards, filtros e importações passam a mostrar só os dados dela. Não há visão somando as empresas de um mesmo cliente: cada empresa é sempre analisada separadamente.
- O sistema lembra a última empresa aberta e volta nela no próximo acesso.
- Arquivar esconde da lista sem apagar os dados; excluir apaga tudo após confirmação, e excluir um cliente exclui suas empresas.

**Como isso fica na interface**

- Seletor de empresa no topo da tela, sempre visível, com as empresas agrupadas por cliente e busca.
- Tela inicial com os clientes e suas empresas, e um resumo rápido de cada empresa (investimento do mês por plataforma, data da última importação).
- Dentro da empresa: abas Visão geral, Meta Ads, Google Ads, Importações e Configurações.

## Requisitos funcionais

O MVP tem cinco blocos: clientes e empresas, importação, dashboard Meta Ads, dashboard Google Ads e visão consolidada.

**Clientes, empresas e contas**

- RF01: criar, editar, arquivar e excluir clientes e suas empresas.
- RF02: seletor de empresa no topo, agrupado por cliente, lembrando a última empresa aberta.
- RF03: cadastrar contas de anúncios por empresa (plataforma, nome, id da conta, moeda).

**Importação**

- RF04: upload de CSV ou Excel, escolhendo a plataforma (Meta ou Google); o sistema tenta detectar sozinho pelo cabeçalho.
- RF05: pré-visualização das primeiras linhas e do mapeamento de colunas antes de confirmar.
- RF06: aceitar números e datas no formato brasileiro (vírgula decimal, R$, dd/mm/aaaa) e no americano.
- RF07: gravar sem duplicar: reimportar o mesmo período substitui os dados daquele período e conta.
- RF08: transformar as colunas de resultados (mensagens, leads, compras, conversões) em métricas padronizadas.
- RF09: histórico de importações por empresa, com plataforma, período coberto, linhas lidas e erros; permitir desfazer uma importação.
- RF10: salvar o mapeamento de colunas por empresa, para a próxima importação ser automática.

**Dashboard Meta Ads**

- RF11: cards de investimento, alcance, impressões, cliques, CTR, CPM e as métricas principais do tipo de campanha, com variação contra o período anterior.
- RF12: gráfico diário de investimento × resultados.
- RF13: tabelas de campanhas, conjuntos e anúncios, ordenáveis, com navegação de campanha para conjunto e anúncio.
- RF14: classificar cada campanha por tipo (mensagens, visitas ao perfil etc.), detectado automaticamente e ajustável à mão; os cards e tabelas mostram as métricas daquele tipo (ver Resultados por tipo de campanha).

**Dashboard Google Ads**

- RF15: cards de investimento, impressões, cliques, CTR, CPC médio, ações locais (rotas, ligações, cliques no site) e custo por ação local.
- RF16: gráfico diário de investimento × ações locais.
- RF17: tabela de campanhas e grupos de anúncios, ordenável.

**Visão consolidada e geral**

- RF18: visão da empresa com investimento e resultados somados e separados por plataforma.
- RF19: filtros de período (predefinidos e personalizado) e de conta de anúncios em todas as telas.
- RF20: exportar a tabela visível em CSV.
- RF21: login com Supabase Auth e papel por usuário (só admin no MVP).

**Fase 2.5 — acompanhamento e análises (só com dados importados)**

Estes requisitos vieram do uso real do sistema na preparação das reuniões de outubro/2026 e de uma pesquisa em ferramentas do mercado (Reportei, mLabs Analytics, Swydo, AgencyAnalytics, Optmyzr, Madgicx). Nenhum depende das APIs.

- RF22: **competência por empresa**: cada empresa define o dia em que começa o seu ciclo (ex.: dia 21, para fechar de 21 a 20). Os filtros ganham "Competência atual" e "Competência anterior", e a comparação usa a competência anterior com o mesmo número de dias corridos.
- RF23: **alertas**, na tela inicial e no topo da empresa:
  - conta sem investimento há N dias seguidos (padrão: 3), quando ela já teve veiculação antes;
  - importação atrasada: o último dia importado de uma conta está há mais de N dias (padrão: 7);
  - possível desgaste de criativo (RF26).
- RF24: **análise por dia da semana**: investimento, resultado principal e custo por resultado agregados por dia da semana no período, em tabela ou mapa de calor, destacando os dias sem veiculação (ex.: conta que só roda de segunda a sábado).
- RF25: **alcance correto**: importação opcional de um relatório de alcance do período, exportado sem o detalhamento por dia, guardado à parte das métricas diárias. Quando existir um relatório para exatamente o período e o nível exibidos, os cards mostram o alcance e a frequência reais; nos demais casos continuam mostrando impressões.
- RF26: **frequência e alerta de desgaste**: por anúncio, a frequência diária (impressões ÷ alcance do dia) e a comparação dos últimos 7 dias com os 7 anteriores. O anúncio é marcado como "possível desgaste" quando o CTR cai 20% ou mais com a frequência subindo, ou quando o custo por resultado sobe 20% ou mais. Os limites ficam configuráveis por empresa.
- RF27: **ranking de criativos**: tabela de anúncios do período com investimento, resultado do tipo da campanha, custo por resultado, CTR e frequência média, ordenável, com os 5 melhores e os 5 piores em destaque e o selo de desgaste do RF26. Anúncios com investimento abaixo de um mínimo (padrão: R$ 10) ficam fora do ranking, para não distorcer.
- RF28: **anotações na linha do tempo**: registrar eventos por empresa, com data ou intervalo e, opcionalmente, plataforma ou campanha (promoção, novo criativo, pausa, feriado, loja fechada). Aparecem como marcadores nos gráficos diários e na apresentação.
- RF29: **apresentação gerada pelo sistema**: para uma empresa e uma competência, gerar a apresentação de reunião no formato usado em outubro/2026:
  - abertura e "como ler os números";
  - competência: resumo, detalhes por tipo de campanha, semana a semana e comparação com a anterior;
  - panorama: total, mês a mês e ranking de criativos;
  - anotações do período e próximos passos.

  Cada seção aceita um comentário do gestor antes de exportar, há notas do apresentador e a exportação é em PDF. O link pode ser compartilhado com o cliente em modo leitura.

## Resultados por tipo de campanha

O dashboard não usa um "resultado" único: cada tipo de campanha tem suas métricas principais, e campanhas de mensagem para o WhatsApp não exibem resultado.

| Plataforma · tipo de campanha | Métrica principal | Métricas de apoio | Observação |
| --- | --- | --- | --- |
| Meta · Mensagens para o WhatsApp | Nenhuma (sem custo por resultado) | Investimento, alcance, impressões, CPM, cliques no link, CTR, CPC | As conversas iniciadas que o Meta reporta não batem com a realidade; ficam fora dos cards e dos rankings |
| Meta · Visitas ao perfil | Visitas ao perfil do Instagram e custo por visita | Seguidores do Instagram e custo por seguidor, CTR, CPM | Seguidores vêm da coluna própria do Gerenciador, se disponível na conta ([fonte](https://ppc.land/meta-introduces-instagram-follows-metric-for-ads-reporting/)) |
| Google · Perfil da Empresa | Ações locais (soma) e custo por ação | Rotas, ligações, cliques no site, outras interações | Ficam em "Todas as conversões", e não em "Conversões"; o detalhe por tipo exige segmentar por ação de conversão ([fonte](https://support.google.com/google-ads/answer/9013908)) |

O tipo de cada campanha é detectado pelo indicador de resultados do relatório e pode ser ajustado à mão. Novos tipos (leads, vendas) entram como novas linhas nesta tabela, sem mudar a estrutura.

## Requisitos não funcionais

O sistema deve rodar nos planos gratuitos da Vercel e do Supabase enquanto o volume for pequeno, com os dados de cada empresa isolados no próprio banco.

**Segurança e isolamento**

- RNF01: Row Level Security (RLS) em todas as tabelas, filtrando pelas empresas a que o usuário está vinculado; ninguém vê dados de uma empresa sem vínculo com ela.
- RNF02: toda consulta e toda importação filtram pela empresa selecionada, também no servidor, não só na interface.
- RNF03: arquivos enviados guardados no Supabase Storage em pasta por usuário e empresa, privados.

**Importação**

- RNF04: arquivos de até 10 MB processados sem travar a tela, com barra de progresso.
- RNF05: importação atômica: se falhar no meio, nada é gravado.
- RNF06: mensagens de erro em português dizendo qual linha ou coluna deu problema.

**Desempenho e custos**

- RNF07: dashboards consultam views agregadas, não as linhas brutas a cada clique; carregamento < 2 s.
- RNF08: taxas (CTR, CPC, CPA, custo por resultado) recalculadas a partir das somas no período, nunca pela média das taxas diárias.
- RNF09: verificar os limites dos planos gratuitos antes de começar: tamanho do banco e do Storage e pausa por inatividade no Supabase; duração de função na Vercel.

**Interface**

- RNF10: layout responsivo, utilizável no celular para consultas rápidas.
- RNF11: tema claro e escuro; gráficos legíveis para apresentar ao cliente.

## Arquitetura e fluxo de dados

Tudo roda em dois serviços: a Vercel hospeda a interface e a função de importação; o Supabase guarda os arquivos, os dados e cuida do login.

&#91;embedded content: arquitetura do MVP · importação por upload\]

Os dashboards nunca leem o arquivo enviado: só consultam as views do banco, sempre filtradas pela empresa aberta. Na fase de APIs, uma coleta automática passa a gravar nas mesmas tabelas, ao lado das importações.

## Importação de relatórios

Para a importação funcionar sempre, cada plataforma tem um relatório padrão salvo, exportado com detalhamento por dia e com as mesmas colunas toda vez.

**Relatório padrão por plataforma**

| Plataforma | Onde exportar | Detalhamento | Colunas mínimas (exemplos de nome na exportação em português) |
| --- | --- | --- | --- |
| Meta Ads | Gerenciador de Anúncios → Relatórios de anúncios | Por dia + nível anúncio (já traz conjunto e campanha) | Nome da campanha, Nome do conjunto de anúncios, Nome do anúncio, Dia, Valor usado (BRL), Impressões, Alcance, Cliques no link, Resultados, Indicador de resultados, Visitas ao perfil do Instagram, Seguidores do Instagram |
| Google Ads | Campanhas → Baixar, ou Relatórios → relatório personalizado | Por dia + grupo de anúncios (já traz a campanha) | Campanha, Grupo de anúncios, Dia, Custo, Impr., Cliques, Todas as conv. (segmentado por Ação de conversão) |

Os nomes exatos das colunas mudam com o idioma da conta e com as colunas escolhidas; por isso o sistema mapeia colunas por sinônimos e deixa o usuário corrigir na pré-visualização.

**Aprendizados com os relatórios reais (out/2026)**

- **Meta:** a exportação da conta usa "Valor gasto (BRL)", "Tipo de resultado" e "Seguidores no Instagram"; esses nomes estão nos sinônimos. Nos dias sem resultado, "Tipo de resultado" vem vazio, por isso o tipo da campanha é o que aparece nos outros dias do mesmo arquivo.
- **Google:** campanhas **Inteligentes** não têm grupo de anúncios no relatório. Nesse caso a linha é gravada no nível de campanha, e "Conversões" é aceito quando "Todas as conv." não existir.
- **Google, arquivo errado:** o download da página "Visão geral" (gráficos em .zip) não é o relatório de campanhas. O certo é Relatórios → Novo → Tabela, com linhas Campanha, Dia (e Grupo de anúncios e Ação de conversão quando houver) e colunas Custo, Impr., Cliques e Todas as conv.

**Nível do relatório no Meta**: o padrão é exportar no nível de anúncio, porque cada linha traz o anúncio, o conjunto e a campanha do dia, e o sistema soma para cima. Há dois caminhos no Gerenciador:

- Na aba **Anúncios**, selecionar o período, ativar o detalhamento por dia e usar **Exportar dados da tabela**.
- Em **Relatórios de anúncios**, montar o relatório com as linhas Nome da campanha, Nome do conjunto de anúncios, Nome do anúncio e Dia, e salvar como modelo para reutilizar.

**Etapas da importação**

1. O usuário escolhe a empresa, a conta de anúncios e envia o arquivo.
2. O sistema detecta a plataforma pelo cabeçalho e ignora linhas extras (título do relatório, período, linha de totais no fim, comuns na exportação do Google).
3. Mostra a pré-visualização com o mapeamento de colunas e o período encontrado.
4. Converte números e datas, valida (data válida, investimento ≥ 0) e lista as linhas com problema.
5. Ao confirmar, apaga os dados daquela conta no período do arquivo e grava os novos, numa única transação.
6. Registra a importação no histórico e atualiza os dashboards.

**Cuidados**

- Investimento sempre na moeda da conta; o cabeçalho "Valor usado (BRL)" indica a moeda.
- No Meta, "Resultados" muda de significado conforme o objetivo da campanha; a coluna "Indicador de resultados" diz qual é, e o sistema guarda os dois.
- Exportar com a mesma janela de atribuição sempre, para os números serem comparáveis entre importações.

**Alcance não soma**: o alcance é de pessoas únicas, então somar o alcance diário ou dos anúncios dá um número maior que o real. No dashboard, alcance e frequência aparecem só quando vierem de um relatório no mesmo nível e período exibidos; nos demais casos, o card mostra impressões.

## Modelo de dados no Supabase

Uma única tabela de métricas diárias serve às duas plataformas, e as tabelas de dados carregam `company_id` para o isolamento por empresa.

| Tabela | Conteúdo | Chave e vínculos |
| --- | --- | --- |
| `clients` | Clientes: nome, status, criado em | `id` |
| `companies` | Empresas: nome, logo, cor, status | `id` · `client_id` → `clients` |
| `ad_accounts` | Contas de anúncios: plataforma (`meta` ou `google`), id externo, nome, moeda | `id` · `company_id` → `companies` |
| `campaigns` | Campanhas vistas nas importações: nome, plataforma, tipo de campanha, id externo quando houver | `id` · `ad_account_id` → `ad_accounts` |
| `metrics_daily` | Uma linha por dia e campanha, conjunto ou anúncio: investimento, impressões, alcance, cliques, visitas ao perfil, seguidores, ações locais | `ad_account_id` + `level` + `object_key` + `date` |
| `imports` | Histórico: arquivo, plataforma, conta, período, linhas lidas, linhas com erro, status | `id` · `company_id` |
| `column_mappings` | Mapeamento salvo de colunas do arquivo para campos do sistema | `company_id` + `platform` |
| `user_settings` | Última empresa aberta e preferências | `user_id` |
| `metrics_staging` | Linhas de uma importação em andamento; `commit_import` move tudo para `metrics_daily` numa transação | `import_id` |

**Novas tabelas e colunas da Fase 2.5**

| Tabela | Conteúdo | Chave e vínculos |
| --- | --- | --- |
| `companies` (novas colunas) | `cycle_start_day` (dia de início da competência, 1 a 28) e `settings` (limites dos alertas e do desgaste, em JSON) | — |
| `reach_snapshots` | Alcance, impressões e frequência de um período inteiro, vindos de um relatório sem detalhamento por dia (RF25) | `ad_account_id` + `level` + `object_key` + `period_start` + `period_end` |
| `annotations` | Eventos da linha do tempo: data inicial e final, título, nota, plataforma e campanha opcionais (RF28) | `id` · `company_id` |
| `reports` | Apresentações geradas: empresa, competência, comentários por seção, próximos passos, data de geração (RF29) | `id` · `company_id` |

**Usuários e papéis**

| Tabela | Conteúdo | Chave e vínculos |
| --- | --- | --- |
| `profiles` | Dados do usuário: nome, `role` (`admin` no MVP; `client` no futuro) | `id` = id do usuário no Supabase Auth |
| `company_members` | Quem acessa cada empresa e com qual permissão (`owner` ou `viewer`); um usuário pode ter várias linhas, uma por empresa | `company_id` + `user_id` |

No MVP, ao criar uma empresa o sistema cria automaticamente o vínculo `owner` do gestor. Todas as políticas de RLS consultam `company_members`, então liberar o acesso de um usuário do cliente no futuro é só criar vínculos `viewer` com uma ou mais empresas.

**Views para os dashboards**

- `v_daily_by_platform`: totais por empresa, plataforma e dia.
- `v_daily_by_campaign_type`: totais por empresa, plataforma, tipo de campanha e dia. Os cards de resultado usam só as campanhas do tipo certo (ex.: custo por visita = investimento das campanhas de visitas ÷ visitas delas).
- `campaign_summary(empresa, de, até, conta)`: totais por campanha no período, com CTR, CPC, CPM e custos por resultado recalculados das somas. É uma função, e não uma view, porque precisa receber o período.

Todas as views e funções rodam com `security_invoker`, então respeitam a RLS de quem consulta. Como `commit_import` apaga todos os níveis da conta no período antes de gravar, cada conta e dia tem um único nível, e as somas podem considerar todas as linhas sem contar em dobro.

Com a chave por conta, nível, objeto e data, a fase de APIs pode gravar na mesma tabela `metrics_daily` sem mudar os dashboards.

## Skills e ferramentas para o desenvolvimento

O desenvolvimento é feito com um agente de código (Claude Code) apoiado em skills. As skills do projeto ficam versionadas em `.claude/skills/`; as gerais, na pasta do usuário.

| Skill | Para que serve neste projeto | Onde está |
| --- | --- | --- |
| [find-skills](https://skills.sh/vercel-labs/skills/find-skills) (Vercel Labs) | Buscar e instalar skills do ecossistema skills.sh conforme surgir a necessidade (ex.: Supabase, gráficos, parsing de CSV) | Instalada em `~/.claude/skills` |
| [web-design-guidelines](https://skills.sh/vercel-labs/agent-skills/web-design-guidelines) (Vercel Labs) | Revisar a interface contra boas práticas de UI e acessibilidade | Instalada no projeto |
| [vercel-react-best-practices](https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices) (Vercel Labs) | Padrões de desempenho e segurança em React e Next.js na Vercel | Instalada no projeto |
| [scroll-craft](https://github.com/nateherkai/scroll-craft) (Nate Herk, MIT) | Landing pages com rolagem animada. Não serve para os dashboards; fica para páginas de venda ou a página pública do serviço. A geração de imagens usa o kie.ai, que é pago | Instalada no projeto |
| skill-creator (Anthropic) | Criar uma skill própria do projeto, por exemplo com as regras de importação e o mapeamento de colunas do Meta e do Google | Já vem com o Claude Code (`anthropic-skills:skill-creator`) |
| dataviz (Anthropic) | Gráficos, cores e cards de métrica dos dashboards; usada na Fase 2 | Já vem com o Claude Code |
| frontend-design (Anthropic) | Direção visual dos dashboards | Não instalada |

**Primeira revisão com as skills (out/2026)**: com base na `vercel-react-best-practices` e na `web-design-guidelines`, as server actions passaram a conferir a sessão e validar os argumentos. Também foram corrigidos:

- o fuso das datas, que causava erro de hidratação;
- a injeção de fórmula no CSV exportado;
- o carregamento do Recharts, que passou a ser sob demanda;
- a acessibilidade: foco visível, link para pular ao conteúdo, seletor de empresa por teclado, telas de carregamento e de erro.

**Buscas sugeridas com a find-skills**

- `npx skills find supabase` (RLS, migrations, Auth)
- `npx skills find charts` ou `dashboard` (biblioteca de gráficos)
- `npx skills find shadcn` (componentes de interface)

A find-skills recomenda, mas não valida a qualidade das skills; vale olhar o código e o número de instalações antes de adotar cada uma ([fonte](https://claude-codex.fr/en/skills/find-skills/)).

**Stack sugerida**: Next.js (App Router) + TypeScript na Vercel, Supabase (Postgres, Auth, Storage), Tailwind + shadcn/ui, Recharts para gráficos e Papa Parse / SheetJS para ler CSV e Excel.

## Fases e roadmap

O MVP são as Fases 0 a 2; cada fase só começa quando o portão anterior é cumprido.

&#91;embedded content: roadmap · 4 fases, 3 portões\]

A importação vem antes dos dashboards porque um painel sobre dados lidos errado só gera retrabalho. As APIs entram na Fase 3, gravando nas mesmas tabelas, quando o fluxo por upload já estiver validado com clientes reais.

**Fase 2.5 — acompanhamento e análises** (entre a Fase 2 e as APIs). Entram os RF22 a RF29, nesta ordem:

1. Competência por empresa, alertas de conta parada e de importação atrasada, e análise por dia da semana. Só usam dados que já existem.
2. Alcance correto, frequência com alerta de desgaste e ranking de criativos.
3. Anotações e a apresentação gerada pelo sistema.

**Portão da Fase 2.5**: a apresentação de uma competência real sai do sistema sem ajuste manual de números.

## Features futuras

As features abaixo ficam fora da Fase 2.5, e o modelo de dados já está preparado ou é facilmente estendido para elas.

| Feature | O que muda | O que já está pronto |
| --- | --- | --- |
| Coleta automática por API | Marketing API (Meta) e Google Ads API puxam os dados todo dia, sem exportar relatórios; seguidores do Instagram hoje não vêm pela Marketing API e continuariam por importação | Tabela `metrics_daily` com chave por conta, nível, objeto e data; contas de anúncios com id externo |
| Acesso dos clientes | Cada cliente ganha login próprio e vê, em modo leitura, só as empresas liberadas para ele (uma ou várias) | Papel `client` previsto e RLS filtrando por `company_members` |
| Resultados reais e metas de custo | O gestor ou o cliente lança por semana as conversas reais e os agendamentos ou vendas, e o painel calcula o custo por agendamento; metas de custo por resultado por empresa, com destaque quando passam do limite | Métricas diárias por empresa e conta |
| Detalhamentos demográficos | Idade, gênero, posicionamento e horário. O Meta exporta um detalhamento por arquivo, então cada um é uma importação separada | Importação com mapeamento por sinônimos |
| Rastreamento automático do WhatsApp | Saber de qual anúncio veio cada conversa e se ela virou agendamento ou venda (ver abaixo) | Campanhas de mensagem já identificadas pelo tipo |

**Rastreamento do WhatsApp sem ferramenta paga.** Há dois caminhos.

- **Manual, custo zero, possível já:**
  - cada anúncio de mensagem usa uma mensagem pré-preenchida diferente (ex.: "Olá! Vi o combo semanal");
  - o atendimento marca a conversa com uma etiqueta do WhatsApp Business ("Anúncio — combo") e anota se virou agendamento;
  - uma vez por semana, os totais entram no sistema pela feature "Resultados reais".
- **Automático, sem ferramenta paga, mas com trabalho técnico:**
  - quando a conversa começa por um anúncio de clique para o WhatsApp, a API oficial do WhatsApp (Cloud API, da Meta) envia ao webhook um objeto de origem com o id do anúncio e um identificador do clique (`ctwa_clid`);
  - uma rota deste próprio sistema na Vercel pode receber esse webhook e gravar a conversa ligada ao anúncio;
  - o envio das vendas de volta ao Meta usa a API de Conversões.
  - Custo: as conversas iniciadas pelo cliente não têm custo de mensagem; mesmo assim, conferir as regras de cobrança e de coexistência com o app WhatsApp Business antes de implementar.
  - Requisito: o número do cliente precisa estar conectado à Cloud API.
  - Prazo: entra junto com a fase de APIs.

## Riscos e questões em aberto

O maior risco do MVP é a variação no formato dos relatórios exportados quebrar a importação.

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Colunas mudam entre exportações (idioma, colunas escolhidas, atualização da plataforma) | Importação falha ou lê errado | Relatório padrão salvo em cada plataforma; mapeamento por sinônimos; pré-visualização antes de gravar |
| Formato de número e data diferente do esperado | Valores multiplicados ou datas trocadas | Detecção do formato pelo conteúdo e validação de faixas antes de confirmar |
| Esquecer de importar algum período | Buracos nos gráficos | Mostrar o último dia importado por conta e destacar dias sem dados |
| Dado de uma empresa aparecer em outra | Quebra de confiança | RLS por usuário + filtro obrigatório por empresa no servidor |
| Importar duas vezes o mesmo período | Números dobrados | Substituir por conta e período em vez de somar |
| Desfazer uma importação que substituiu outra | Dados antigos do período não voltam | Aviso na confirmação; reimportar o arquivo anterior (guardado no Storage) |
| Alerta de desgaste com pouco volume | Falso alarme em anúncio com poucas impressões | Investimento mínimo para entrar no ranking e no alerta (RF27) |

**Questões em aberto**

- Os limites padrão dos alertas (3 dias sem investimento, 7 dias sem importação, queda de 20% no CTR) servem para todos os clientes, ou cada empresa precisa ajustar desde o início?
- A apresentação do RF29 será compartilhada com o cliente como link (exige o acesso de clientes) ou só exportada em PDF?
