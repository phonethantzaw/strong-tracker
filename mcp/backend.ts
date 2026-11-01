import type { AuthInfo } from "@modelcontextprotocol/server";
import type { StrongBackend } from "./types";

export type BackendProvider = {
  get(authInfo?: AuthInfo): StrongBackend;
};

export function staticBackendProvider(backend: StrongBackend): BackendProvider {
  return { get: () => backend };
}
