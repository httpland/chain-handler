# chain-handler

Chainable and immutable HTTP handler for standard `Request` and `Response`.

## Usage

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
}).next((request, next) => {
  // request proxy
  request.headers.append("x-proxy", "chain");
  return next(request);
}).next(async (_, next) => {
  // response proxy
  const response = await next();
  response.headers.append("server", "deno");
  return response;
}).next(() => {
  // cut off chain
  return new Response("hello");
}).next(() => {
  // not call because cut off by previous chain.
  return new Response("goodby");
});
const response = await chain.respond(new Request("http://localhost"));
assertEquals(await response.text(), "hello");
assertEquals(response.headers.get("server"), "deno");
```

## License

Copyright © 2023-present [httpland](https://github.com/httpland).

Released under the [MIT](./LICENSE) license
