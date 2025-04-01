   // Import the Azure Monitor OpenTelemetry plugin and OpenTelemetry API
   const { useAzureMonitor } = require("@azure/monitor-opentelemetry");
   const { metrics, trace } = require("@opentelemetry/api");

   // Import the OpenTelemetry instrumentation registration function and Express instrumentation
   const { registerInstrumentations } = require( "@opentelemetry/instrumentation");
   const {
     getNodeAutoInstrumentations,
   } = require('@opentelemetry/auto-instrumentations-node');

   // Get the OpenTelemetry tracer provider and meter provider
   const tracerProvider = (trace.getTracerProvider()).getDelegate();
   const meterProvider = metrics.getMeterProvider();

   // Enable Azure Monitor integration
   useAzureMonitor();
   
   // Register the Express instrumentation
   registerInstrumentations({
     // List of instrumentations to register
     instrumentations: [
      getNodeAutoInstrumentations(),
     ],
   // OpenTelemetry tracer provider
     tracerProvider: tracerProvider,
     // OpenTelemetry meter provider
     meterProvider: meterProvider
   });