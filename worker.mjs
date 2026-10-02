const SESSION_COOKIE = "card_motion_session";
const SESSION_MAX_AGE = 60 * 60 * 8;
const encoder = new TextEncoder();

const loginPage = (hasError = false) => new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Sign in | Card hover options</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; color: #fbf9f8; font: 16px/1.5 system-ui, sans-serif; background: linear-gradient(145deg, #1a2f3f, #2c2b3c); }
    main { width: min(100%, 380px); }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p { margin: 0 0 24px; color: #c2c9cf; }
    label { display: block; margin-bottom: 8px; font-size: 14px; }
    input { width: 100%; min-height: 48px; margin-bottom: 16px; padding: 10px 12px; border: 1px solid #8395a0; border-radius: 4px; color: inherit; background: #13212c; font: inherit; }
    input:focus-visible, button:focus-visible { outline: 2px solid #b5d5e0; outline-offset: 3px; }
    button { min-height: 44px; padding: 0 18px; border: 0; border-radius: 4px; color: #13212c; background: #b5d5e0; font: 600 15px system-ui, sans-serif; cursor: pointer; }
    .error { margin: 0 0 16px; color: #ffb4a9; }
  </style>
</head>
<body>
  <main>
    <h1>Card hover options</h1>
    <p>Enter the shared password to continue.</p>
    ${hasError ? '<p class="error" role="alert">That password did not match. Try again.</p>' : ""}
    <form action="/login" method="post">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
      <button type="submit">Continue</button>
    </form>
  </main>
</body>
</html>`, {
  headers: {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
  },
});

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function digest(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

function equalBytes(left, right) {
  let difference = left.length ^ right.length;
  for (let index = 0; index < 32; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function createSession(secret) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = String(expiresAt);
  return `${encodeBase64Url(encoder.encode(payload))}.${encodeBase64Url(await sign(payload, secret))}`;
}

async function hasValidSession(request, secret) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const value = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!value) return false;

  const [encodedPayload, encodedSignature, extra] = value.split(".");
  if (!encodedPayload || !encodedSignature || extra) return false;

  try {
    const payload = new TextDecoder().decode(decodeBase64Url(encodedPayload));
    const expiresAt = Number(payload);
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
    return equalBytes(decodeBase64Url(encodedSignature), await sign(payload, secret));
  } catch {
    return false;
  }
}

function redirect(location, cookie) {
  const headers = new Headers({ location, "cache-control": "no-store" });
  if (cookie) headers.append("set-cookie", cookie);
  return new Response(null, { status: 303, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/login" && request.method === "GET") {
      return loginPage(url.searchParams.has("error"));
    }

    if (url.pathname === "/login" && request.method === "POST") {
      if (!env.ACCESS_PASSWORD || !env.SESSION_SECRET) {
        return new Response("Access gate is not configured.", { status: 503 });
      }

      const form = await request.formData();
      const suppliedPassword = String(form.get("password") ?? "");
      const [suppliedDigest, expectedDigest] = await Promise.all([
        digest(suppliedPassword),
        digest(env.ACCESS_PASSWORD),
      ]);

      if (!equalBytes(suppliedDigest, expectedDigest)) {
        const response = loginPage(true);
        return new Response(response.body, { status: 401, headers: response.headers });
      }

      const token = await createSession(env.SESSION_SECRET);
      return redirect("/", `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}`);
    }

    if (url.pathname === "/logout") {
      return redirect("/login", `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
    }

    if (!env.SESSION_SECRET) {
      return new Response("Access gate is not configured.", { status: 503 });
    }

    if (!await hasValidSession(request, env.SESSION_SECRET)) {
      return new Response(null, { status: 302, headers: { location: "/login", "cache-control": "no-store" } });
    }

    if (url.pathname === "/") url.pathname = "/options.html";
    return env.ASSETS.fetch(new Request(url, request));
  },
};