const fs = require('fs');
const path = require('path');
const parser = require('fast-xml-parser');
const j2xParser = require("fast-xml-parser").j2xParser;

const options = {
    ignoreAttributes: false,
};

const xmlData = fs.readFileSync(path.join(__filename, '..', '..', 'node_modules', '@primer', 'octicons', 'build', 'svg', 'git-branch-16.svg')).toString();
console.log(xmlData);
if (parser.validate(xmlData) !== true) {
    exit(1);
}

const jsonObj = parser.parse(xmlData, options);
console.log(JSON.stringify(jsonObj));

const json2XmlParser = new j2xParser(options);

jsonObj.svg.path["@_fill"] = "#909090";
const xml = json2XmlParser.parse(jsonObj);
console.log(xml);
fs.writeFileSync(path.join(__filename, '..', '..', 'resources', 'branch.svg'), xml);