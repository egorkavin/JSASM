let tableOfLexemes = require('./lexer');
let tableOfStructures = require('./parser');
let LEXEMES = require('./lexemes');
let fs = require('fs');

/*
*   CLI
*       FA CLI
*
*   MUL mem
*       F6 /4   MUL AL, r/m8
*       F7 /4   MUL AX, r/m16
*       F7 /4   MUL EAX, r/m32
*
*   DIV reg
*       F6 /6   MUL AL, r/m8
*       F7 /6   MUL AX, r/m16
*       F7 /6   MUL EAX, r/m32
*
*   ADD mem, imm
*       80 /0 iw    ADD r/m8, imm8
*       81 /0 id    ADD r/m16, imm16
*       81 /0 ib    ADD r/m32, imm32
*       83 /0 ib    ADD r/m16, imm8
*       83 /0 ib    ADD r/m32, imm8
*
*   CMP reg, reg
*       3A /r   CMP r8, r/m8
*       3B /r   CMP r16, r/m16
*       3B /r   CMP r32, r/m32
*
*   XOR mem,reg
*       30 /r   XOR r/m8, r8
*       31 /r   XOR r/m16, r16
*       31 /r   XOR r/m32, r32
*
*   MOV reg,imm
*       B0+rb   MOV reg8, imm8
*       B8+rw   MOV reg16, imm16
*       B8+rd   MOV reg32, imm32
*
*   AND reg,mem
*       22 /r   AND r8, r/m8
*       23 /r   AND r16, r/m16
*       23 /r   AND r32, r/m32
*
*   JE
*       74 cb   JE rel8
*    OF 84 cw   JE rel16
*
*   JMP SHORT
*       EB cb   JMP rel8
 */
let arr = [1,2];
for (let i of arr){
    setTimeout(i, 2000);
}
console.log(i)
let commands = [
    new Command('CLI', false, false),
    new Command('MUL', true, false, ['MEM']),
    new Command('DIV', true, false, ['REG']),
    new Command('ADD', true, true, ['MEM', 'IMM']),
    new Command('CMP', true, false, ['REG', 'REG']),
    new Command('XOR', true, false, ['MEM', 'REG']),
    new Command('MOV', true, true, ['REG', 'IMM']),
    new Command('AND', true, false, ['REG', 'MEM']),
];

function Command(mnem, hasMODRM, hasIMM, operands) {
    this.mnem = mnem;
    this.hasMODRM = hasMODRM;
    this.hasIMM = hasIMM;
    this.operands = operands;
}

function getCommand(mnem) {
    // for (let command of commands) {
    //     if (command.mnem === mnem) {
    //         return command;
    //     }
    // }
    return commands.find(command => command.mnem === mnem);
}

let SegRegTable = {
    'CS': 'Nothing',
    'DS': 'Nothing',
    'SS': 'Nothing',
    'ES': 'Nothing',
    'GS': 'Nothing',
    'FS': 'Nothing'
};

function getSegRegBySegment(segment) {
    return Object.keys(SegRegTable).find(key => SegRegTable[key] === segment);
}

let activeSeg = -1;

let segmentsTable = [];

function Segment(name, bitDepth = 32, offset = 0) {
    this.name = name;
    this.bitDepth = bitDepth;
    this.offset = offset;
}

function tableHasSegment(segmentName) {
    return tableHasField(segmentsTable, segmentName);
}

function tableHasName(varName) {
    return tableHasField(variablesTable, varName);
}

function tableHasField(table, newField) {
    for (let field of table) {
        if (field.name === newField)
            return true;
    }
    return false;
}

let variablesTable = [];

function Variable(name, type, value, segment) {
    this.name = name;
    this.type = type;
    this.value = value;
    this.segment = segment;
}

function Operand(type) {
    this.type = type;
}

let labelsTable = [];

function tableHasLabel(labelName) {
    return labelsTable.indexOf(labelName) !== -1;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function first_pass() {
    tableOfLexemes.forEach((tokenObject, index) => {
        if (!tokenObject.hasOwnProperty('error')) {
            defineTokensType(tokenObject);
            if (!tokenObject.hasOwnProperty('error')) {
                createTables(tokenObject, index);
            }
            if (!tokenObject.hasOwnProperty('error')) {
                setOperandsType(tokenObject);
            }
            if (!tokenObject.hasOwnProperty('error') && tokenObject.type === 'COMMAND') {
                let typesMismatch = doesOperandTypesMatch(tokenObject.token[0].lexeme, tokenObject.operands);
                if (typesMismatch) {
                    tokenObject.error = 'Error! Operand types must match!'
                }
            }
            if (!tokenObject.hasOwnProperty('error')) {
                calculateSize(tokenObject);
            }
        }
    });
}

function defineTokensType(tokenObject) {
    let tokensArray = tokenObject.token;
    if (tokensArray.length === 2 &&
        tokensArray[0].type === 'Identifier' &&
        tokensArray[1].lexeme === 'SEGMENT') {
        tokenObject.type = 'SEGMENT_DEFINITION';
    } else if (tokensArray.length === 2 &&
        tokensArray[0].type === 'Identifier' &&
        tokensArray[1].lexeme === 'ENDS') {
        tokenObject.type = 'SEGMENT_END';
    } else if (tokensArray.length === 3 &&
        tokensArray[0].type === 'Identifier' &&
        tokensArray[1].type === 'Data type') {
        tokenObject.type = 'ID_DEFINITION';
    } else if (tokensArray.length > 2 &&
        tokensArray[0].type === 'Directive' &&
        tokensArray[0].lexeme === 'ASSUME') {
        tokenObject.type = 'ASSUME_DEFINITION';
    } else if (tokensArray.length === 2 &&
        tokensArray[0].type === 'Identifier' &&
        tokensArray[1].lexeme === ':') {
        tokenObject.type = 'LABEL';
    } else if (tokensArray.length === 1 &&
        tokensArray[0].lexeme === 'END') {
        tokenObject.type = 'END_DIRECTIVE';
    } else {
        if (tokensArray.length > 0 && tokensArray[0].type === 'Command') {
            tokenObject.type = 'COMMAND';
        } else {
            tokenObject.error = 'Error! Unknown token!';
        }
    }
}

function createTables(tokenObject, index) {
    if (tokenObject.type === 'SEGMENT_DEFINITION') {
        if (tableHasSegment(tokenObject.token[0].lexeme)) {
            activeSeg = segmentsTable.indexOf(tokenObject.token[0].lexeme);
        } else {
            segmentsTable.push(new Segment(tokenObject.token[0].lexeme));
            activeSeg = segmentsTable.length - 1;
        }
    } else if (tokenObject.type === 'SEGMENT_END') {
        if (!tableHasSegment(tokenObject.token[0].lexeme)) {
            tokenObject.error = 'Error! Current segment doesn\'t exist.'
        } else {
            activeSeg = -1;
        }
    } else if (tokenObject.type === 'ASSUME_DEFINITION') {
        setSegReg(tokenObject.token, tokenObject.sentenceStructure);
    } else if (activeSeg !== -1) {
        if (tokenObject.type === 'ID_DEFINITION') {
            if (tableHasName(tokenObject.token[0].lexeme)) {
                tokenObject.error = 'Error! Duplicate of variables.'
            } else {
                variablesTable.push(new Variable(tokenObject.token[0].lexeme,
                    tokenObject.token[1].lexeme,
                    tokenObject.token[2].lexeme,
                    segmentsTable.slice(-1)[0].name));
            }
        } else if (tokenObject.type === 'LABEL') {
            if (tableHasLabel(tokenObject.token[0].lexeme)) {
                tokenObject.error = 'Error! Duplicate of labels.';
            } else {
                labelsTable.push(tokenObject.token[0].lexeme);
            }
        }
    } else if (tokenObject.type !== 'END_DIRECTIVE') {
        tokenObject.error = 'Error! Data out of segment!';
    }
    // else if (index === tableOfLexemes.length - 1 && tokenObject.type !== 'FILE_END') {
    //     console.log('Error!');//TODO
    // }
}

function setSegReg(tokens, structure) {
    for (let op of structure.operands) {
        let segReg = tokens[op[0]].lexeme;
        let segment = tokens[op[0] + 2].lexeme;
        SegRegTable[segReg] = segment;
    }
}

function setOperandsType(tokenObject) {
    if (tokenObject.type === 'COMMAND') {
        tokenObject.operands = [];
        let structure = tokenObject.sentenceStructure;
        let operands = structure.operands;
        tokenObject.offset = 0;
        operands.forEach(operand => {
            if (operand[1] === 1) {
                switch (tokenObject.token[operand[0]].type) {
                    case 'Register 8':
                        tokenObject.operands.push(new Operand('REG8'));
                        break;
                    case 'Register 16':
                        tokenObject.operands.push(new Operand('REG16'));
                        break;
                    case 'Register 32':
                        tokenObject.operands.push(new Operand('REG32'));
                        break;
                    case 'Binary number':
                    case 'Decimal number':
                    case 'Hexadecimal number':
                        let num = toDecimal(tokenObject.token[operand[0]].lexeme);
                        Math.abs(num) > 255 ? tokenObject.operands.push(new Operand('IMM8')) : tokenObject.operands.push(new Operand('IMM32'));
                        break;
                    case 'Identifier':
                    //TODO
                }
            } else {
                tokenObject.operands.push(new Operand('MEM'));
            }
        })
    } else if (tokenObject.type === 'ID_DEFINITION') {
        segmentsTable.slice(-1)[0].offset += getIdSize(tokenObject.token);
    }
}

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

function getIdSize(token) {
    switch (variablesTable.slice(-1)[0].type) {
        case 'DB':
            return token[2].type === 'Text constant' ? token[2].lexeme.length : 1;
        case 'DW':
            return 2;
        case 'DD':
            return 4;

    }
}

function doesOperandTypesMatch(mnem, operands) {
    let command = getCommand(mnem);
    for (let i = 0; i < operands.length; i++) {
        if (operands[i].type !== command.operands[i] &&
            operands[i].type !== command.operands[i] + '32' &&
            operands[i].type !== command.operands[i] + '16' &&
            operands[i].type !== command.operands[i] + '8') {
            return true;
        }
    }
    return false;
}

function calculateSize(tokenObject) {
    if (tokenObject.type === 'ID_DEFINITION') {
        tokenObject.offset = getIdSize(tokenObject.token);
    } else if (tokenObject.type === 'COMMAND') {
        tokenObject.offset = 1;//TODO for jmp
        if(getCommand(tokenObject.token[0].lexeme).hasMODRM){
            tokenObject.offset++;
        }
        let operands = tokenObject.operands;
        for (let i = 0; i < operands.length; i++) {
            if (operands[i].type === 'MEM') {
                let reg16 = getReg16FromMemOp(tokenObject, i);
                if (reg16) {
                    if (!isAllowedReg16InMem(reg16)) {
                        tokenObject.error = 'Error! Must be index or base register.';
                        tokenObject.offset = 0;
                        return;
                    } else {
                        tokenObject.offset++;
                    }
                }
                if (hasSegReg(tokenObject, i)) {
                    if (!doesSegRegMatch(tokenObject, i)) {
                        tokenObject.offset++;
                    }
                } else if (hasId(tokenObject, i)) {
                    if (!doesHiddenSegRegMatch(tokenObject, i)) {
                        tokenObject.offset++;
                    }
                }
                let reg = getRegToken(tokenObject, i);
                if (getId(tokenObject, i)) {
                    switch (reg.type.split(' ')[1]) {
                        case '8':
                            tokenObject.offset++;
                            break;
                        case '16':
                            tokenObject.offset += 2;
                            break;
                        case '32':
                            tokenObject.offset += 4;
                            break;
                    }
                } else if (reg.lexeme === 'BP' || reg.lexeme === 'EBP'){
                    tokenObject.offset++;
                }

                if (reg.lexeme === 'ESP'){
                    tokenObject.offset++;
                }
            }
        }
    } else {
        tokenObject.offset = 0;
    }
}

function getReg16FromMemOp(tokenObject, opPos) {
    let opBeg = tokenObject.sentenceStructure.operands[opPos][0];
    let opEnd = tokenObject.sentenceStructure.operands[opPos][1] + opBeg - 1;
    for (let i = opBeg; i < opEnd; i++) {
        if (tokenObject.token[i].type === 'Register 16') {
            return tokenObject.token[i].lexeme
        }
    }
}

function isAllowedReg16InMem(reg16) {//bx bp si di
    return reg16 === 'BX' || reg16 === 'BP' || reg16 === 'SI' || reg16 === 'DI';
}

function hasSegReg(tokenObject, opPos) {
    let opBeg = tokenObject.sentenceStructure.operands[opPos][0];
    return tokenObject.token[opBeg].type === 'Segment register';
}

function doesSegRegMatch(tokenObject, opPos) {
    let segReg = getSegReg(tokenObject, opPos);
    let regToken = getRegToken(tokenObject, opPos);
    let defaultSegReg = isSSReg(regToken.lexeme) ? 'SS' : 'DS';
    return segReg === defaultSegReg;
}

function getSegReg(tokenObject, opPos) {
    let opBeg = tokenObject.sentenceStructure.operands[opPos][0];
    return tokenObject.token[opBeg].lexeme;
}

function getRegToken(tokenObject, opPos) {
    let opBeg = tokenObject.sentenceStructure.operands[opPos][0];
    let opEnd = tokenObject.sentenceStructure.operands[opPos][1] + opBeg - 1;
    for (let i = opBeg; i < opEnd; i++) {
        if (tokenObject.token[i].type.split(' ')[0] === 'Register') {
            return tokenObject.token[i];
        }
    }
}

function getId(tokenObject, opPos) {
    let opBeg = tokenObject.sentenceStructure.operands[opPos][0];
    let opEnd = tokenObject.sentenceStructure.operands[opPos][1] + opBeg - 1;
    for (let i = opBeg; i < opEnd; i++) {
        if (tokenObject.token[i].type === 'Identifier') {
            return tokenObject.token[i].lexeme;
        }
    }
}

function isSSReg(reg) {
    return reg === 'BP' || reg === 'EBP' || reg === 'ESP';
}

function hasId(tokenObject, opPos) {
    let opBeg = tokenObject.sentenceStructure.operands[opPos][0];
    return tokenObject.token[opBeg].type === 'Identifier';
}

function doesHiddenSegRegMatch(tokenObject, opPos) {
    let regToken = getRegToken(tokenObject, opPos);
    let id = getId(tokenObject, opPos);
    let idSegment = variablesTable.find(variable => variable.name === id).segment;
    let defaultSegReg = isSSReg(regToken.lexeme) ? 'SS' : 'DS';
    return getSegRegBySegment(idSegment) === defaultSegReg;
}

first_pass();
//console.log(tableOfLexemes);
//console.log(variablesTable);
//console.log(segmentsTable);
// console.log(labelsTable);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const table = require('table').table;

function printFirstPass() {
    fs.writeFileSync("table1.txt", "Result of first pass\n\n");
    printMainTable();
    printSegmentTable();
    printSegRegTable();
    printVarTable();
}

function printMainTable() {
    let data = [];
    for (let lexemeObj of tableOfLexemes) {
        lexemeObj.assemblyString = lexemeObj.assemblyString.replace(/\t/g, '    ');
        data.push([lexemeObj.size, lexemeObj.offset, lexemeObj.assemblyString]);
        if (lexemeObj.hasOwnProperty('error')) {
            data.push(['', '', lexemeObj.error]);
        }
    }
    fs.appendFileSync('table1.txt', table(data));
}

function printSegRegTable() {
    let data = Object.entries(SegRegTable);
    data.unshift(['Segment register', 'Destination']);
    fs.appendFileSync("table1.txt", table(data));
}

function printSegmentTable() {
    let data = [['Segment name', 'Bit depth', 'Offset']];
    for (let segment of segmentsTable) {
        data.push(Object.values(segment));
    }
    fs.appendFileSync("table1.txt", table(data));
}

function printVarTable() {
    let data = [['Name', 'Type', 'Value', 'Segment']];
    for (let variable of variablesTable) {
        data.push(Object.values(variable));
    }
    fs.appendFileSync("table1.txt", table(data));
}

printFirstPass();
