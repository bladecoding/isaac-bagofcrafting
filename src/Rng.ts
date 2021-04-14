export class Rng
{
    seed: number = 0;
    shift: [number, number, number] = [0,0,0];
    next() : number
    {
        let num = this.seed;
        num ^= (num >>> this.shift[0]) & 0xffffffff;
        num ^= (num << this.shift[1]) & 0xffffffff;
        num ^= (num >>> this.shift[2]) & 0xffffffff;
        this.seed = num >>> 0;
        return this.seed;
    }

    constructor(seed: number, shift: [number, number, number])
    {
        this.seed = seed;
        this.shift = shift;
    }

    nextFloat() : number
    {
        const multi = Math.fround(2.3283061589829401E-10);
        return Math.fround(this.next() * multi);
    }
};