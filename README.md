# VaptVupt

Plataforma de entregas sob demanda, conectando **lojas**, **entregadores** e **operação administrativa** em tempo real.

O projeto está sendo estruturado para oferecer uma experiência profissional de ponta a ponta, com foco em operação, rastreabilidade, segurança, matching de entregadores e gestão.

## Visão geral

O VaptVupt é organizado em aplicações e pacotes independentes dentro de um monorepo:

- `apps/web-admin` — painel administrativo e operação
- `apps/web-store` — portal das lojas
- `apps/mobile-driver` — aplicativo do entregador
- `apps/functions` — Firebase Cloud Functions e regras de negócio
- `packages/shared-types` — tipos compartilhados
- `packages/shared-ui` — componentes compartilhados

## Fluxo principal da entrega

O fluxo operacional é controlado pelo backend e segue uma máquina de estados:

```text
SEARCHING_DRIVER
      ↓
OFFERED
      ↓
ACCEPTED
      ↓
GOING_TO_PICKUP
      ↓
ARRIVED_PICKUP
      ↓
PICKED_UP
      ↓
IN_TRANSIT
      ↓
ARRIVED_DESTINATION
      ↓
DELIVERED
```

Estados de exceção incluem:

- `CANCELLED`
- `EXPIRED`
- `FAILED`
- `PROBLEM`

As transições importantes são validadas no backend para evitar alterações arbitrárias pelo cliente.

## Principais recursos

### Operação

- Dashboard operacional
- Mapa de entregas e entregadores
- Acompanhamento de pedidos em tempo real
- Busca e filtros
- Timeline de pedidos
- Central de notificações
- Suporte operacional
- Auditoria

### Lojas

- Dashboard da loja
- Criação de novas entregas
- Acompanhamento de pedidos
- Histórico
- Informações financeiras
- Suporte
- Configurações

### Entregadores

- Recebimento de ofertas
- Aceite e rejeição de entregas
- Fluxo de coleta e entrega
- Atualização de status pelo backend
- Localização em tempo real
- Histórico operacional

### Matching

O sistema de matching considera, entre outros fatores:

- entregadores online
- entregadores aprovados e não bloqueados
- disponibilidade
- localização recente
- distância até a coleta
- raio configurável
- limite de candidatos

As configurações de matching podem ser ajustadas pelo painel administrativo.

## Arquitetura

Tecnologias principais utilizadas no projeto:

- React
- TypeScript
- React Native / Expo
- Firebase
- Cloud Functions
- Firestore
- Firebase Authentication
- Firebase Storage
- Geolocalização
- Push notifications

## Segurança

A aplicação utiliza regras do Firestore e validações no backend para proteger operações sensíveis.

Entre os pontos tratados estão:

- autenticação
- autorização por usuário
- controle de acesso aos pedidos
- proteção de dados operacionais
- auditoria de ações
- validação das transições de status
- proteção de informações financeiras e de localização

## Desenvolvimento

### Pré-requisitos

- Node.js 20+
- npm
- projeto Firebase configurado
- credenciais/configurações necessárias para cada aplicação

### Instalação

Na raiz do projeto:

```bash
npm install
```

Depois, cada aplicação pode ser executada conforme seus scripts e configurações locais.

## Estrutura

```text
VaptVupt/
├── apps/
│   ├── functions/
│   ├── mobile-driver/
│   ├── web-admin/
│   └── web-store/
├── packages/
│   ├── shared-types/
│   └── shared-ui/
├── firestore.rules
└── README.md
```

## CI

O projeto possui workflow de CI em:

```text
.github/workflows/ci.yml
```

O pipeline verifica a instalação e o build das principais aplicações e realiza verificações de TypeScript.

> O status do CI deve ser considerado a fonte de verdade para confirmar se uma versão específica está pronta para publicação.

## Status do projeto

O VaptVupt está em evolução para uma arquitetura de produção mais robusta.

Já existem bases para:

- operação administrativa
- gestão de lojas
- fluxo de entregadores
- matching
- controle de estados
- auditoria
- notificações
- segurança

Integrações externas, como provedores reais de pagamento, credenciamento de serviços e configurações de produção, dependem das contas e credenciais correspondentes.

## Roadmap

- [ ] Finalizar validação de produção
- [ ] Expandir testes automatizados
- [ ] Paginação e otimização de consultas
- [ ] Auditoria operacional completa
- [ ] Central de suporte completa
- [ ] Financeiro e conciliação
- [ ] Integração com provedor real de pagamentos
- [ ] Melhorias de notificações push
- [ ] Observabilidade e métricas
- [ ] Preparação para escala

## Contribuição

Antes de enviar alterações:

1. mantenha as regras de negócio no backend quando forem operações sensíveis;
2. preserve a máquina de estados das entregas;
3. evite expor dados de outras lojas ou entregadores;
4. execute o CI localmente quando possível;
5. documente mudanças relevantes.

## Licença

A licença do projeto deve ser definida antes da publicação pública do código.
