import { NS } from "@ns";

export enum ConsoleColor {
    Cyan = "\u001b[36m",
    Red = "\u001b[31m",
    Reset = "\u001b[0m",
}

export function WriteTerminal(ns: NS, message: string, color: ConsoleColor) {
    ns.tprint(`${color}${message}${ConsoleColor.Reset}`);
}

export function WriteConsole(ns: NS, message: string, color: ConsoleColor) {
    ns.print(`${color}${message}${ConsoleColor.Reset}`);
}

export function GetColoredText(text: string, color: ConsoleColor): string {
    return `${color}${text}${ConsoleColor.Reset}`;
}