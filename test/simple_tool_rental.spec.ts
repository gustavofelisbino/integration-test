import pactum from 'pactum';
import { StatusCodes } from 'http-status-codes';
import { SimpleReporter } from '../simple-reporter';
import { faker } from '@faker-js/faker';

/**
 * Simple Tool Rental API - aluguel de ferramentas.
 * Docs: https://github.com/vdespa/quick-introduction-to-postman/blob/main/simple-tool-rental-api.md
 *
 * Fluxo coberto: consulta do catálogo de ferramentas (GET), registro de
 * cliente da API (POST), ciclo de vida de um pedido de aluguel
 * (POST -> GET -> PATCH -> DELETE) e cenários negativos de validação
 * e autenticação.
 *
 * Observação: a API não implementa PUT; a atualização de pedidos é feita
 * via PATCH, conforme a documentação oficial.
 */
describe('Simple Tool Rental API', () => {
  const p = pactum;
  const rep = SimpleReporter;
  const baseUrl = 'https://simple-tool-rental-api.click';

  const nomeCliente = faker.person.fullName();
  const nomeEditado = faker.person.fullName();

  const toolSchema = {
    type: 'object',
    required: ['id', 'category', 'name', 'inStock'],
    properties: {
      id: { type: 'number' },
      category: { type: 'string' },
      name: { type: 'string' },
      inStock: { type: 'boolean' }
    }
  };

  const orderSchema = {
    type: 'object',
    required: ['orderId', 'toolId', 'customerName', 'quantity', 'created'],
    properties: {
      orderId: { type: 'string' },
      toolId: { type: 'number' },
      customerName: { type: 'string' },
      quantity: { type: 'number' },
      created: { type: 'string' },
      comment: { type: 'string' }
    }
  };

  p.request.setBaseUrl(baseUrl);
  p.request.setDefaultTimeout(30000);

  beforeAll(async () => {
    p.reporter.add(rep);

    // Registra um cliente da API e guarda o token para os endpoints de pedidos.
    await p
      .spec()
      .post('/api-clients')
      .withJson({
        clientName: faker.company.name(),
        clientEmail: faker.internet.email()
      })
      .expectStatus(StatusCodes.CREATED)
      .expectJsonSchema({
        type: 'object',
        required: ['accessToken'],
        properties: { accessToken: { type: 'string' } }
      })
      .stores('token', 'accessToken');

    // Usa uma ferramenta disponível em estoque para criar os pedidos.
    await p
      .spec()
      .get('/tools')
      .withQueryParams({ available: true, results: 1 })
      .expectStatus(StatusCodes.OK)
      .stores('toolId', '[0].id');
  });

  afterAll(() => p.reporter.end());

  describe('Status', () => {
    it('Deve retornar que a API está no ar', async () => {
      await p
        .spec()
        .get('/status')
        .expectStatus(StatusCodes.OK)
        .expectJson({ status: 'UP' });
    });
  });

  describe('Ferramentas (GET)', () => {
    it('Deve listar ferramentas filtrando por categoria e quantidade', async () => {
      await p
        .spec()
        .get('/tools')
        .withQueryParams({ category: 'ladders', results: 3 })
        .expectStatus(StatusCodes.OK)
        .expectJsonLength(3)
        .expectJsonSchema({ type: 'array', items: toolSchema })
        .expectJsonLike([
          { category: 'ladders' },
          { category: 'ladders' },
          { category: 'ladders' }
        ]);
    });

    it('Deve buscar uma ferramenta pelo id', async () => {
      await p
        .spec()
        .get('/tools/{toolId}')
        .withPathParams('toolId', '$S{toolId}')
        .expectStatus(StatusCodes.OK)
        .expectJsonSchema(toolSchema)
        .expectJsonLike({ id: '$S{toolId}', inStock: true });
    });

    it('Deve retornar 404 ao buscar ferramenta inexistente', async () => {
      await p
        .spec()
        .get('/tools/{toolId}')
        .withPathParams('toolId', 1)
        .expectStatus(StatusCodes.NOT_FOUND)
        .expectJson({ error: 'No tool with id 1.' });
    });

    it('Deve retornar 400 ao filtrar por categoria inválida', async () => {
      await p
        .spec()
        .get('/tools')
        .withQueryParams('category', 'categoria-invalida')
        .expectStatus(StatusCodes.BAD_REQUEST)
        .expectBodyContains("Invalid value for query parameter 'category'");
    });

    it('Deve retornar 400 ao pedir mais de 20 resultados', async () => {
      await p
        .spec()
        .get('/tools')
        .withQueryParams('results', 21)
        .expectStatus(StatusCodes.BAD_REQUEST)
        .expectBodyContains('Cannot be greater than 20');
    });
  });

  describe('Clientes da API (POST)', () => {
    it('Deve retornar 400 ao registrar cliente sem nome', async () => {
      await p
        .spec()
        .post('/api-clients')
        .withJson({ clientEmail: faker.internet.email() })
        .expectStatus(StatusCodes.BAD_REQUEST)
        .expectJson({ error: 'Invalid or missing client name.' });
    });
  });

  describe('Pedidos (POST, GET, PATCH, DELETE)', () => {
    it('Deve criar um pedido de aluguel', async () => {
      await p
        .spec()
        .post('/orders')
        .withBearerToken('$S{token}')
        .withJson({
          toolId: '$S{toolId}',
          customerName: nomeCliente
        })
        .expectStatus(StatusCodes.CREATED)
        .expectJsonLike({ created: true })
        .expectJsonSchema({
          type: 'object',
          required: ['created', 'orderId'],
          properties: { orderId: { type: 'string' } }
        })
        .stores('orderId', 'orderId');
    });

    it('Deve retornar 401 ao criar pedido sem token', async () => {
      await p
        .spec()
        .post('/orders')
        .withJson({
          toolId: '$S{toolId}',
          customerName: nomeCliente
        })
        .expectStatus(StatusCodes.UNAUTHORIZED)
        .expectJson({ error: 'Missing Authorization header.' });
    });

    it('Deve retornar 401 ao usar token inválido', async () => {
      await p
        .spec()
        .get('/orders')
        .withBearerToken('token-invalido')
        .expectStatus(StatusCodes.UNAUTHORIZED)
        .expectJson({ error: 'Invalid bearer token.' });
    });

    it('Deve retornar 400 ao criar pedido sem nome do cliente', async () => {
      await p
        .spec()
        .post('/orders')
        .withBearerToken('$S{token}')
        .withJson({ toolId: '$S{toolId}' })
        .expectStatus(StatusCodes.BAD_REQUEST)
        .expectJson({ error: 'Invalid or missing customer name.' });
    });

    it('Deve listar os pedidos do cliente contendo o pedido criado', async () => {
      await p
        .spec()
        .get('/orders')
        .withBearerToken('$S{token}')
        .expectStatus(StatusCodes.OK)
        .expectJsonSchema({ type: 'array', items: orderSchema })
        .expectJsonLike([
          { orderId: '$S{orderId}', customerName: nomeCliente }
        ]);
    });

    it('Deve buscar o pedido pelo id', async () => {
      await p
        .spec()
        .get('/orders/{orderId}')
        .withPathParams('orderId', '$S{orderId}')
        .withBearerToken('$S{token}')
        .expectStatus(StatusCodes.OK)
        .expectJsonSchema(orderSchema)
        .expectJsonLike({
          orderId: '$S{orderId}',
          toolId: '$S{toolId}',
          customerName: nomeCliente,
          quantity: 1
        });
    });

    it('Deve atualizar nome do cliente e comentário do pedido', async () => {
      await p
        .spec()
        .patch('/orders/{orderId}')
        .withPathParams('orderId', '$S{orderId}')
        .withBearerToken('$S{token}')
        .withJson({
          customerName: nomeEditado,
          comment: 'Retirar no período da manhã'
        })
        .expectStatus(StatusCodes.NO_CONTENT);

      await p
        .spec()
        .get('/orders/{orderId}')
        .withPathParams('orderId', '$S{orderId}')
        .withBearerToken('$S{token}')
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          customerName: nomeEditado,
          comment: 'Retirar no período da manhã'
        });
    });

    it('Deve excluir o pedido', async () => {
      await p
        .spec()
        .delete('/orders/{orderId}')
        .withPathParams('orderId', '$S{orderId}')
        .withBearerToken('$S{token}')
        .expectStatus(StatusCodes.NO_CONTENT);
    });

    it('Deve retornar 404 ao buscar o pedido excluído', async () => {
      await p
        .spec()
        .get('/orders/{orderId}')
        .withPathParams('orderId', '$S{orderId}')
        .withBearerToken('$S{token}')
        .expectStatus(StatusCodes.NOT_FOUND)
        .expectJson({ error: 'No order with id $S{orderId}.' });
    });
  });
});
