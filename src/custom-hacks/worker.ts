import { NS } from "@ns";

/**
 * Worker script for the C&C Worker.
 */
export async function main(ns: NS) {
    ns.print(`INFO: Worker script started on ${ns.getHostname()}`);
}
