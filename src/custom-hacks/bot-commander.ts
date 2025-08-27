import { NS, NetscriptPort } from "@ns";
import { BotCommand, BotAction, BotChannels, EMPTY_CHANNEL_DATA, BotResponse } from "../libs/botnet/models";
import { getData, setData } from "../libs/datastore";
import { ConsoleColor, WriteConsole, GetColoredText } from "../libs/console";

let commandPort: NetscriptPort;
let responsePort: NetscriptPort;
const knownBots: Set<string> = new Set();

/**
 * Bot network message sender.
 */
export async function main(ns: NS) {
    ns.clearLog();
    if (ns.args.length === 0) {
        ns.print(`ERROR: No command specified.`);
        displayHelp(ns);
        return;
    }
    if (ns.args.length < 2) {
        ns.print(`ERROR: invalid argument format.`);
        return;
    }
    if (typeof ns.args[0] !== "string") {
        ns.print(`ERROR: Invalid bot ID specified.`);
        return;
    }
    if(typeof ns.args[1] !== "string") {
        ns.print(`ERROR: Invalid command specified.`);
        return;
    }

    ns.disableLog("ALL");

    const botId = ns.args[0] as string;
    const commandStr = ns.args[1] as string;
    const otherArgs = ns.args.slice(2).filter(arg => arg !== "--wait-known");

    const storedBots = getKnownBots(ns);
    for (const bot of storedBots) {
        knownBots.add(bot);
    }

    commandPort = ns.getPortHandle(BotChannels.Command);
    commandPort.clear();
    responsePort = ns.getPortHandle(BotChannels.Response);
    responsePort.clear();

    await handleCommand(ns, botId, commandStr, otherArgs);

    ns.print(`Script finished.`)
}

/**
 * Displays help information for the bot commander script.
 * @param ns The Netscript API object.
 */
function displayHelp(ns: NS) {
    const name = ns.getScriptName();

    ns.print(`
    run ${name} <bot-id> <command> [arg1, arg2 ...] [--wait-known]

    Description:
        Sends commands to the botnet.
        <bot-id> can be either a hostname or "ALL"

    Commands:
        ping                       - Checks if bot is alive.
        hack [target]              - Commands bot to hack the specified target server.
        grow [target]              - Commands bot to grow the specified target server.
        weaken [target]            - Commands bot to weaken the specified target server.
        shutdown                   - Commands bot to shut down gracefully.

    Flags:
        --wait-known               - When using "ALL", stop waiting once all known bots respond.

    Usage:
        run ${name}                                 - Show this help message.

        run ${name} ALL ping                        - Ping all bots.
        run ${name} ALL ping --wait-known           - Ping all bots, stop after known bots respond.
        run ${name} n00dles ping                    - Ping n00dles bot.

        run ${name} ALL hack n00dles                - All bots hack n00dles.
        run ${name} n00dles hack n00dles            - n00dles bot hack n00dles.

        run ${name} ALL grow n00dles                - All bots grow n00dles.
        run ${name} n00dles grow n00dles            - n00dles bot grow n00dles.

        run ${name} ALL weaken n00dles              - All bots weaken n00dles.
        run ${name} n00dles weaken n00dles          - n00dles bot weaken n00dles.
    `);
}

/**
 * Handles command execution by determining if it's a broadcast or single bot command.
 * @param ns The Netscript API object.
 * @param botId The target bot ID or "ALL" for broadcast.
 * @param commandStr The command string to execute.
 * @param args Additional arguments for the command.
 */
async function handleCommand(ns: NS, botId: string, commandStr: string, args: any[]) {
    const isBroadcast = botId.toLowerCase() === "all";
    const waitKnown = ns.args.includes("--wait-known");
    const commandId = sendCommand(ns, botId, commandStr, args);
    if (isBroadcast) {
        await handleBroadcastCommand(ns, commandId, waitKnown);
    } else {
        await handleNonBroadcastCommand(ns, commandId);
    }
}

/**
 * Handles broadcast commands sent to all bots with timeout and response tracking.
 * @param ns The Netscript API object.
 * @param commandId The unique identifier for the command.
 * @param waitKnown Whether to stop waiting once all known bots respond.
 */
async function handleBroadcastCommand(ns: NS, commandId: string, waitKnown: boolean = false) {
    let responses: string[] = [];
    const startTime = Date.now();
    const timeout = 30000; // 30 seconds timeout for all bots to respond

    while (Date.now() - startTime < timeout) {
        if (waitKnown && knownBots.size > 0 && responses.length >= knownBots.size) {
            ns.print(`INFO: All ${knownBots.size} known bots have responded. Stopping early due to --wait-known flag.`);
            break;
        }

        ns.print(`Waiting for responses for ${Math.round((timeout - (Date.now() - startTime)) / 1000)} more seconds...`);
        const response = await receiveResponse(ns, commandId);
        if (response) {
            appendKnownBots(ns, response.botId);
            responses.push(response.botId);
            if (!response.success) {
                ns.print(`ERROR: Command ${commandId} failed on bot ${response.botId}: ${response.data}`);
            }
        }
    }

    if (responses.length === 0) {
        ns.print(`ERROR: No responses received within ${timeout / 1000} seconds.`);
        setKnownBots(ns, []);
    }

    const unresponsiveBots = knownBots.difference(new Set(responses));
    if (unresponsiveBots.size > 0) {
        ns.print(`WARN: The following bots did not respond: ${Array.from(unresponsiveBots).map(bot => GetColoredText(bot, ConsoleColor.Red)).join(", ")}`);
    }
}

/**
 * Handles commands sent to a single specific bot.
 * @param ns The Netscript API object.
 * @param commandId The unique identifier for the command.
 */
async function handleNonBroadcastCommand(ns: NS, commandId: string) {
    const response = await receiveResponse(ns, commandId);
    if (response) {
        appendKnownBots(ns, response.botId);
        if (!response.success) {
            ns.print(`ERROR: Command ${commandId} failed on bot ${response.botId}: ${response.data}`);
        }
    } else {
        ns.print(`ERROR: No response received for command ${commandId}.`);
    }
}

/**
 * Retrieves the list of known bots from persistent storage.
 * @param ns The Netscript API object.
 * @returns An array of known bot IDs.
 */
function getKnownBots(ns: NS): string[] {
    const result = getData(ns, "knownBots");
    return result ? result : [];
}

/**
 * Saves the list of known bots to persistent storage.
 * @param ns The Netscript API object.
 * @param bots An array of bot IDs to save.
 */
function setKnownBots(ns: NS, bots: string[]) {
    setData(ns, "knownBots", bots);
}

/**
 * Adds a new bot to the known bots list if it's not already present.
 * @param ns The Netscript API object.
 * @param botId The ID of the bot to add to the known bots list.
 */
function appendKnownBots(ns: NS, botId: string) {
    const bots = getKnownBots(ns);
    if (!bots.includes(botId)) {
        WriteConsole(ns, `Discovered new bot ${botId}. Adding to known bots list.`, ConsoleColor.Cyan);
        bots.push(botId);
        setKnownBots(ns, bots);
    }
}

/**
 * Sends a command to a bot.
 * @param ns The Netscript API object.
 * @param botId The ID of the bot to send the command to.
 * @param commandStr The command to send.
 * @param args The arguments for the command.
 * @returns The ID of the command.
 */
function sendCommand(ns: NS, botId: string, commandStr: string, args: any[]): string {
    let action: BotAction;
    switch (commandStr.toLowerCase()) {
        case "ping":
            action = BotAction.Ping;
            break;
        case "hack":
            action = BotAction.Hack;
            break;
        case "grow":
            action = BotAction.Grow;
            break;
        case "weaken":
            action = BotAction.Weaken;
            break;
        case "shutdown":
            action = BotAction.Shutdown;
            break;
        default:
            ns.print(`ERROR: Unknown command "${commandStr}".`);
            ns.exit();
    }

    const command: BotCommand = {
        id: crypto.randomUUID(),
        target: botId,
        action: action,
        args: args,
        timestamp: Date.now()
    };

    commandPort.write(JSON.stringify(command));
    ns.print(`INFO: Sent command to bot ${botId}: ${JSON.stringify(command)}`);

    return command.id;
}

/**
 * Receives and processes a response from a bot within a specified timeout.
 * @param ns The Netscript API object.
 * @param commandId The unique identifier for the command expecting a response.
 * @param timeout The timeout in milliseconds to wait for a response.
 * @returns The bot response if received within timeout, null otherwise.
 */
async function receiveResponse(ns: NS, commandId: string, timeout: number = 5000): Promise<BotResponse | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        await ns.sleep(500);

        if (responsePort.empty()) {
            continue;
        }

        const rawResponse = responsePort.peek() as string;
        if (rawResponse === EMPTY_CHANNEL_DATA) {
            ns.print(`ERROR: Another instance is already reading the responses from this port(${BotChannels.Response}). Shutting down...`);
            ns.exit();
        }

        try {
            const response: BotResponse = JSON.parse(rawResponse);
            if (response.commandId !== commandId) {
                ns.print(`ERROR: Response port(${BotChannels.Response}) contains response for command ${response.commandId} instead of ${commandId}. Shutting down...`);
                ns.exit();
            }
            responsePort.read(); // Remove the response from the port
            
            ns.print(`INFO: Received response from bot ${GetColoredText(response.botId, ConsoleColor.Cyan)}: ${JSON.stringify(response)}`);
            return response;
        } catch (err) {
            ns.print(`ERROR: Failed to parse response: ${err}`);
            responsePort.read(); // Remove the malformed data
        }
    }
    return null;
}