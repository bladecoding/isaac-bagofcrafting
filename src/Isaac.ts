export type ItemPoolItem = { id: number, weight: number };
export type ItemPool = { name: string, items: ItemPoolItem[] };
export type ItemQualities = Map<number, number>;
export type Item = { type: string, name: string, id: number };
export type Items = Map<number, Item>;