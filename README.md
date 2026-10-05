# API test automation with Jest and PactumJS

> Simple integration between JestJS and PactumJS.

## GitHub Actions

[![Node.js CI](https://github.com/gustavofelisbino/integration-test/actions/workflows/node.js.yml/badge.svg?branch=master)](https://github.com/gustavofelisbino/integration-test/actions/workflows/node.js.yml)

## SonarCloud

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=gustavofelisbino_integration-test&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=gustavofelisbino_integration-test)

# Getting Started

### Pactum docs:
 - [PactumJS](https://pactumjs.github.io/)

### Prerequisites:
 - NodeJS `v22`

### How to run?

Inside of the project folder run:

 1. `npm install --save-dev`
 1. `npm run ci`

After that you should see a `./output` folder with some `HTML` reports.

### Docs to Api under tests: 
 - [Dummyjson](https://dummyjson.com/docs)
 - [Gorest](https://gorest.co.in/)
 - [Toolshop API](https://api.practicesoftwaretesting.com/api/documentation)
 - [Deck of Cards](https://deckofcardsapi.com/)
 - [JSON placeholder](https://jsonplaceholder.typicode.com/)
 - [http bin](http://httpbin.org/)
 - [rick and morty api](https://rickandmortyapi.com/documentation/#rest)
 - [Petstore](https://petstore.swagger.io/#/) 
 - [Simple Tool Rental API](https://github.com/vdespa/quick-introduction-to-postman/blob/main/simple-tool-rental-api.md)
 - [ServeRest](https://serverest.dev/#/)
 - [ServeRest - Datadog](https://p.datadoghq.eu/sb/421fcfee-35ec-11ee-b87f-da7ad0900005-2aaf85264a89d11b7001bcab452a266e?refresh_mode=sliding&theme=light&tpl_var_env%5B0%5D=serverest.dev&from_ts=1699931511294&to_ts=1699932411294&live=true)

## Simple Tool Rental API

Spec: [`test/simple_tool_rental.spec.ts`](test/simple_tool_rental.spec.ts)

API de aluguel de ferramentas (`https://simple-tool-rental-api.click`). Antes dos testes, o `beforeAll` registra um cliente da API (`POST /api-clients`) e guarda o token e o id de uma ferramenta disponível no *data store* do Pactum (`stores` / `$S{...}`).

Para rodar somente esta suíte: `npm run test:tool-rental`

| # | Grupo | Método | Endpoint | Cenário | Status esperado |
|---|-------|--------|----------|---------|-----------------|
| 1 | Status | GET | `/status` | API no ar | 200 |
| 2 | Ferramentas | GET | `/tools?category=ladders&results=3` | Lista filtrada por categoria e quantidade, validando tamanho, schema e categoria | 200 |
| 3 | Ferramentas | GET | `/tools/{toolId}` | Busca de ferramenta pelo id, validando schema | 200 |
| 4 | Ferramentas | GET | `/tools/1` | Ferramenta inexistente | 404 |
| 5 | Ferramentas | GET | `/tools?category=...` | Categoria inválida | 400 |
| 6 | Ferramentas | GET | `/tools?results=21` | Quantidade acima do limite (20) | 400 |
| 7 | Clientes | POST | `/api-clients` | Registro de cliente sem nome | 400 |
| 8 | Pedidos | POST | `/orders` | Criação de pedido de aluguel | 201 |
| 9 | Pedidos | POST | `/orders` | Criação sem header `Authorization` | 401 |
| 10 | Pedidos | GET | `/orders` | Token inválido | 401 |
| 11 | Pedidos | POST | `/orders` | Criação sem nome do cliente | 400 |
| 12 | Pedidos | GET | `/orders` | Lista de pedidos contém o pedido criado | 200 |
| 13 | Pedidos | GET | `/orders/{orderId}` | Busca do pedido pelo id, validando schema e dados | 200 |
| 14 | Pedidos | PATCH | `/orders/{orderId}` | Atualiza nome do cliente e comentário, e confirma com GET | 204 / 200 |
| 15 | Pedidos | DELETE | `/orders/{orderId}` | Exclusão do pedido | 204 |
| 16 | Pedidos | GET | `/orders/{orderId}` | Busca do pedido excluído | 404 |

> A API não implementa `PUT` (retorna 404 para esse método). A atualização de pedidos é feita via `PATCH`, conforme a documentação oficial.

Recursos do PactumJS utilizados: `request.setBaseUrl`, `withPathParams`, `withQueryParams`, `withBearerToken`, `withJson`, `stores` + templates `$S{}`, `expectStatus`, `expectJson`, `expectJsonLike`, `expectJsonSchema`, `expectJsonLength` e `expectBodyContains`.
