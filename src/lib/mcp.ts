import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { logger } from "./logger";

export class MCPClient {
  private client: Client | null = null;
  private transport: SSEClientTransport | null = null;
  private url: string;
  private token?: string;

  constructor(url: string, token?: string) {
    this.url = url;
    this.token = token;
  }

  async connect() {
    const OriginalEventSource = window.EventSource;
    try {
      const headers = this.token ? { Authorization: `Bearer ${this.token}` } : undefined;
      
      // To bypass CORS, we need to route requests through our backend proxy.
      // However, the MCP SDK expects the connection URL and the endpoint URL to have the same origin.
      // If we pass the proxy URL to the SDK, it will fail if the server returns an absolute endpoint URL.
      // So, we pass the ORIGINAL URL to the SDK, but we override EventSource and fetch to use the proxy.
      
      class ProxyEventSource extends OriginalEventSource {
        constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
          const targetUrl = new URL(url.toString());
          const proxyUrl = new URL(window.location.origin);
          proxyUrl.pathname = '/api/mcp-proxy';
          proxyUrl.searchParams.set('url', targetUrl.toString());
          super(proxyUrl, eventSourceInitDict);
        }
      }
      
      // Temporarily override EventSource
      window.EventSource = ProxyEventSource as any;
      
      this.transport = new SSEClientTransport(new URL(this.url), {
        eventSourceInit: headers ? { headers } as any : undefined,
        requestInit: headers ? { headers } : undefined,
        fetch: (input, init) => {
          // Rewrite fetch requests to go through the proxy
          const targetUrl = new URL(input.toString());
          const proxyUrl = new URL(window.location.origin);
          proxyUrl.pathname = '/api/mcp-proxy';
          proxyUrl.searchParams.set('url', targetUrl.toString());
          return fetch(proxyUrl, init);
        }
      });
      
      this.client = new Client(
        { name: "bok-lifsins-client", version: "1.0.0" },
        { capabilities: { sampling: { tools: {} } } as any }
      );
      
      await this.client.connect(this.transport);
      
      logger.info(`Connected to MCP server at ${this.url} via proxy`);
    } catch (error) {
      logger.error("Failed to connect to MCP server", { error });
      throw error;
    } finally {
      // Restore EventSource
      window.EventSource = OriginalEventSource;
    }
  }

  async getTools() {
    if (!this.client) return [];
    try {
      const response = await this.client.listTools();
      return response.tools;
    } catch (error) {
      logger.error("Failed to list tools", { error });
      return [];
    }
  }

  async callTool(name: string, args: any) {
    if (!this.client) throw new Error("MCP Client not connected");
    try {
      const response = await this.client.callTool({ name, arguments: args });
      return response;
    } catch (error) {
      logger.error(`Failed to call tool ${name}`, { error });
      throw error;
    }
  }

  disconnect() {
    if (this.transport) {
      this.transport.close();
    }
  }
}
