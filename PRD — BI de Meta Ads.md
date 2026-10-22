# PRD — BI de tráfego pago (Meta Ads + Google Ads)

Oct 21, 2026 · @Ultra-x-ti

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

**Usuários e papéis**

| Tabela | Conteúdo | Chave e vínculos |
| --- | --- | --- |
| `profiles` | Dados do usuário: nome, `role` (`admin` no MVP; `client` no futuro) | `id` = id do usuário no Supabase Auth |
| `company_members` | Quem acessa cada empresa e com qual permissão (`owner` ou `viewer`); um usuário pode ter várias linhas, uma por empresa | `company_id` + `user_id` |

No MVP, ao criar uma empresa o sistema cria automaticamente o vínculo `owner` do gestor. Todas as políticas de RLS consultam `company_members`, então liberar o acesso de um usuário do cliente no futuro é só criar vínculos `viewer` com uma ou mais empresas.

**Views para os dashboards**

- `v_daily_by_platform`: totais por empresa, plataforma e dia.
- `v_campaign_summary`: totais por campanha no período, com CTR, CPC, CPA e custo por resultado recalculados das somas.

Com a chave por conta, nível, objeto e data, a fase de APIs pode gravar na mesma tabela `metrics_daily` sem mudar os dashboards.

## Skills e ferramentas para o desenvolvimento

O desenvolvimento será feito com um agente de código (como o Claude Code) apoiado em skills, começando pela `find-skills` para descobrir as demais.

| Skill | Para que serve neste projeto | Instalação |
| --- | --- | --- |
| [find-skills](https://skills.sh/vercel-labs/skills/find-skills) (Vercel Labs) | Buscar e instalar skills do ecossistema skills.sh conforme surgir a necessidade (ex.: Supabase, gráficos, parsing de CSV) | `npx skills add vercel-labs/skills@find-skills -g -y` |
| frontend-design (Anthropic) | Direção visual dos dashboards: tipografia, cores e layout com identidade própria, fugindo do visual genérico | repositório `anthropics/skills` |
| [web-design-guidelines](https://skills.sh/vercel-labs/agent-skills/web-design-guidelines) (Vercel Labs) | Revisar a interface contra boas práticas de UI e acessibilidade | `npx skills add vercel-labs/agent-skills@web-design-guidelines` |
| [vercel-react-best-practices](https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices) (Vercel Labs) | Padrões de desempenho em React e Next.js na Vercel | `npx skills add vercel-labs/agent-skills@vercel-react-best-practices` |
| skill-creator (Anthropic) | Criar uma skill própria do projeto, por exemplo com as regras de importação e o mapeamento de colunas do Meta e do Google | repositório `anthropics/skills` |

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

## Features futuras

As três features abaixo ficam fora do MVP, e o modelo de dados já está preparado para elas.

| Feature | O que muda | O que já está pronto no MVP |
| --- | --- | --- |
| Coleta automática por API | Marketing API (Meta) e Google Ads API puxam os dados todo dia, sem exportar relatórios; seguidores do Instagram hoje não vêm pela Marketing API e continuariam por importação | Tabela `metrics_daily` com chave por conta, nível, objeto e data; contas de anúncios com id externo |
| Acesso dos clientes | Cada cliente ganha login próprio e vê, em modo leitura, só as empresas liberadas para ele (uma ou várias) | Papel `client` previsto e RLS filtrando por `company_members` |
| Relatório em PDF | Gerar e enviar ao cliente um resumo do período em PDF | Views agregadas por empresa, plataforma e campanha |

## Riscos e questões em aberto

O maior risco do MVP é a variação no formato dos relatórios exportados quebrar a importação.

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Colunas mudam entre exportações (idioma, colunas escolhidas, atualização da plataforma) | Importação falha ou lê errado | Relatório padrão salvo em cada plataforma; mapeamento por sinônimos; pré-visualização antes de gravar |
| Formato de número e data diferente do esperado | Valores multiplicados ou datas trocadas | Detecção do formato pelo conteúdo e validação de faixas antes de confirmar |
| Esquecer de importar algum período | Buracos nos gráficos | Mostrar o último dia importado por conta e destacar dias sem dados |
| Dado de uma empresa aparecer em outra | Quebra de confiança | RLS por usuário + filtro obrigatório por empresa no servidor |
| Importar duas vezes o mesmo período | Números dobrados | Substituir por conta e período em vez de somar |

**Questões em aberto**

Nenhuma questão em aberto no momento.
