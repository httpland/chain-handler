// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

import { type Handler } from "./deps.ts";

/** Chainable HTTP handlers.
 * Accepts `Request` and the next HTTP handlers.
 */
export interface ChainableHandler {
  (
    request: Request,
    next: OptionalHandler,
  ): Response | Promise<Response>;
}

/** Optional `Request` HTTP handler.
 * It is possible not to pass the `Request` object.
 */
export interface OptionalHandler {
  (request?: Request): Response | Promise<Response>;
}

/** Chainable HTTP handler API. */
export interface Chainable {
  /** Register chainable HTTP handlers. */
  readonly next: (...handlers: readonly ChainableHandler[]) => this;

  /** Respond `Response` from `Request`. */
  readonly respond: Handler;

  /** All registered handlers. */
  readonly handlers: readonly ChainableHandler[];
}
