import { NS, NetscriptPort } from "@ns";
import { BotChannels, EMPTY_CHANNEL_DATA, BotCommand, BotAction, BotResponse } from "../libs/botnet/models";

let botId: string;
let commandPort: NetscriptPort;
let responsePort: NetscriptPort;

/**
 * Worker script for the C&C Worker.
 */
export async function main(ns: NS) {
    botId = ns.getHostname();
    
    ns.print(`INFO: Bot with id "${botId}" started at ${new Date().toLocaleString()}`);

    commandPort = ns.getPortHandle(BotChannels.Command);
    responsePort = ns.getPortHandle(BotChannels.Response);

    while (true) {
        await commandPort.nextWrite();

        const rawCommand = commandPort.peek() as string;
        if (rawCommand == EMPTY_CHANNEL_DATA) {
            continue;
        }

        try {
            const command: BotCommand = JSON.parse(rawCommand);
            if (command.target !== botId) {
                continue;
            }
            commandPort.read(); // Remove the command from the port
            ns.print(`INFO: Received command: ${rawCommand}`);

            await handleCommand(ns, command);
        }
        catch (err) {
            ns.print(`ERROR: Failed to parse command: ${err}`);
        }
    }
}

async function handleCommand(ns: NS, command: BotCommand) {
    switch (command.action) {
        case BotAction.Ping:
            ns.print(`INFO: Ping command received.`);
            sendResponse(ns, command, true, "Pong");
            break;
        default:
            ns.print(`WARN: Unknown command action: ${command.action}`);
            sendResponse(ns, command, false, `Unknown action: ${command.action}`);
            break;
    }
}

function sendResponse(ns: NS, command: BotCommand, success: boolean, data?: any) {
    const response: BotResponse = {
        botId: botId,
        commandId: command.id,
        success: success,
        data: data,
        timestamp: Date.now()
    };
    responsePort.write(JSON.stringify(response));

    ns.print(`INFO: Sent response for command ${command.id}: ${JSON.stringify(response)}`);
}