import { Chain, chain } from "./chain.ts";
import type { ChainableHandler } from "./types.ts";
import {
  assertEquals,
  assertNotEquals,
  assertSpyCalls,
  describe,
  it,
  spy,
} from "./dev_deps.ts";

describe("chain", () => {
  it("should return cloned response when handler is not exists", async () => {
    const response = new Response();
    const res = await chain(new Request("http://localhost"), response);

    assertNotEquals(response, res);
    assertEquals(response.url, res.url);
  });

  it("should return first handler called response", async () => {
    const response = new Response();
    const promise = chain(
      new Request("http://localhost"),
      response,
      () => new Response("test"),
    );

    assertNotEquals(response, promise);

    const newResponse = await promise;
    assertEquals(await newResponse.text(), "test");
  });

  it("should call next handler when the previous handler call next", () => {
    const nextHandler = spy<unknown, [Request], Response>(() => new Response());

    chain(
      new Request("http://localhost"),
      new Response(),
      (_, next) => next(),
      nextHandler,
    );

    assertSpyCalls(nextHandler, 1);
  });

  it("should not call next handler when the previous handler not call next", () => {
    const nextHandler = spy<unknown, [Request], Response>(() => new Response());

    chain(
      new Request("http://localhost"),
      new Response(),
      () => new Response(),
      nextHandler,
    );

    assertSpyCalls(nextHandler, 0);
  });

  it("should pass new cloned request object to next handler", () => {
    const nextHandler = spy<unknown, [Request], Response>(() => new Response());
    const initRequest = new Request("http://localhost");
    const nextRequest = new Request("http://proxy");

    chain(initRequest, new Response(), (_, next) => {
      return next(nextRequest);
    }, (request) => {
      // cloned
      assertNotEquals(request, nextRequest);
      assertEquals(request.url, nextRequest.url);

      return nextHandler(request);
    });

    assertSpyCalls(nextHandler, 1);
  });

  it("should not mutate request when not pass response object itself to next handler", () => {
    const nextHandler = spy<unknown, [Request], Response>(() => new Response());
    const initRequest = new Request("http://localhost");

    chain(initRequest, new Response(), (request, next) => {
      request.headers.append("server", "deno");

      return next();
    }, (request) => {
      assertEquals(request.headers.get("server"), null);

      return nextHandler(request);
    });

    assertSpyCalls(nextHandler, 1);
  });

  it("should mutate request when pass response object itself to next handler", () => {
    const nextHandler = spy<unknown, [Request], Response>(() => new Response());
    const initRequest = new Request("http://localhost");

    chain(initRequest, new Response(), (request, next) => {
      request.headers.append("server", "deno");

      return next(request);
    }, (request) => {
      assertEquals(request.headers.get("server"), "deno");

      return nextHandler(request);
    });

    assertSpyCalls(nextHandler, 1);
  });

  it("should pass response by next handler but it is cloned", async () => {
    const initRequest = new Request("http://localhost");
    const initResponse = new Response("test");
    const spyInit = spy<unknown, [Request], Response>(() => initResponse);

    const response = await chain(
      initRequest,
      new Response(),
      async (_, next) => {
        const response = await next();

        spyInit(_);
        assertNotEquals(response, initResponse);
        assertEquals(response.url, initResponse.url);

        return response;
      },
      () => initResponse,
    );

    assertSpyCalls(spyInit, 1);
    assertNotEquals(response, initResponse);
    assertEquals(response.url, initResponse.url);
  });
});

describe("Chain", () => {
  it("should init empty handlers", () => {
    assertEquals(new Chain().handlers, []);
  });

  it("should return registered handlers", () => {
    const handlers = [() => new Response()];
    assertEquals(new Chain(...handlers).handlers, handlers);
  });

  it("should return cloned response", async () => {
    const initResponse = new Response();

    const response = await new Chain(() => initResponse).respond(
      new Request("http://localhost"),
    );

    assertNotEquals(initResponse, response);
    assertEquals(initResponse.url, response.url);
  });

  it("should register via next", () => {
    const handler: ChainableHandler = () => new Response();
    const chain = new Chain(handler);

    chain.next(handler, handler, handler).next(handler);

    assertEquals(chain.handlers.length, 5);
  });

  it("should chain handler", async () => {
    const handler: ChainableHandler = (_, next) => next();
    const chain = new Chain(handler);

    chain.next(handler, handler, handler).next(() => new Response("test"));

    const response = await chain.respond(new Request("http://localhost"));

    assertEquals(await response.text(), "test");
  });
});
