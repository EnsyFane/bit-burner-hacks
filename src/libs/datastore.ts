import { NS } from "@ns";

export function getData(ns: NS, key: string): any {
    if (ns.fileExists("datastore.json")) {
        const fileContent = ns.read("datastore.json");
        if (fileContent) {
            const data = JSON.parse(fileContent);
            return data[key];
        }
    }
    return null;
}

export function setData(ns: NS, key: string, value: any): void {
    let data: { [key: string]: any } = {};
    if (ns.fileExists("datastore.json")) {
        const fileContent = ns.read("datastore.json");
        if (fileContent) {
            data = JSON.parse(fileContent);
        }
    }
    data[key] = value;
    ns.write("datastore.json", JSON.stringify(data), "w");
}
