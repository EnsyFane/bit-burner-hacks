import { NS } from "@ns";

/** Enum for listing modes */
enum ListMode {
    All,
    Hacked,
    NotHacked
}

const cyan = "\u001b[36m";
const red = "\u001b[31m";
const reset = "\u001b[0m";
const HACKED = `${cyan}HACKED${reset}`;
const NOT_HACKED = `${red}NOT HACKED${reset}`;

/** 
 * Spreads a script to all available hacked servers or just lists them.
 * @param ns The Netscript API object.
 */
export async function main(ns: NS) {
    const args = ns.args;
    if (args.length < 1 || typeof args[0] !== "string") {
        ns.tprint(`ERROR: Invalid arguments. Use "run ${ns.getScriptName()} help" for more information.`);
        return; 
    }

    const command = args[0] as string;
    switch (command) {
        case "help":
            displayHelp(ns);
            return;
        case "spread":
            if (args.length < 2 || typeof args[1] !== "string") {
                ns.tprint(`ERROR: No script specified. Usage: run ${ns.getScriptName()} spread <script>`);
                return; 
            }
            spreadScript(ns, args[1] as string);
            return;
        case "list":
            const mode = parseListMode(args[1]);
            listServers(ns, mode);
            return;
        default:
            ns.tprint(`ERROR: Unknown command "${command}". Use "run ${ns.getScriptName()} help" for more information.`);
            return;
    }
}

/**
 * Displays help information for the script.
 * @param ns The Netscript API object.
 */
function displayHelp(ns: NS) {
    const name = ns.getScriptName();

    ns.tprint(`
    run ${name} <command>

    Description:
        Script to list servers and manage scripts on hacked servers.

    Usage:
        run ${name} help                            - Show this help message.
        run ${name} spread <script>                 - Spread the specified script to all hacked servers and start it.
        run ${name} spread <script> --no-start      - Spread the specified script to all hacked servers without starting it.
        run ${name} list                            - List all known servers.
        run ${name} list hacked                     - List all hacked servers.
        run ${name} list not-hacked                 - List all not hacked servers.
    `);
}

/**
 * Orchestrates the spreading of a script to all hacked servers.
 * @param ns The Netscript API object.
 * @param script The local path to the script to spread.
 */
function spreadScript(ns: NS, script: string) {
    if (!ns.fileExists(script)) {
        ns.tprint(`ERROR: Script not found at ${script}`);
        return;
    }

    let shouldStartScript = true;
    for (const arg of ns.args) {
        if (typeof arg === "string" && arg.toLowerCase() === "--no-start") {
            shouldStartScript = false;
            ns.tprint(`WARN: Script will not be started on hacked servers.`);
        }
    }

    ns.tprint(`INFO: Discovering hacked servers...`);
    const hackedServers = getAllServers(ns, ListMode.Hacked);
    ns.tprint(`INFO: Found ${hackedServers.length} hacked servers.`);

    ns.tprint(`INFO: Deploying script to hacked servers...`);
    deployScript(ns, hackedServers, script, shouldStartScript);
    ns.tprint(`INFO: Deployment complete.`);
}

/**
 * Parses the list mode from command arguments.
 * @param arg The argument to parse
 * @returns The corresponding ListMode
 */
function parseListMode(arg: unknown): ListMode {
    if (typeof arg !== "string") {
        return ListMode.All;
    }
    
    const modeMap: Record<string, ListMode> = {
        "hacked": ListMode.Hacked,
        "not-hacked": ListMode.NotHacked,
        "all": ListMode.All
    };
    
    return modeMap[arg.toLowerCase()] ?? ListMode.All;
}

/**
 * Lists servers based on the specified mode.
 * @param ns The Netscript API object.
 * @param mode The mode to list servers in.
 */
function listServers(ns: NS, mode: ListMode) {
    ns.tprint(`INFO: Listing servers in mode: ${ListMode[mode]}`);
    const servers = getAllServers(ns, mode);
    ns.tprint(`INFO: Servers found: ${servers.length}`);
    for (const server of servers) {
        ns.tprint(` - ${server} - ${ns.hasRootAccess(server) ? HACKED : NOT_HACKED}`);
    }
}

/**
 * Get a list of servers starting from home based on the specified mode.
 * @param ns The Netscript API object.
 * @param mode The mode to filter servers.
 * @returns A list of all servers except for home.
 */
function getAllServers(ns: NS, mode: ListMode): string[] {
    const visited = new Set<string>();
    const toVisit = ["home"];
    const toReturn: string[] = [];

    while (toVisit.length > 0) {
        const currentHost = toVisit.pop()!;
        if (visited.has(currentHost)) {
            continue;
        }
        visited.add(currentHost);
        // ns.tprint(`Visiting ${currentHost}`);

        if (currentHost !== "home") {
            const hacked = ns.hasRootAccess(currentHost);
            if (mode === ListMode.All){
                toReturn.push(currentHost);
            }
            else {
                if (hacked && mode === ListMode.Hacked) {
                    toReturn.push(currentHost);
                } else if (!hacked && mode === ListMode.NotHacked) {
                    toReturn.push(currentHost);
                }
            }
        }

        const neighbors = ns.scan(currentHost);
        // ns.tprint(`Found ${neighbors.length} neighbors of ${currentHost}`);
        toVisit.push(...neighbors);
    }

    return toReturn;
}

/**
 * Deploys the specified script to the given servers.
 * @param ns The Netscript API object.
 * @param servers A list of servers to deploy to.
 * @param scriptPath The local path to the script.
 * @param shouldStartScript Whether to start the script after deployment.
 */
function deployScript(ns: NS, servers: string[], scriptPath: string, shouldStartScript: boolean) {
    for (const server of servers) {
        ns.tprint(`Deploying script to ${server}...`);
        ns.scriptKill(scriptPath, server);
        const uploaded = ns.scp(scriptPath, server);
        if (uploaded) {
            if (shouldStartScript) {
                const deployed = ns.exec(scriptPath, server);
                if (!deployed) {
                    ns.tprint(`ERROR: Failed to start script on ${server}. Most likely the server does not have enough RAM.`);
                }
            }
        } else {
            ns.tprint(`ERROR: Failed to upload script to ${server}.`);
        }
    }
}
