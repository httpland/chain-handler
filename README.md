# chain-handler

Chainable and immutable HTTP handler for standard `Request` and `Response`.

[![deno land](http://img.shields.io/badge/available%20on-deno.land/x-lightgrey.svg?logo=deno)](https://deno.land/x/chain_handler)
[![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/deno.land/x/chain_handler/mod.ts)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/httpland/chain-handler)](https://github.com/httpland/chain-handler/releases)
[![codecov](https://codecov.io/gh/httpland/chain-handler/branch/main/graph/badge.svg?token=nan4NUrx1V)](https://codecov.io/gh/httpland/chain-handler)
[![GitHub](https://img.shields.io/github/license/httpland/chain-handler)](https://github.com/httpland/chain-handler/blob/main/LICENSE)

[![test](https://github.com/httpland/chain-handler/actions/workflows/test.yaml/badge.svg)](https://github.com/httpland/chain-handler/actions/workflows/test.yaml)
[![NPM](https://nodei.co/npm/@httpland/chain-handler.png?mini=true)](https://nodei.co/npm/@httpland/chain-handler/)

## What

Defines an API for chainable HTTP handler.

```ts
interface Handler {
  (request: Request): Response | Promise<Response>;
}
```

The declarative, web-standard compliant HTTP handler API is a powerful employed
by `deno/std`.

We maintain this API and extend it. What we are adding to the `Handler` is a
chaining mechanism.

```ts
interface ChainableHandler {
  (request: Request, next: OptionalHandler): Response | Promise<Response>;
}

interface OptionalHandler {
  (request?: Request): Response | Promise<Response>;
}
```

`ChainableHandler` is a handler that takes the next handler as the second
argument.

`ChainableHandler` satisfies the following features:

- It can access to the `Request`.
- It can access the next handler.
- It can call the next handler.
- It can choose not to call the next handler.
- It can access the next handler's return value (`Response`).
- It can return `Response`.

`OptionalHandler` is the next handler itself. It is optional to call it, or to
pass a modified `Request` object.

However, because of the emphasis on immutable, the `Request` object is
propagated only through its arguments.

These features make it the core of **middleware**.

## Packages

The package supports multiple platforms.

- deno.land/x - `https://deno.land/x/chain_handler/mod.ts`
- npm - `@httpland/chain-handler`

## Usage

`Chain` is a stateful constructor. Add a `ChainableHandler` from the constructor
or from the `next` function.

Handlers are executed asynchronously and recursively in the order of their
declarations. Calling the next handler executes the next handler. `await` a call
to the next handler gives access to the `Response` of the next handler.

```ts
import { Chain } from "https://deno.land/x/chain_handler@$VERSION/mod.ts";
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

const chain = new Chain();
chain.next(async (request, next) => {
  // logger
  console.log("start");
  const response = await next();
  console.log("end");
  return response;
}, (request, next) => {
  // request proxy
  request.headers.append("x-proxy", "chain");
  return next(request);
}, async (_, next) => {
  // response proxy
  const response = await next();
  response.headers.append("server", "deno");
  return response;
}, () => {
  // cut off chain
  return new Response("hello");
}, () => {
  // not call because cut off by previous chain.
  return new Response("goodby");
});

const response = await chain.respond(new Request("http://localhost"));
assertEquals(await response.text(), "hello");
assertEquals(response.headers.get("server"), "deno");
```

In the `respond` function, apply a `ChainableHandler` to convert the `Request`
into a `Response`.

## Immutability

To reduce unexpected bugs, `Request` and `Response` are **NOT** shared among
handlers. To propagate a change, pass the `Request` or `Response` to the next
handler.

```ts
import { Chain } from "https://deno.land/x/chain_handler@$VERSION/mod.ts";
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

const chain = new Chain();

chain.next((request, next) => {
  request.headers.append("x-effect", "no effect");
  return next();
}).next((request, next) => {
  assertEquals(request.headers.get("x-effect"), null);

  return next();
});
```

In order to propagate changes, a `Request` or `Response` must be passed to the
next handler.

```ts
import { Chain } from "https://deno.land/x/chain_handler@$VERSION/mod.ts";
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

const chain = new Chain((request, next) => {
  request.headers.append("x-effect", "effected");

  return next(request);
}, (request) => {
  assertEquals(request.headers.get("x-effect"), "effected");

  return new Response("ok");
});
```

This ensures that there are no destructive changes to the object.

## Utility

Stateless functions are also available.

```ts
import {
  chain,
  type ChainableHandler,
} from "https://deno.land/x/chain_handler@$VERSION/mod.ts";
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

const initRequest = new Request("http://localhost");
const initResponse = new Response(null, { status: 404 });
const justThrough: ChainableHandler = (_, next) => next();

const response = await chain(
  initRequest,
  initResponse,
  justThrough,
  justThrough,
  ...new Array(5).fill(justThrough),
);
assertEquals(response.status, 404);
```

## Tips

Detailed specifications are explained below.

### Clone is not required

If you make a destructive change, such as reading a body, you do not need to
clone it for the next handler.

```ts
import { Chain } from "https://deno.land/x/chain_handler@$VERSION/mod.ts";

const chain = new Chain(async (request, next) => {
  // No need request.clone()
  const text = await request.text();
  return next();
}, async (request) => {
  const json = await request.json();
  return new Response("ok");
});
```

A clone of the **argument** or **return value** object is always used.

That is, `clone` is required in the following cases

```ts
import { Chain } from "https://deno.land/x/chain_handler@$VERSION/mod.ts";
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

const chain = new Chain(async (request, next) => {
  const response = await next();
  const cloned = response.clone();

  assertEquals(await cloned.text(), "ok");

  return response;
}, async () => new Response("ok"));
```

### Default response

Default Response is `new Response(null, { status: 404 })`. This can be
completely changed.

```ts
import { Chain } from "https://deno.land/x/chain_handler@$VERSION/mod.ts";
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

const response = await new Chain().respond(
  new Request("http://localhost"),
  new Response("ok"),
);

assertEquals(await response.text(), "ok");
```

## License

Copyright © 2023-present [httpland](https://github.com/httpland).

Released under the [MIT](./LICENSE) license
