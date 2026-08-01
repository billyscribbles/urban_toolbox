# How Railway builds this site.
#
# WHY A DOCKERFILE. The build must run headless Chrome: scripts/prerender.mjs
# snapshots every route to static HTML, without which crawlers get an empty
# `<div id="root">` (see that file for the full reasoning). Railway's managed
# builders can't supply a working browser — they run Ubuntu, where both the
# `chromium` and `chromium-browser` apt packages are snap stubs that exit 1 the
# moment puppeteer launches them. That was the build failure this file replaced.
# Railway also retired the Nixpacks builder that the old nixpacks.toml
# configured, and fell back to Railpack silently, so the browser setup had
# stopped being read at all. A Dockerfile is the one builder Railway always
# honours, which puts the browser — and the distro under it — back under our
# control.
#
# Debian on purpose: it ships a real chromium deb and apt resolves its shared
# libraries for us, rather than a hand-maintained list that drifts between
# Ubuntu releases.

FROM node:22-bookworm-slim AS build

# The browser prerender.mjs drives. puppeteer-core deliberately ships no
# browser of its own, so this is the only one available to it.
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium \
  && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Corepack takes the yarn version from package.json's packageManager field. Its
# download prompt is interactive by default and would hang a non-TTY build.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --immutable

COPY . .

# Build-time configuration. Railway injects a service variable into a Dockerfile
# build ONLY if it is declared as an ARG here; anything undeclared arrives empty
# with no warning. Adding a VITE_* variable to the service is therefore only
# half the job — it has to be added here too.
ARG VITE_SITE_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_FORMSPREE_ID
ARG VITE_GA_ID
ARG VITE_GTM_ID
ENV VITE_SITE_URL=$VITE_SITE_URL \
  VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  VITE_FORMSPREE_ID=$VITE_FORMSPREE_ID \
  VITE_GA_ID=$VITE_GA_ID \
  VITE_GTM_ID=$VITE_GTM_ID

# Fail loudly on a missing one. Vite inlines these into the bundle and the
# prerender step reads the Supabase pair to load the catalogue, so an empty
# value doesn't error — it ships. A blank Supabase URL yields snapshots and a
# sitemap with no products; a blank Formspree ID yields a quote form that posts
# nowhere. Both look like a successful deploy. The analytics IDs stay optional
# because the tags are written to no-op when blank.
#
# Only ever check VITE_* values here. BuildKit echoes each RUN with its
# variables already expanded, so anything named below is printed in full into
# Railway's build log. That is fine for values vite inlines into a public
# bundle, and a credential leak for anything else.
RUN missing=""; \
  [ -n "$VITE_SITE_URL" ] || missing="$missing VITE_SITE_URL"; \
  [ -n "$VITE_SUPABASE_URL" ] || missing="$missing VITE_SUPABASE_URL"; \
  [ -n "$VITE_SUPABASE_ANON_KEY" ] || missing="$missing VITE_SUPABASE_ANON_KEY"; \
  [ -n "$VITE_FORMSPREE_ID" ] || missing="$missing VITE_FORMSPREE_ID"; \
  if [ -n "$missing" ]; then \
  echo "Missing required build variable(s):$missing" >&2; \
  echo "Add each one to the Railway service AND as an ARG in this Dockerfile." >&2; \
  exit 1; \
  fi

# vite build, then the prerender and sitemap steps that need Chrome + Supabase.
RUN yarn build

# --- runtime ----------------------------------------------------------------
# server.js has zero npm dependencies by design (see its header), so the final
# image needs neither chromium nor node_modules — only node, the built site and
# the two source files the server reads. package.json comes along for its
# `"type": "module"`, without which node refuses the ESM in server.js.
FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/src/config/redirects.js ./src/config/redirects.js
COPY --from=build /app/package.json ./package.json

# server.js defaults to 4173; the Railway service pins PORT to match so the
# generated domain reaches it.
EXPOSE 4173
CMD ["node", "server.js"]
