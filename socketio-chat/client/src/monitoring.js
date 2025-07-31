import * as Sentry from '@sentry/browser';
import { Integrations } from '@sentry/tracing';

Sentry.init({
  dsn: 'your-client-dsn',
  integrations: [new Integrations.BrowserTracing()],
  tracesSampleRate: 1.0,
});

// For monitoring and Error Tracking