import { NS } from "@ns";

export async function main(ns: NS) {
    ns.tprint("Hello, BitBurner!");
    ns.tprint(`Current server: ${ns.getHostname()}`);
}
