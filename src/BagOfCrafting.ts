import _ = require('lodash');
import {ItemPool, ItemQualities} from './Isaac';
import {Rng} from './Rng';

// dictionary of component id (stored as a string) to amount of that component
type MatCollection = { [index: string]: number }

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

        let hardcoded = BagOfCrafting.JsIncorrectRecipes.get(components.toString());
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
            {idx: 0, weight: 1},
            {idx: 1, weight: 2},
            {idx: 2, weight: 2},
            {idx: 4, weight: compCounts[4] * 10},
            {idx: 3, weight: compCounts[3] * 10},
            {idx: 5, weight: compCounts[6] * 5},
            {idx: 8, weight: compCounts[5] * 10},
            {idx: 12, weight: compCounts[7] * 10},
            {idx: 9, weight: compCounts[25] * 10},
        ];

        if (compCounts[8] + compCounts[1] + compCounts[12] + compCounts[15] == 0)
            poolWeights.push({idx: 26, weight: compCounts[23] * 10});

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

    /**
     Generates all possible recipes (unique combinations of 8 components) from a given arbitrary sized list of components. Then uses
     BagOfCrafting.calculate() to obtain the id of each created item. Returns a mapping of item id to component list.
     */
    calculateAllRecipes(components: number[]): Map<number, number[]> {

        // count how many of each component we have
        let toMatCollection = (matArr: number[]) => {
            let ans: MatCollection = {};
            for (let i of matArr) {
                if (i in ans) ans[i] += 1;
                else ans[i] = 1;
            }
            return ans
        };

        // convert back to component array for giving to calculate()
        let toNumArr = (matCol: MatCollection) => {
            let ans = [];
            for (let mat of Object.keys(matCol)) {
                for (let i = 0; i < matCol[mat]; i++)
                    ans.push(parseInt(mat))
            }
            return ans;
        };

        // get all possible unique combinations of length 8
        let recipeArr: number[][] = this._getPartialRecipe(toMatCollection(components), 8).map(toNumArr);

        // call calculate() on each recipe
        let ans = new Map<number, number[]>();
        for (let r of recipeArr) {
            let itemId: number = this.calculate(r);
            ans.set(itemId, r);
        }

        return ans
    }

    private _getPartialRecipe(mats: MatCollection, remaining: number): MatCollection[] {
        let matKeys: string[] = Object.keys(mats);
        let curr: string = matKeys[0];

        if (matKeys.length == 0 || remaining == 0) return [];

        let totalMats = _.reduce(mats, (r, v) => r + v, 0);
        if (totalMats < remaining) return []; // if fewer mats than requested then can't make anything
        if (totalMats == remaining) return [mats]; // if exact number of mats then we know we can only make one thing so can return early

        // if we only have one type of mat then all we can do is return <remaining> counts of that mat.
        // if mats[curr] < remaining we would have returned already so this is ok to do
        if (matKeys.length == 1) {
            let ans: MatCollection = {};
            ans[curr] = remaining;
            return [ans];
        }

        let ans: MatCollection[] = [];
        for (let i = mats[curr]; i >= 0; i--) {

            // if we have more of the current component than there are missing components, then we should only add the recipe that uses <remaining> of that
            // component, then continue at i=remaining-1
            if (i >= remaining) {
                let a: MatCollection = {}; // this is kinda gross, fix?
                a[curr] = remaining;
                ans.push(a);
                i = remaining;
                continue;
            }

            // get all possible completions of the recipe if we used i of the current mat
            let partials = this._getPartialRecipe(_.pick(mats, _.tail(matKeys)), remaining - i);
            if (partials === []) break; // couldn't make anything using only i of the current mat, so won't be able to make anything with even fewer

            // add the recipe to the returned list. if we didn't use the current component in this iteration, don't add it to the recipe
            if (i == 0) ans.push(...partials);
            else {
                for (let p of partials) {
                    p[curr] = i;
                    ans.push(p)
                }
            }
        }

        return ans;
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

    /**
     * These are recipes that JS gets wrong due to rounding differences between single and double floating precision.
     */
    static readonly JsIncorrectRecipes = new Map<string, number>([
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