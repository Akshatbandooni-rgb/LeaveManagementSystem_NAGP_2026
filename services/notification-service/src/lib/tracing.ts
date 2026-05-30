import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';

let sdk: NodeSDK | undefined;

function getTraceEndpoint(): string {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';
  return `${endpoint.replace(/\/$/, '')}/v1/traces`;
}

export function initTracing(serviceName: string): void {
  if (sdk) {
    return;
  }

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      'service.name': serviceName,
    }),
    traceExporter: new OTLPTraceExporter({
      url: getTraceEndpoint(),
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
}
