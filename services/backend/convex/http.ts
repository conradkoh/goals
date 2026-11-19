import { httpRouter } from 'convex/server';

import {
  cliAuthRequestsHandler,
  cliAuthRevokeHandler,
  cliAuthTokenHandler,
} from './cli/httpHandlers';

/**
 * HTTP surface. Only the CLI device-code login routes live here today; the
 * `/cli/v1/call` gateway is added by the gateway package.
 *
 * No CORS or OPTIONS routes: the CLI is not a browser client.
 */
const http = httpRouter();

http.route({ path: '/cli/auth/requests', method: 'POST', handler: cliAuthRequestsHandler });
http.route({ path: '/cli/auth/token', method: 'POST', handler: cliAuthTokenHandler });
http.route({ path: '/cli/auth/revoke', method: 'POST', handler: cliAuthRevokeHandler });

export default http;
