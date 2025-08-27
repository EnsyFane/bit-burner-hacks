import { NS } from "@ns";

export async function main(ns: NS) {
    const server = ns.getHostname();
    ns.print(`INFO: Current server: ${server}`);

    
}