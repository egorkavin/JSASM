const table = require('table').table;
const fs = require('fs');
let {SegRegTable, segmentsTable, variablesTable} = require('./commandsInfo');

function toDecimal(num) {
    switch (num.slice(-1)) {
        case 'B':
            return parseInt(num, 2);
        case 'H':
            return parseInt(num, 16);
        default:
            return parseInt(num, 10);
    }
}

function getId(tokenObject, opPos) {
    let opBeg = tokenObject.sentenceStructure.operands[opPos][0];
    let opEnd = tokenObject.sentenceStructure.operands[opPos][1] + opBeg - 1;
    for (let i = opBeg; i < opEnd; i++) {
        if (tokenObject.tokens[i].type === 'Identifier') {
            return tokenObject.tokens[i].lexeme;
        }
    }
}

function hasId(tokenObject, opPos) {
    let opBeg = tokenObject.sentenceStructure.operands[opPos][0];
    return tokenObject.tokens[opBeg].type === 'Identifier';
}

function getRegToken(tokenObject, opPos) {
    let opBeg = tokenObject.sentenceStructure.operands[opPos][0];
    let opEnd = tokenObject.sentenceStructure.operands[opPos][1] + opBeg - 1;
    for (let i = opBeg; i < opEnd; i++) {
        if (tokenObject.tokens[i].type.split(' ')[0] === 'Register') {
            return tokenObject.tokens[i];
        }
    }
}

function getHexValue(src) {
    return '0'.repeat(4 - src.toString(16).length) + src.toString(16).toUpperCase()
}

function printSegRegTable(file) {
    let data = Object.entries(SegRegTable);
    data.unshift(['Segment register', 'Destination']);
    fs.appendFileSync(file, table(data));
}

function printSegmentTable(file) {
    let data = [['Segment name', 'Bit depth', 'Offset']];
    for (let segment of segmentsTable) {
        segment.offset = getHexValue(segment.offset);
        data.push(Object.values(segment));
    }
    fs.appendFileSync(file, table(data));
}

function printVarTable(file) {
    let data = [['Name', 'Type', 'Value', 'Segment']];
    for (let variable of variablesTable) {
        variable.value = getHexValue(variable.value);
        data.push(Object.values(variable));
    }
    fs.appendFileSync(file, table(data));
}

module.exports = {toDecimal, getId, hasId, getRegToken, getHexValue, printSegRegTable, printSegmentTable, printVarTable};