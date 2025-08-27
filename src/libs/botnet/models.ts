export interface BotCommand {
    id: string;
    target: string;
    action: BotAction;
    args?: any[];
    timestamp: number;
}

export enum BotAction {
    Hack = "hack",
    Grow = "grow",
    Weaken = "weaken",
    Shutdown = "shutdown",
    Ping = "ping",
}

export interface BotResponse {
    botId: string;
    commandId: string;
    data?: any;
    success: boolean;
    timestamp: number;
}

export enum BotChannels {
    Command = 1,
    Response = 2,
    Status = 3,
}

export const EMPTY_CHANNEL_DATA = "NULL PORT DATA";