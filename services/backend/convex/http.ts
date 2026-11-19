import { httpRouter } from 'convex/server';

import {
  cliAuthRequestsHandler,
  cliAuthRevokeHandler,
  cliAuthTokenHandler,
  cliCallHandler,
} from './cli/httpHandlers';

/**
 * HTTP surface: the CLI device-code login routes plus the authenticated
 * `/cli/v1/call` data gateway.
 *
 * No CORS or OPTIONS routes: the CLI is not a browser client.
 */
const http = httpRouter();

http.route({ path: '/cli/auth/requests', method: 'POST', handler: cliAuthRequestsHandler });
http.route({ path: '/cli/auth/token', method: 'POST', handler: cliAuthTokenHandler });
http.route({ path: '/cli/auth/revoke', method: 'POST', handler: cliAuthRevokeHandler });
http.route({ path: '/cli/v1/call', method: 'POST', handler: cliCallHandler });

export default http;
