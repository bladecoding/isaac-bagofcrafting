import _ = require('lodash');
import { ItemPool, ItemQualities } from './Isaac';
import { Rng } from './Rng';

export class BagOfCrafting {

    private pools: ItemPool[];
    private itemQualities: ItemQualities;
    private maxItemId: number;

    constructor(pools: ItemPool[], itemQualities: ItemQualities) {
        this.pools = pools;
        this.itemQualities = itemQualities;
        this.maxItemId = _.max(Array.from(this.itemQualities.keys()))!;
    }

    calculate(components: number[]) {
        let rng = new Rng(0x77777770, [0, 0, 0]);

        if (components == null || components.length != 8)
            throw new Error("Invalid components");

        components = _.orderBy(components, e => e);

        let hardcoded = BagOfCrafting.HardCodedRecipes.get(components.toString());
        if (hardcoded != null)
            return hardcoded;

        let compTotalWeight = 0;
        let compCounts = new Array(BagOfCrafting.ComponentShifts.length).fill(0);
        for (let compId of components) {
            ++compCounts[compId];
            compTotalWeight += BagOfCrafting.ComponentWeights[compId];
            // Can apply shifts here because components is sorted
            rng.shift = BagOfCrafting.ComponentShifts[compId];
            rng.next();
        }
        rng.shift = BagOfCrafting.ComponentShifts[6];

        let poolWeights = [
            { idx: 0, weight: 1 },
            { idx: 1, weight: 2 },
            { idx: 2, weight: 2 },
            { idx: 4, weight: compCounts[4] * 10 },
            { idx: 3, weight: compCounts[3] * 10 },
            { idx: 5, weight: compCounts[6] * 5 },
            { idx: 8, weight: compCounts[5] * 10 },
            { idx: 12, weight: compCounts[7] * 10 },
            { idx: 9, weight: compCounts[25] * 10 },
        ];

        if (compCounts[8] + compCounts[1] + compCounts[12] + compCounts[15] == 0)
            poolWeights.push({ idx: 26, weight: compCounts[23] * 10 });

        let totalWeight = 0;
        let itemWeights: number[] = new Array(this.maxItemId + 1).fill(0);

        for (let poolWeight of poolWeights) {
            if (poolWeight.weight <= 0)
                continue;

            let qualityMin = 0;
            let qualityMax = 1;
            let n = compTotalWeight;
            if (poolWeight.idx >= 3 && poolWeight.idx <= 5)
                n -= 5;

            if (n > 34) {
                qualityMin = 4;
                qualityMax = 4;
            } else if (n > 30) {
                qualityMin = 3;
                qualityMax = 4;
            } else if (n > 26) {
                qualityMin = 2;
                qualityMax = 4;
            } else if (n > 22) {
                qualityMin = 1;
                qualityMax = 4;
            } else if (n > 18) {
                qualityMin = 1;
                qualityMax = 3;
            } else if (n > 14) {
                qualityMin = 1;
                qualityMax = 2;
            } else if (n > 8) {
                qualityMin = 0;
                qualityMax = 2;
            }

            let pool = this.pools[poolWeight.idx];
            for (let item of pool.items) {
                var quality = this.itemQualities.get(item.id)!;
                if (quality < qualityMin)
                    continue;
                if (quality > qualityMax)
                    continue;

                var w = Math.fround(item.weight * poolWeight.weight);
                itemWeights[item.id] = Math.fround(itemWeights[item.id] + w);
                totalWeight = Math.fround(totalWeight + w);
            }
        }

        if (totalWeight <= 0)
            return 25;

        let target = Math.fround(rng.nextFloat() * totalWeight);
        for (let i = 0; i < itemWeights.length; i++) {
            if (target < itemWeights[i])
                return i;
            target = Math.fround(target - itemWeights[i]);
        }

        return 25;
    }

    static readonly ComponentShifts: [number, number, number][] = [
        [0x00000001, 0x00000005, 0x00000010],
        [0x00000001, 0x00000005, 0x00000013],
        [0x00000001, 0x00000009, 0x0000001D],
        [0x00000001, 0x0000000B, 0x00000006],
        [0x00000001, 0x0000000B, 0x00000010],
        [0x00000001, 0x00000013, 0x00000003],
        [0x00000001, 0x00000015, 0x00000014],
        [0x00000001, 0x0000001B, 0x0000001B],
        [0x00000002, 0x00000005, 0x0000000F],
        [0x00000002, 0x00000005, 0x00000015],
        [0x00000002, 0x00000007, 0x00000007],
        [0x00000002, 0x00000007, 0x00000009],
        [0x00000002, 0x00000007, 0x00000019],
        [0x00000002, 0x00000009, 0x0000000F],
        [0x00000002, 0x0000000F, 0x00000011],
        [0x00000002, 0x0000000F, 0x00000019],
        [0x00000002, 0x00000015, 0x00000009],
        [0x00000003, 0x00000001, 0x0000000E],
        [0x00000003, 0x00000003, 0x0000001A],
        [0x00000003, 0x00000003, 0x0000001C],
        [0x00000003, 0x00000003, 0x0000001D],
        [0x00000003, 0x00000005, 0x00000014],
        [0x00000003, 0x00000005, 0x00000016],
        [0x00000003, 0x00000005, 0x00000019],
        [0x00000003, 0x00000007, 0x0000001D],
        [0x00000003, 0x0000000D, 0x00000007],
        [0x00000003, 0x00000017, 0x00000019],
        [0x00000003, 0x00000019, 0x00000018],
        [0x00000003, 0x0000001B, 0x0000000B],
        [0x00000004, 0x00000003, 0x00000011],
        [0x00000004, 0x00000003, 0x0000001B],
        [0x00000004, 0x00000005, 0x0000000F],
        [0x00000005, 0x00000003, 0x00000015],
        [0x00000005, 0x00000007, 0x00000016],
        [0x00000005, 0x00000009, 0x00000007],
        [0x00000005, 0x00000009, 0x0000001C],
        [0x00000005, 0x00000009, 0x0000001F],
        [0x00000005, 0x0000000D, 0x00000006],
        [0x00000005, 0x0000000F, 0x00000011],
        [0x00000005, 0x00000011, 0x0000000D],
        [0x00000005, 0x00000015, 0x0000000C],
        [0x00000005, 0x0000001B, 0x00000008],
        [0x00000005, 0x0000001B, 0x00000015],
        [0x00000005, 0x0000001B, 0x00000019],
        [0x00000005, 0x0000001B, 0x0000001C],
        [0x00000006, 0x00000001, 0x0000000B],
        [0x00000006, 0x00000003, 0x00000011],
        [0x00000006, 0x00000011, 0x00000009],
        [0x00000006, 0x00000015, 0x00000007],
        [0x00000006, 0x00000015, 0x0000000D],
        [0x00000007, 0x00000001, 0x00000009],
        [0x00000007, 0x00000001, 0x00000012],
        [0x00000007, 0x00000001, 0x00000019],
        [0x00000007, 0x0000000D, 0x00000019],
        [0x00000007, 0x00000011, 0x00000015],
        [0x00000007, 0x00000019, 0x0000000C],
        [0x00000007, 0x00000019, 0x00000014],
        [0x00000008, 0x00000007, 0x00000017],
        [0x00000008, 0x00000009, 0x00000017],
        [0x00000009, 0x00000005, 0x0000000E],
        [0x00000009, 0x00000005, 0x00000019],
        [0x00000009, 0x0000000B, 0x00000013],
        [0x00000009, 0x00000015, 0x00000010],
        [0x0000000A, 0x00000009, 0x00000015],
        [0x0000000A, 0x00000009, 0x00000019],
        [0x0000000B, 0x00000007, 0x0000000C],
        [0x0000000B, 0x00000007, 0x00000010],
        [0x0000000B, 0x00000011, 0x0000000D],
        [0x0000000B, 0x00000015, 0x0000000D],
        [0x0000000C, 0x00000009, 0x00000017],
        [0x0000000D, 0x00000003, 0x00000011],
        [0x0000000D, 0x00000003, 0x0000001B],
        [0x0000000D, 0x00000005, 0x00000013],
        [0x0000000D, 0x00000011, 0x0000000F],
        [0x0000000E, 0x00000001, 0x0000000F],
        [0x0000000E, 0x0000000D, 0x0000000F],
        [0x0000000F, 0x00000001, 0x0000001D],
        [0x00000011, 0x0000000F, 0x00000014],
        [0x00000011, 0x0000000F, 0x00000017],
        [0x00000011, 0x0000000F, 0x0000001A]
    ];
    static readonly ComponentWeights = [
        0x00000000,
        0x00000001,
        0x00000004,
        0x00000005,
        0x00000005,
        0x00000005,
        0x00000005,
        0x00000001,
        0x00000001,
        0x00000003,
        0x00000005,
        0x00000008,
        0x00000002,
        0x00000005,
        0x00000005,
        0x00000002,
        0x00000006,
        0x0000000A,
        0x00000002,
        0x00000004,
        0x00000008,
        0x00000002,
        0x00000002,
        0x00000004,
        0x00000004,
        0x00000002
    ];

    static readonly HardCodedRecipes = new Map<string, number>([
        [([1, 2, 3, 6, 13, 18, 24, 24]).toString(), 161],
        [([7, 8, 13, 17, 21, 22, 23, 24]).toString(), 218],
        [([1, 1, 5, 7, 11, 14, 19, 19]).toString(), 225],
        [([1, 2, 5, 10, 10, 12, 12, 15]).toString(), 237],
        [([1, 2, 2, 9, 14, 14, 22, 25]).toString(), 248],
        [([5, 7, 8, 13, 13, 15, 18, 23]).toString(), 266],
        [([1, 4, 4, 6, 8, 9, 16, 25]).toString(), 283],
        [([1, 2, 2, 6, 7, 7, 12, 23]).toString(), 295],
        [([1, 1, 1, 2, 7, 7, 8, 22]).toString(), 312],
        [([2, 2, 4, 6, 9, 9, 12, 24]).toString(), 321],
        [([9, 10, 10, 15, 18, 18, 21, 25]).toString(), 378],
        [([8, 9, 10, 12, 15, 16, 22, 23]).toString(), 395],
        [([5, 8, 9, 14, 14, 18, 22, 24]).toString(), 491],
        [([2, 3, 7, 7, 8, 10, 17, 22]).toString(), 498],
        [([7, 7, 7, 16, 17, 18, 25, 25]).toString(), 536],
        [([1, 1, 2, 9, 13, 15, 18, 19]).toString(), 541],
        [([1, 16, 20, 20, 21, 21, 22, 25]).toString(), 559],
        [([4, 8, 8, 9, 15, 19, 23, 24]).toString(), 559],
        [([4, 4, 8, 13, 23, 23, 23, 23]).toString(), 581],
        [([2, 6, 7, 7, 7, 10, 14, 16]).toString(), 583],
        [([2, 2, 6, 9, 14, 21, 21, 24]).toString(), 604],
        [([1, 2, 7, 7, 23, 25, 25, 25]).toString(), 608],
        [([4, 5, 10, 14, 18, 18, 22, 22]).toString(), 657],
        [([6, 7, 8, 10, 10, 10, 19, 24]).toString(), 663],
    ])
}