import type { DemoData, DemoUser } from "@/lib/domain/types";
import { sendProposedCommand, type ProposedCommand } from "@/lib/api/endpoints";
import { request } from "@/lib/api/client";

type CommandInput = { state: DemoData; user: DemoUser | null; kind: string; payload: Record<string, unknown>; idempotencyKey?: string };
type CommandOutput = { ok: boolean; message: string; reference?: string; state?: DemoData };

export interface TextileCommandAdapter {
  readonly mode: "demo" | "http";
  execute(input: CommandInput): Promise<CommandOutput>;
}

export function createDemoCommandAdapter(run: (state: DemoData, user: DemoUser | null, kind: string, payload: Record<string, unknown>) => { data: DemoData; ok: boolean; message: string; reference?: string }): TextileCommandAdapter {
  return {
    mode: "demo",
    async execute({ state, user, kind, payload }) {
      const result = run(state, user, kind, payload);
      return { ok: result.ok, message: result.message, reference: result.reference, state: result.data };
    },
  };
}

export function createHttpCommandAdapter(): TextileCommandAdapter {
  return {
    mode: "http",
    async execute({ kind, payload, idempotencyKey }) {
      if (!(kind in PROPOSED_COMMAND_KEYS)) throw new Error(`No proposed API command mapping exists for ${kind}.`);
      const command = kind as ProposedCommand;
      const payloadKey = typeof payload.commandKey === "string" ? payload.commandKey.trim() : "";
      const response = await sendProposedCommand<{ id?: string; code?: string; message?: string }>(
        command,
        payload,
        payloadKey || idempotencyKey || crypto.randomUUID(),
      );
      return { ok: true, message: response.message ?? "The API returned a command response.", reference: response.id ?? response.code };
    },
  };
}

const PROPOSED_COMMAND_KEYS = {
  "receive-yarn": true,
  "create-order": true,
  "approve-order": true,
  "release-plan": true,
  "assign-machine": true,
  "operation-transition": true,
  "record-output": true,
  "machine-status": true,
  "record-downtime": true,
  "inspect-roll": true,
  "start-rework": true,
  "complete-rework": true,
  "create-shipment": true,
  "confirm-dispatch": true,
  "mark-read": true,
} as const;

export function createHttpReadAdapter() {
  return {
    mode: "http" as const,
    read<T>(path: string, signal?: AbortSignal): Promise<T> {
      return request<T>("GET", path, { signal });
    },
  };
}
