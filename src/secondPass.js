const tableOfLexemes = require('./lexer');
require('./parser');
const fs = require('fs');
const table = require('table').table;
let {
    getCommand, getOpCodeArr, tableHasVar, getVarValue, reg16Table, getRegValue
} = require('./commandsInfo');
const {
    toDecimal, getId, hasId, getRegToken, getHexValue, printSegRegTable, printSegmentTable, printVarTable
} = require('./commonPassFuncs');
require('./firstPass');

function secondPass() {
    tableOfLexemes.forEach((tokenObject) => {
        tokenObject.bytes = '';
        if (!tokenObject.hasOwnProperty('error')) {
            if (tokenObject.type === 'ID_DEFINITION') {
                if (tokenObject.tokens[2].type === 'Text constant') {
                    tokenObject.tokens[2].lexeme.split('').forEach(char => {
                        char = char.charCodeAt(0).toString(16).toUpperCase();
                        tokenObject.bytes += char.length === 2 ? char + ' ' : '0' + char + ' ';
                    })
                } else {
                    tokenObject.bytes = toDecimal(tokenObject.tokens[2].lexeme).toString(16).toUpperCase();
                    if (tokenObject.bytes.length !== tokenObject.offset * 2) {
                        tokenObject.bytes = '0'.repeat(tokenObject.offset * 2 - tokenObject.bytes.length) + tokenObject.bytes;
                    }
                }
            } else if (tokenObject.type === 'COMMAND') {
                if (tokenObject.hasOwnProperty('prefixSeg')) {
                    tokenObject.bytes += tokenObject.prefixSeg + ': ';
                }
                if (tokenObject.hasOwnProperty('prefix66')) {
                    tokenObject.bytes += '66| '
                }
                if (tokenObject.hasOwnProperty('prefix67')) {
                    tokenObject.bytes += '67| '
                }
                let opcode = getCurrentOpCode(tokenObject.tokens[0].lexeme, tokenObject.operands);
                if (tokenObject.tokens[0].lexeme === 'CLI') {
                    tokenObject.bytes += opcode;
                } else if (tokenObject.tokens[0].lexeme === 'MOV') {
                    opcode = toDecimal(opcode + 'H');
                    opcode += toDecimal(getRegValue(tokenObject.tokens[1].lexeme));
                    opcode = opcode.toString(16).toUpperCase();
                    let imm = tokenObject.tokens[tokenObject.tokens.length - 1].lexeme;
                    imm = toDecimal(imm).toString(16).toUpperCase();
                    imm = imm.length === 2 ? imm : '0' + imm;
                    tokenObject.bytes += opcode + ' ' + imm;
                } else if (tokenObject.tokens[0].lexeme === 'MUL') {
                    tokenObject.bytes += opcode + ' ';
                    let mod = '10';
                    let reg = '100';
                    let regFromOp = tokenObject.tokens[tokenObject.tokens.length - 2].lexeme;
                    let rm = tokenObject.hasOwnProperty('prefix67') ? reg16Table[regFromOp] : getRegValue(regFromOp);
                    rm = rm.slice(0, -1);
                    let modrm = modrmToHex(mod, reg, rm);
                    modrm = modrm.length === 2 ? modrm : '0' + modrm;
                    tokenObject.bytes += modrm;

                    if (tokenObject.hasSib) {
                        tokenObject.bytes += ' 24'
                    }

                    let id = getVarValue(getId(tokenObject, 0));
                    let idValue = tokenObject.hasOwnProperty('prefix67') ? '0'.repeat(4 - id.length) + id : '0'.repeat(8 - id.length) + id;
                    tokenObject.bytes += ' ' + idValue + 'r';
                } else if (tokenObject.tokens[0].lexeme === 'DIV') {
                    tokenObject.bytes += opcode + ' ';
                    let mod = '11';
                    let reg = '110';
                    let regFromOp = tokenObject.tokens[tokenObject.tokens.length - 1].lexeme;
                    let rm = getRegValue(regFromOp);
                    rm = rm.slice(0, -1);
                    let modrm = modrmToHex(mod, reg, rm);
                    modrm = modrm.length === 2 ? modrm : '0' + modrm;
                    tokenObject.bytes += modrm;
                } else if (tokenObject.tokens[0].lexeme === 'CMP') {
                    tokenObject.bytes += opcode + ' ';
                    let mod = '11';
                    let reg1FromOp = tokenObject.tokens[1].lexeme;
                    let reg2FromOp = tokenObject.tokens[3].lexeme;
                    let reg = getRegValue(reg1FromOp);
                    let rm = getRegValue(reg2FromOp);
                    reg = reg.slice(0, -1);
                    rm = rm.slice(0, -1);
                    let modrm = modrmToHex(mod, reg, rm);
                    modrm = modrm.length === 2 ? modrm : '0' + modrm;
                    tokenObject.bytes += modrm;
                } else if (tokenObject.tokens[0].lexeme === 'ADD') {
                    tokenObject.bytes += opcode + ' ';
                    let mod = '10';
                    let reg = '000';
                    let regFromOp = tokenObject.tokens[3].lexeme;
                    let rm = tokenObject.hasOwnProperty('prefix67') ? reg16Table[regFromOp] : getRegValue(regFromOp);
                    rm = rm.slice(0, -1);
                    let modrm = modrmToHex(mod, reg, rm);
                    modrm = modrm.length === 2 ? modrm : '0' + modrm;
                    tokenObject.bytes += modrm + ' ';

                    if (tokenObject.hasSib) {
                        tokenObject.bytes += ' 24'
                    }

                    let imm = tokenObject.tokens[tokenObject.tokens.length - 1].lexeme;
                    imm = toDecimal(imm).toString(16).toUpperCase();
                    imm = imm.length === 2 ? imm : '0' + imm;
                    let id = getVarValue(getId(tokenObject, 0));
                    let idValue = tokenObject.hasOwnProperty('prefix67') ? '0'.repeat(4 - id.length) + id : '0'.repeat(8 - id.length) + id;
                    tokenObject.bytes += ' ' + idValue + 'r ';
                    tokenObject.bytes += imm;
                } else if (tokenObject.tokens[0].lexeme === 'XOR') {
                    tokenObject.bytes += opcode + ' ';
                    let mod = hasId(tokenObject, 0) ? '10' : '00';
                    let regFromOp2 = tokenObject.tokens[tokenObject.tokens.length - 1].lexeme;
                    let reg = getRegValue(regFromOp2).slice(0, -1);
                    let regFromOp1 = getRegToken(tokenObject, 0).lexeme;
                    let rm = tokenObject.hasOwnProperty('prefix67') ? reg16Table[regFromOp1] : getRegValue(regFromOp1);
                    rm = rm.slice(0, -1);
                    let modrm = modrmToHex(mod, reg, rm);
                    modrm = modrm.length === 2 ? modrm : '0' + modrm;
                    tokenObject.bytes += modrm;

                    if (tokenObject.hasSib) {
                        tokenObject.bytes += ' 24'
                    }

                    if (hasId(tokenObject, 0)) {
                        let id = getVarValue(getId(tokenObject, 0));
                        let idValue = tokenObject.hasOwnProperty('prefix67') ? '0'.repeat(4 - id.length) + id : '0'.repeat(8 - id.length) + id;
                        tokenObject.bytes += ' ' + idValue + 'r';
                    }
                } else if (tokenObject.tokens[0].lexeme === 'AND') {
                    tokenObject.bytes += opcode + ' ';
                    let mod = hasId(tokenObject, 1) ? '10' : '00';
                    let regFromOp1 = tokenObject.tokens[1].lexeme;
                    let reg = getRegValue(regFromOp1).slice(0, -1);
                    let regFromOp2 = getRegToken(tokenObject, 1).lexeme;
                    let rm = tokenObject.hasOwnProperty('prefix67') ? reg16Table[regFromOp2] : getRegValue(regFromOp2);
                    rm = rm.slice(0, -1);
                    let modrm = modrmToHex(mod, reg, rm);
                    modrm = modrm.length === 2 ? modrm : '0' + modrm;
                    tokenObject.bytes += modrm;

                    if (tokenObject.hasSib) {
                        tokenObject.bytes += ' 24'
                    }

                    if (hasId(tokenObject, 1)) {
                        let id = getVarValue(getId(tokenObject, 1));
                        let idValue = tokenObject.hasOwnProperty('prefix67') ? '0'.repeat(4 - id.length) + id : '0'.repeat(8 - id.length) + id;
                        tokenObject.bytes += ' ' + idValue + 'r';
                    }
                }
            } else if (tokenObject.type === 'JMP_COMMAND' || tokenObject.type === 'JE_COMMAND') {
                let label = tokenObject.tokens.slice(-1)[0];
                if (!tableHasVar(label.lexeme)) {
                    tokenObject.error = 'Error! Non-existent label!';
                } else {
                    let jmpLen = parseInt(getVarValue(label.lexeme), 16) - tokenObject.size - tokenObject.offset;
                    let jmpBytes = (jmpLen >>> 0).toString(16).toUpperCase();
                    jmpLen = Math.abs(jmpLen);
                    switch (tokenObject.offset) {
                        case 6:
                            if (jmpLen >= 127) {
                                tokenObject.bytes = tokenObject.jmpFarCode + ' ' + jmpBytes;
                            } else {
                                jmpBytes = (parseInt(jmpBytes, 16) + 4).toString(16).padStart(2, '0');
                                jmpBytes += ' 90 90 90 90';
                                tokenObject.bytes = tokenObject.jmpNearCode + ' ' + jmpBytes;
                            }
                            break;
                        case 2:
                            if (tokenObject.type === 'JMP_COMMAND' && jmpLen >= 127) {
                                tokenObject.bytes = tokenObject.jmpNearCode + ' 00';
                                tokenObject.error = 'Error! Relative jump out of range!';
                            } else {
                                tokenObject.bytes = tokenObject.jmpNearCode + ' ' + jmpBytes.slice(-2).padStart(2, '0');
                            }
                    }
                }
            }
        }
    });
}

function getCurrentOpCode(mnem, operands) {
    let opCodeArr = getOpCodeArr(mnem);
    let commandOperands = getCommand(mnem).operands;
    let arrOfOps = operands.map(op => op.type);
    if (commandOperands.length === 0) {
        return opCodeArr[0];
    } else {
        return opCodeArr[commandOperands.findIndex(opsSet => JSON.stringify(opsSet) === JSON.stringify(arrOfOps))];
    }
}

function modrmToHex(mod, reg, rm) {
    return toDecimal(mod + reg + rm + 'B').toString(16).toUpperCase();
}

secondPass();

function printMain2Table(file) {
    fs.writeFileSync("table2.txt", "Result of second pass\n\n");
    let data = [['$', 'Size', 'Bytes', 'Assembly line']];
    for (let lexemeObj of tableOfLexemes) {
        lexemeObj.assemblyString = lexemeObj.assemblyString.replace(/\t/g, '    ');
        data.push([getHexValue(lexemeObj.size), getHexValue(lexemeObj.offset), lexemeObj.bytes, lexemeObj.assemblyString]);
        if (lexemeObj.hasOwnProperty('error')) {
            data.push(['', '', '', lexemeObj.error]);
        }
    }
    fs.appendFileSync(file, table(data));
}

function printSecondPass() {
    printMain2Table('table2.txt');
    printSegmentTable('table2.txt');
    printSegRegTable('table2.txt');
    printVarTable('table2.txt');
}

printSecondPass();