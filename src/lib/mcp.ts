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
    try {
      const headers = this.token ? { Authorization: `Bearer ${this.token}` } : undefined;
      
      this.transport = new SSEClientTransport(new URL(this.url), {
        eventSourceInit: headers ? { headers } as any : undefined,
        requestInit: headers ? { headers } : undefined,
      });
      
      this.client = new Client(
        { name: "bok-lifsins-client", version: "1.0.0" },
        { capabilities: { tools: {} } }
      );
      await this.client.connect(this.transport);
      logger.info(`Connected to MCP server at ${this.url}`);
    } catch (error) {
      logger.error("Failed to connect to MCP server", { error });
      throw error;
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
