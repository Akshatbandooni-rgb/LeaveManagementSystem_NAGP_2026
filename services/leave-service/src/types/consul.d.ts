declare module 'consul' {
  interface ConsulOptions {
    host?: string;
    port?: string | number;
    promisify?: boolean;
  }

  interface ServiceRegisterOptions {
    name: string;
    id: string;
    address: string;
    port: number;
    check?: {
      http?: string;
      interval?: string;
      deregistercriticalserviceafter?: string;
    };
  }

  interface Agent {
    service: {
      register(options: ServiceRegisterOptions): Promise<void>;
      deregister(id: string): Promise<void>;
    };
  }

  class Consul {
    constructor(options: ConsulOptions);
    agent: Agent;
  }

  export = Consul;
}
