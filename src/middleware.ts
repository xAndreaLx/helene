import { defineMiddleware } from 'astro:middleware';

// Protège l'admin et les routes d'écriture par une authentification HTTP Basic.
// Phase 1 (admin unique) : un seul couple identifiant / mot de passe via env.
// Phase 2 (plus tard) : vrais comptes + rôles (admin / utilisateur).
const env = (key: string): string | undefined =>
  // @ts-ignore - import.meta.env côté Astro/Vite, process.env côté runtime Netlify
  (typeof import.meta !== 'undefined' && import.meta.env?.[key]) || process.env[key];

const ADMIN_USER = env('ADMIN_USER') || 'admin';
const ADMIN_PASSWORD = env('ADMIN_PASSWORD');

// Pages d'admin + endpoints qui modifient la base.
const WRITE_APIS = ['/api/save-plant', '/api/update-plant', '/api/delete-plant'];
const isProtected = (pathname: string) =>
  pathname === '/admin' || pathname.startsWith('/admin/') || WRITE_APIS.includes(pathname);

const unauthorized = () =>
  new Response('Authentification requise.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Admin Hélène", charset="UTF-8"' },
  });

export const onRequest = defineMiddleware(async (context, next) => {
  if (!isProtected(context.url.pathname)) return next();

  // Pas de mot de passe configuré : on laisse passer en dev (confort local),
  // mais on bloque en prod (fail-closed) pour ne jamais exposer l'admin par oubli.
  if (!ADMIN_PASSWORD) {
    if (import.meta.env.DEV) return next();
    return new Response('Admin non configuré (variable ADMIN_PASSWORD manquante).', { status: 503 });
  }

  const header = context.request.headers.get('authorization') || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const [user, pass] = atob(encoded).split(':');
    if (user === ADMIN_USER && pass === ADMIN_PASSWORD) return next();
  }
  return unauthorized();
});
