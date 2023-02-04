// Copyright 2023-latest the httpland authors. All rights reserved. MIT license.
// This module is browser compatible.

import { type Handler } from "./deps.ts";

/** Chainable HTTP handlers.
 * Accepts `Request` and the next HTTP handlers.
 */
export interface ChainableHandler {
  (request: Request, next: NextHandler): Response | Promise<Response>;
}

/** Next HTTP handler.
 * A new `Request` can be passed to the next handler.
 */
export interface NextHandler {
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
