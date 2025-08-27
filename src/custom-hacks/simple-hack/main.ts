import { NS } from "@ns";

export async function main(ns: NS) {
    const securityPercentage = 0.99;
    const moneyPercentage = 0.90;

    const server = ns.getHostname();
    ns.print(`INFO: Current server: ${server}`);

    while (true) {
        if (ns.getServerSecurityLevel(server) * securityPercentage > ns.getServerMinSecurityLevel(server)) {
            ns.print(`INFO: Server is above ${securityPercentage * 100}% security threshold. Weakening server: ${server}`);
            await ns.weaken(server);
        } else if (ns.getServerMoneyAvailable(server) < ns.getServerMaxMoney(server) * moneyPercentage) {
            ns.print(`INFO: Server is below ${moneyPercentage * 100}% money threshold. Growing server: ${server}`);
            await ns.grow(server);
        } else {
            ns.print(`INFO: Hacking server: ${server}`);
            const received = await ns.hack(server);
            if (received > 0)
            {
                ns.print(`INFO: Received ${received} from hacking server: ${server}`);
            }
            else {
                ns.print(`WARN: Failed to hack server: ${server}`);
            }
        }
    }
}
