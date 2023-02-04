// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

import type { Chainable, ChainableHandler, NextHandler } from "./types.ts";

/** Immutable chain builder for HTTP handlers.
 *
 * @example
 * ```ts
 * import { Chain } from "https://deno.land/x/chain_handler@$VERSION/mod.ts";
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 *
 * const chain = new Chain()
 * chain.next(async (request, next) => {
 *   // logger
 *   console.log("start")
 *   const response = await next()
 *   console.log("end")
 *   return response
 * }).next((request, next) => {
 *   // request proxy
 *   request.headers.append("x-proxy", "chain")
 *   return next(request)
 * }).next(async (_, next) => {
 *   // response proxy
 *   const response = await next()
 *   response.headers.append("server", "deno")
 *   return response
 * }).next(() => {
 *   // cut off chain
 *   return new Response("hello")
 * }).next(() => {
 *   // not call because cut off by previous chain.
 *   return new Response("goodby")
 * })
 * const response = await chain.respond(new Request("http://localhost"))
 * assertEquals(await response.text(), "hello")
 * assertEquals(response.headers.get("server"), "deno")
 * ```
 */
export class Chain implements Chainable {
  #handlers: readonly ChainableHandler[] = [];

  /**
   * @param init Initial chainable HTTP handlers.
   */
  constructor(...init: readonly ChainableHandler[]) {
    this.#handlers = init ?? [];
  }

  /**
   * @param handlers
   */
  readonly next = (...handlers: readonly ChainableHandler[]): this => {
    this.#handlers = this.#handlers.concat(handlers);

    return this;
  };

  /**
   * @example
   * ```ts
   * import { Chain } from "https://deno.land/x/chain_handler@$VERSION/mod.ts";
   * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
   *
   * assertEquals(new Chain(() => new Response("hello")).handlers.length, 1)
   * ```
   */
  get handlers(): readonly ChainableHandler[] {
    return this.#handlers;
  }

  /**
   * @param request `Request` object. The `Request` is cloned and not mutate.
   * @param defaultResponse The default `Response` object. Change the response when the {@link handlers} is empty.
   */
  readonly respond = (
    request: Request,
    defaultResponse?: Response,
  ): Promise<Response> | Response => {
    const newRequest = new Request(request);
    defaultResponse ??= new Response(null, { status: 404 });

    const response = chain(
      newRequest.clone(),
      defaultResponse.clone(),
      ...this.handlers,
    );

    return response;
  };
}

/** Immutable and sequential handler calls.
 * @param request The initial `Request` object.
 * @param response The initial `Response` object.
 * @param handlers Sequential execution HTTP handlers.
 *
 * @example
 * ```ts
 * import { chain } from "https://deno.land/x/chain_handler@$VERSION/mod.ts";
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 *
 * const initRequest = new Request("http://localhost");
 * const initResponse = new Response(null, { status: 400 })
 * const response = await chain(initRequest, initResponse, (_, next) => next(), () => new Response("hello"))
 * assertEquals(response.status, 200)
 * assertEquals(await response.text(), "hello")
 * ```
 */
export function chain(
  request: Request,
  response: Response,
  ...handlers: readonly ChainableHandler[]
): Promise<Response> | Response {
  const seen = new WeakSet<readonly ChainableHandler[]>();

  const run: typeof chain = async (request, response, ...handlers) => {
    // Recursive safe
    if (seen.has(handlers)) return response.clone();

    const [first, ...rest] = handlers;

    if (!first) return response.clone();

    const nextHandler: NextHandler = async (nextRequest = request) =>
      (await run(nextRequest.clone(), response.clone(), ...rest)).clone();

    return (await first(request.clone(), nextHandler)).clone();
  };

  return run(request, response, ...handlers);
}
