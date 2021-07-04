import fs = require('fs');
import { BagOfCrafting } from './BagOfCrafting';
import { XmlParser } from './XmlParser';

let pools = XmlParser.loadPools(fs.readFileSync('assets/itempools.xml', 'utf8'));
let meta = XmlParser.loadMeta(fs.readFileSync('assets/items_metadata.xml', 'utf8'));
let bc = new BagOfCrafting(pools, meta);


// bc.calculate([1, 2, 3, 6, 13, 18, 24, 24]);
// throw new Error();

// 'aaaaaaaa' to [1,1,1,1,1,1,1,1]
let asciiToNum = (s: string) => s.split('').map(c => c.charCodeAt(0) - 0x61 + 1);

for (let file of fs.readdirSync('F:/bag_of_crafting_recipes')) {
    let id = Number(file.substr(0, file.lastIndexOf('.')));
    let data = fs.readFileSync('F:/bag_of_crafting_recipes/' + file, 'utf8');
    let lines = data.split('\n');
    for (let line of lines) {
        if (line.trim() == '')
            continue;
        if (bc.calculate(asciiToNum(line)) != id) {
            console.log("Wrong type", asciiToNum(line), id, bc.calculate(asciiToNum(line)));
        }
    }
}
console.log('done');