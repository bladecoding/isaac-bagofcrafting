import convert = require('xml-js');
import { Item, ItemPool } from "./Isaac";

export class XmlParser {
    static loadPools(xml: string) {
        let json = <any>convert.xml2js(xml, { compact: true, ignoreCdata: true, ignoreComment: true, ignoreDeclaration: true, ignoreDoctype: true, ignoreInstruction: true, alwaysArray: true });
        return <ItemPool[]>json.ItemPools[0].Pool.map((e: any) => ({
            name: e._attributes.Name,
            items: e.Item.map((i: any) => ({
                id: Number(i._attributes.Id),
                weight: Number(i._attributes.Weight)
            }))
        }));
    }
    static loadMeta(xml: string) {
        let json = <any>convert.xml2js(xml, { compact: true, ignoreCdata: true, ignoreComment: true, ignoreDeclaration: true, ignoreDoctype: true, ignoreInstruction: true, alwaysArray: true });
        let qualities = json.items[0].item.map((e: any) => ({
            id: Number(e._attributes.id),
            quality: Number(e._attributes.quality),
        }));
        return qualities.reduce((h: any, i: any) => (h.set(i.id, i.quality), h), new Map<Number, Item>());
    }
    static loadItems(xml: string) {
        let json = <any>convert.xml2js(xml, { compact: false, ignoreCdata: true, ignoreComment: true, ignoreDeclaration: true, ignoreDoctype: true, ignoreInstruction: true, alwaysArray: true });
        let items = <Item[]>json.elements[0].elements
            .map((e: any) => ({ type: e.name, name: e.attributes.name, id: Number(e.attributes.id) }));
        items = items.filter(i => i.type == "active" || i.type == "passive" || i.type == "familiar");
        return items.reduce((h, i) => (h.set(i.id, i), h), new Map<number, Item>());
    }
}