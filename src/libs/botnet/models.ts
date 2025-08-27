export interface BotCommand {
    id: string;
    target: string;
    action: BotAction;
    args?: any[];
    timestamp: number;
}

export enum BotAction {
    Hack = "hack", // Command to hack a target
    Grow = "grow", // Command to grow a target
    Weaken = "weaken", // Command to weaken a target
    
    Shutdown = "shutdown", // Command to shut down a bot
    Ping = "ping", // Command to ping a bot
    DownloadAndRun = "download-and-run", // Command to download and run a script
    Download = "download", // Command to download a file
    UpdateAll = "update-all", // Command to update all scripts from a central repository
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