let tableOfLexemes = require('./lexer');
let tableOfStructures = require('./parser');
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
*       F6 /6   DIV AL, r/m8
*       F7 /6   DIV AX, r/m16
*       F7 /6   DIV EAX, r/m32
*
*   ADD mem, imm
*       80 /0 iw    ADD r/m8, imm8
*       83 /0 ib    ADD r/m16, imm8
*       81 /0 id    ADD r/m16, imm16
*       83 /0 ib    ADD r/m32, imm8
*       81 /0 ib    ADD r/m32, imm32
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

let commands = [
    new Command('CLI', false, false, [], ['FA']),
    new Command('MUL', true, false, [['MEM8'], ['MEM16'], ['MEM32']], ['F6', 'F7', 'F7']),
    new Command('DIV', true, false, [['REG8'], ['REG16'], ['REG32']], ['F6', 'F7', 'F7']),
    new Command('ADD', true, true, [['MEM8', 'IMM8'], ['MEM16', 'IMM8'], ['MEM16', 'IMM16'],
        ['MEM32', 'IMM8'], ['MEM32', 'IMM32']], ['80', '83', '81', '83', '81']),
    new Command('CMP', true, false, [['REG8', 'REG8'], ['REG16', 'REG16'], ['REG32', 'REG32']], ['3A', '3B', '3B']),
    new Command('XOR', true, false, [['MEM8', 'REG8'], ['MEM16', 'REG16'], ['MEM32', 'REG32']], ['30', '31', '31']),
    new Command('MOV', false, true, [['REG8', 'IMM8'], ['REG16', 'IMM16'], ['REG32', 'IMM32']], ['B0', 'B8', 'B8']),
    new Command('AND', true, false, [['REG8', 'MEM8'], ['REG16', 'MEM16'], ['REG32', 'MEM32']], ['22', '23', '23']),
];

function Command(mnem, hasMODRM, hasIMM, operands, opCode) {
    this.mnem = mnem;
    this.hasMODRM = hasMODRM;
    this.hasIMM = hasIMM;
    this.operands = operands;
    this.opCode = opCode;
}

function getCommand(mnem) {
    return commands.find(command => command.mnem === mnem);
}

function getOpCodeArr(mnem) {
    return getCommand(mnem).opCode;
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

let segmentsTable = [];

function Segment(name, bitDepth = 32, offset = 0) {
    this.name = name;
    this.bitDepth = bitDepth;
    this.offset = offset;
}

function tableHasSegment(segmentName) {
    return segmentsTable.find(segment => segment.name === segmentName) !== undefined;
}

let variablesTable = [];

function Variable(name, type, value, segment) {
    this.name = name;
    this.type = type;
    this.value = value;
    this.segment = segment;
}

function tableHasVar(varName) {
    return variablesTable.find(variable => variable.name === varName) !== undefined;
}

function getVarValue(varName) {
    return variablesTable.find(variable => variable.name === varName).value;
}

function Operand(type) {
    this.type = type;
    this.typeWoSize = type.slice(0, 3);
    this.size = type.slice(3);
}

let activeSeg = -1;

let regTable = [
    {regs: ['AL', 'AX', 'EAX'], value: '000B'},
    {regs: ['CL', 'CX', 'ECX'], value: '001B'},
    {regs: ['DL', 'DX', 'EDX'], value: '010B'},
    {regs: ['BL', 'BX', 'EBX'], value: '011B'},
    {regs: ['AH', 'SP', 'ESP'], value: '100B'},
    {regs: ['CH', 'BP', 'EBP'], value: '101B'},
    {regs: ['DH', 'SI', 'ESI'], value: '110B'},
    {regs: ['BH', 'DI', 'EDI'], value: '111B'},
];

let reg16Table = {
    SI: '100B',
    DI: '101B',
    BP: '110B',
    BX: '111B',
};

function getRegValue(regName) {
    return regTable.find(obj => obj.regs.some(reg => reg === regName)).value;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let firstPassFunctions = [defineTokensType, createTables, setOperandsType, checkOpTypes, calculateSize];

function first_pass() {
    tableOfLexemes.forEach((tokenObject, index) => {
        firstPassFunctions.forEach(func => func(tokenObject));
        if (!tokenObject.hasOwnProperty('error')) {
            segmentsTable.slice(-1)[0].offset += tokenObject.offset;
            tokenObject.size = segmentsTable.slice(-1)[0].offset - tokenObject.offset;
            if (tokenObject.type === 'ID_DEFINITION' || tokenObject.type === 'LABEL') {
                variablesTable.slice(-1)[0].value = tokenObject.size;
            }
        } else {
            tokenObject.size = 0;
        }
    });
}

function defineTokensType(tokenObject) {
    if (!tokenObject.hasOwnProperty('error')) {
        let tokensArray = tokenObject.tokens;
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
        } else if (tokensArray[0].type === 'Command') {
            switch (tokensArray[0].lexeme) {
                case 'JMP':
                    tokenObject.type = 'JMP_COMMAND';
                    break;
                case 'JE':
                    tokenObject.type = 'JE_COMMAND';
                    break;
                default:
                    tokenObject.type = 'COMMAND';
            }
        } else {
            tokenObject.error = 'Error! Unknown token!';
        }
    }
}

function createTables(tokenObject, index) {
    if (!tokenObject.hasOwnProperty('error')) {
        if (tokenObject.type === 'SEGMENT_DEFINITION') {
            if (tableHasSegment(tokenObject.tokens[0].lexeme)) {
                activeSeg = segmentsTable.indexOf(tokenObject.tokens[0].lexeme);
            } else {
                segmentsTable.push(new Segment(tokenObject.tokens[0].lexeme));
                activeSeg = segmentsTable.length - 1;
            }
        } else if (tokenObject.type === 'SEGMENT_END') {
            if (tableHasSegment(tokenObject.tokens[0].lexeme)) {
                activeSeg = -1;
            } else {
                tokenObject.error = 'Error! Current segment doesn\'t exist.'
            }
        } else if (tokenObject.type === 'ASSUME_DEFINITION') {
            setSegReg(tokenObject.tokens, tokenObject.sentenceStructure);
        } else if (activeSeg !== -1) {
            if (tokenObject.type === 'ID_DEFINITION' || tokenObject.type === 'LABEL') {
                if (tableHasVar(tokenObject.tokens[0].lexeme)) {
                    tokenObject.error = 'Error! Duplicate of variables.'
                } else {
                    variablesTable.push(new Variable(tokenObject.tokens[0].lexeme,
                        getVarType(tokenObject),
                        0, segmentsTable.slice(-1)[0].name));
                }
            }
        } else if (tokenObject.type !== 'END_DIRECTIVE') {
            tokenObject.error = 'Error! Data out of segment!';
        }
    }
}

function getVarType(tokenObject) {
    return tokenObject.type === 'LABEL' ? 'NEAR' : tokenObject.tokens[1].lexeme;
}

function setSegReg(tokens, structure) {
    for (let op of structure.operands) {
        let segReg = tokens[op[0]].lexeme;
        let segment = tokens[op[0] + 2].lexeme;
        SegRegTable[segReg] = segment;
    }
}

function setOperandsType(tokenObject) {
    if (!tokenObject.hasOwnProperty('error')) {
        if (tokenObject.type === 'COMMAND') {
            tokenObject.operands = [];
            let structure = tokenObject.sentenceStructure;
            let operands = structure.operands;//TODO CLI проверить к-во операндов
            operands.forEach((operand, i) => {
                if (operand[1] === 1) {
                    switch (tokenObject.tokens[operand[0]].type) {
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
                            let num = toDecimal(tokenObject.tokens[operand[0]].lexeme);
                            let immType = getTypeOfIMM(num);
                            tokenObject.operands.push(new Operand(immType));
                            break;
                        case 'Identifier':
                        //TODO
                    }
                } else if (getId(tokenObject, i)) {
                    let idType = getIdType(tokenObject.tokens);
                    tokenObject.operands.push(new Operand(idType));
                } else {
                    tokenObject.operands.push(new Operand('MEM'));
                }
            });
            if (tokenObject.operands.length === 2 &&
                (tokenObject.operands.every(op => op.typeWoSize === 'MEM') ||
                    tokenObject.operands.every(op => op.typeWoSize === 'IMM'))) {
                tokenObject.error = 'Error! Improper operand type!'
            } else if (tokenObject.operands.some(op => op.type === 'MEM'))
                checkMEMSize(tokenObject);
        }
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

function getTypeOfIMM(num) {
    if (num >= Math.pow(2, 16)) {
        return 'IMM32';
    } else if (num >= Math.pow(2, 8)) {
        return 'IMM16';
    } else {
        return 'IMM8';
    }
}

function getIdType(tokens) {
    let varToken = tokens.find(token => token.type === 'Identifier');
    switch (variablesTable.find(variable => variable.name === varToken.lexeme).type) {
        case 'DB':
            return 'MEM8';
        case 'DW':
            return 'MEM16';
        case 'DD':
            return 'MEM32';
    }
}

function getIdSize(tokens) {
    switch (variablesTable.slice(-1)[0].type) {
        case 'DB':
            return tokens[2].type === 'Text constant' ? tokens[2].lexeme.length : 1;
        case 'DW':
            return 2;
        case 'DD':
            return 4;
    }
}

function checkMEMSize(tokenObject) {
    let opWoSize = tokenObject.operands.find(op => op.type === 'MEM');
    let opWithSize = tokenObject.operands.find(op => op.type !== 'MEM' && op.typeWoSize !== 'IMM');
    if (opWoSize && opWithSize) {
        opWoSize.type += opWithSize.size;
        opWoSize.size = opWithSize.size;
    } else {
        tokenObject.error = 'Error! Operand must have size!'
    }
}

function checkOpTypes(tokenObject) {
    if (!tokenObject.hasOwnProperty('error') && tokenObject.type === 'COMMAND') {//TODO write function checkTypes where will be following code
        let typesMatch = doesOperandTypesMatch(tokenObject.tokens[0].lexeme, tokenObject.operands);
        if (!typesMatch) {
            tokenObject.error = 'Error! Operand types must match!'
        }
    }
}

function doesOperandTypesMatch(mnem, operands) {
    let commandOperands = getCommand(mnem).operands;
    let arrOfOps = operands.map(op => op.type);
    if (commandOperands.length === 0) {
        return arrOfOps.length === 0;
    } else {
        return commandOperands.some(opsSet => JSON.stringify(opsSet) === JSON.stringify(arrOfOps));
    }
}

function calculateSize(tokenObject) {
    if (!tokenObject.hasOwnProperty('error')) {
        if (tokenObject.type === 'ID_DEFINITION') {
            tokenObject.offset = getIdSize(tokenObject.tokens);
        } else if (tokenObject.type === 'COMMAND') {
            tokenObject.offset = 1;
            let operands = tokenObject.operands;
            if (getCommand(tokenObject.tokens[0].lexeme).hasIMM) {
                tokenObject.offset += getIMMSize(operands);
            }
            if (getCommand(tokenObject.tokens[0].lexeme).hasMODRM) {
                tokenObject.offset++;
            }
            for (let i = 0; i < operands.length; i++) {
                if (operands[i].size == 16 && !tokenObject.hasOwnProperty('prefix66')) {
                    tokenObject.prefix66 = true;
                    tokenObject.offset++;
                }
                if (operands[i].typeWoSize === 'MEM') {
                    let reg16 = getReg16FromMemOp(tokenObject, i);
                    if (reg16) {
                        if (isAllowedReg16InMem(reg16)) {
                            tokenObject.prefix67 = true;
                            tokenObject.offset++;
                        } else {
                            tokenObject.error = 'Error! Must be index or base register.';
                            tokenObject.offset = 0;
                            return;
                        }
                    }
                    if (hasSegReg(tokenObject, i)) {
                        if (!doesSegRegMatch(tokenObject, i)) {
                            tokenObject.prefixSeg = getSegRegPrefix(tokenObject, i);
                            tokenObject.offset++;
                        }
                    } else if (hasId(tokenObject, i)) {
                        if (!doesHiddenSegRegMatch(tokenObject, i)) {
                            tokenObject.prefixSeg = getHiddenSegRegPrefix(tokenObject, i);
                            tokenObject.offset++;
                        }
                    }
                    let reg = getRegToken(tokenObject, i);
                    if (getId(tokenObject, i)) {
                        tokenObject.offset += reg.type.split(' ')[1] / 8;
                    } else if (reg.lexeme === 'BP' || reg.lexeme === 'EBP') {
                        tokenObject.offset = 0;
                        tokenObject.error = 'Error! When using BP or EBP must be disp8/32!';
                        return;
                    }
                    if (reg.lexeme === 'ESP') {
                        tokenObject.hasSib = true;
                        tokenObject.offset++;
                    } else {
                        tokenObject.hasSib = false;
                    }
                }
            }
        } else if (tokenObject.type === 'JMP_COMMAND' || tokenObject.type === 'JE_COMMAND') {
            if (tokenObject.type === 'JMP_COMMAND') {
                tokenObject.offset = 2;
            } else {
                let label = tokenObject.tokens.slice(-1)[0];
                if (!tableHasVar(label.lexeme)) {
                    tokenObject.offset = 6;
                } else if (tableHasVar(label.lexeme) && getJumpLength(label) < 127) {
                    tokenObject.offset = 2;
                } else if (tableHasVar(label.lexeme) && getJumpLength(label) >= 127) {
                    tokenObject.offset = 4;
                }
            }
        } else {
            tokenObject.offset = 0;
        }
    } else {
        tokenObject.offset = 0;
    }
}

function getJumpLength(label) {
    return Math.abs(segmentsTable.slice(-1)[0].offset - getVarValue(label.lexeme));
}

function getIMMSize(operands) {
    let imm = operands.find(op => op.typeWoSize === 'IMM');
    return imm.size / 8;
}

function getReg16FromMemOp(tokenObject, opPos) {
    let opBeg = tokenObject.sentenceStructure.operands[opPos][0];
    let opEnd = tokenObject.sentenceStructure.operands[opPos][1] + opBeg - 1;
    let reg16Token = tokenObject.tokens.slice(opBeg, opEnd + 1).find(token => token.type === 'Register 16')
    if (reg16Token) {
        return reg16Token.lexeme
    }
}

function isAllowedReg16InMem(reg16) {//bx bp si di
    return reg16 === 'BX' || reg16 === 'BP' || reg16 === 'SI' || reg16 === 'DI';
}

function hasSegReg(tokenObject, opPos) {
    let opBeg = tokenObject.sentenceStructure.operands[opPos][0];
    return tokenObject.tokens[opBeg].type === 'Segment register';
}

function doesSegRegMatch(tokenObject, opPos) {
    let segReg = getSegReg(tokenObject, opPos);
    let regToken = getRegToken(tokenObject, opPos);
    let defaultSegReg = isSSReg(regToken.lexeme) ? 'SS' : 'DS';
    return segReg === defaultSegReg;
}

function getSegReg(tokenObject, opPos) {
    let opBeg = tokenObject.sentenceStructure.operands[opPos][0];
    return tokenObject.tokens[opBeg].lexeme;
}

function getSegRegPrefix(tokenObject, i) {
    switch (getSegReg(tokenObject, i)) {
        case 'CS':
            return '2E';
        case 'SS':
            return '36';
        case 'DS':
            return '3E';
        case 'ES':
            return '26';
        case 'FS':
            return '64';
        case 'GS':
            return '65';
    }
}

function getRegToken(tokenObject, opPos) {
    let opBeg = tokenObject.sentenceStructure.operands[opPos][0];
    let opEnd = tokenObject.sentenceStructure.operands[opPos][1] + opBeg - 1;
    for (let i = opBeg; i < opEnd; i++) {
        if (tokenObject.tokens[i].type.split(' ')[0] === 'Register') {
            return tokenObject.tokens[i];
        }
    }
}//TODO

function getId(tokenObject, opPos) {
    let opBeg = tokenObject.sentenceStructure.operands[opPos][0];
    let opEnd = tokenObject.sentenceStructure.operands[opPos][1] + opBeg - 1;
    for (let i = opBeg; i < opEnd; i++) {
        if (tokenObject.tokens[i].type === 'Identifier') {
            return tokenObject.tokens[i].lexeme;
        }
    }
}//TODO

function isSSReg(reg) {
    return reg === 'BP' || reg === 'EBP' || reg === 'ESP';
}

function hasId(tokenObject, opPos) {
    let opBeg = tokenObject.sentenceStructure.operands[opPos][0];
    return tokenObject.tokens[opBeg].type === 'Identifier';
}

function doesHiddenSegRegMatch(tokenObject, opPos) {
    let regToken = getRegToken(tokenObject, opPos);
    let id = getId(tokenObject, opPos);
    let idSegment = variablesTable.find(variable => variable.name === id).segment;
    let defaultSegReg = isSSReg(regToken.lexeme) ? 'SS' : 'DS';
    return getSegRegBySegment(idSegment) === defaultSegReg;
}//TODO

function getHiddenSegRegPrefix(tokenObject, opPos) {
    let id = getId(tokenObject, opPos);
    let idSegment = variablesTable.find(variable => variable.name === id).segment;
    switch (getSegRegBySegment(idSegment)) {
        case 'CS':
            return '2E';
        case 'SS':
            return '36';
        case 'DS':
            return '3E';
        case 'ES':
            return '26';
        case 'FS':
            return '64';
        case 'GS':
            return '65';
    }
}

first_pass();

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
    let data = [['$', 'Size', 'Assembly line']];
    for (let lexemeObj of tableOfLexemes) {
        lexemeObj.assemblyString = lexemeObj.assemblyString.replace(/\t/g, '    ');
        data.push([getHexValue(lexemeObj.size), getHexValue(lexemeObj.offset), lexemeObj.assemblyString]);
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
        segment.offset = getHexValue(segment.offset);
        data.push(Object.values(segment));
    }
    fs.appendFileSync("table1.txt", table(data));
}

function printVarTable() {
    let data = [['Name', 'Type', 'Value', 'Segment']];
    for (let variable of variablesTable) {
        variable.value = getHexValue(variable.value);
        data.push(Object.values(variable));
    }
    fs.appendFileSync("table1.txt", table(data));
}

function getHexValue(src) {
    return '0'.repeat(4 - src.toString(16).length) + src.toString(16).toUpperCase()
}

printFirstPass();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function secondPass() {
    tableOfLexemes.forEach((tokenObject, i) => {
        tokenObject.bytes = '';
        if (!tokenObject.hasOwnProperty('error')) {
            if (tokenObject.type === 'ID_DEFINITION') {
                if (tokenObject.tokens[2].type === 'Text constant') {
                    tokenObject.tokens[2].lexeme.split('').forEach(char => {
                        tokenObject.bytes += char.charCodeAt(0).toString(16) + ' ';
                    })
                } else {
                    tokenObject.bytes = toDecimal(tokenObject.tokens[2].lexeme).toString(16);
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
                if (tokenObject.tokens[0].lexeme === 'MOV') {
                    opcode = toDecimal(opcode + 'H');
                    opcode += toDecimal(getRegValue(tokenObject.tokens[1].lexeme));
                    opcode = opcode.toString(16).toUpperCase();
                    let imm = tokenObject.tokens[tokenObject.tokens.length - 1].lexeme;
                    tokenObject.bytes += opcode + ' ' + toDecimal(imm).toString(16).toUpperCase();
                } else if (tokenObject.tokens[0].lexeme === 'MUL') {
                    tokenObject.bytes += opcode + ' ';
                    let mod = '10';
                    let reg = '100';
                    let regFromOp = tokenObject.tokens[tokenObject.tokens.length - 2].lexeme;
                    let rm = tokenObject.hasOwnProperty('prefix67') ? reg16Table[regFromOp] : getRegValue(regFromOp);
                    rm = rm.slice(0, -1);
                    tokenObject.bytes += modrmToHex(mod, reg, rm);

                    if (tokenObject.hasSib){
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
                    tokenObject.bytes += modrmToHex(mod, reg, rm);
                } else if (tokenObject.tokens[0].lexeme === 'CMP') {
                    tokenObject.bytes += opcode + ' ';
                    let mod = '11';
                    let reg1FromOp = tokenObject.tokens[1].lexeme;
                    let reg2FromOp = tokenObject.tokens[3].lexeme;
                    let reg = getRegValue(reg1FromOp);
                    let rm = getRegValue(reg2FromOp);
                    reg = reg.slice(0, -1);
                    rm = rm.slice(0, -1);
                    tokenObject.bytes += modrmToHex(mod, reg, rm);
                } else if (tokenObject.tokens[0].lexeme === 'ADD') {
                    tokenObject.bytes += opcode + ' ';
                    let mod = '10';
                    let reg = '000';
                    let regFromOp = tokenObject.tokens[3].lexeme;
                    let rm = tokenObject.hasOwnProperty('prefix67') ? reg16Table[regFromOp] : getRegValue(regFromOp);
                    rm = rm.slice(0, -1);
                    tokenObject.bytes += modrmToHex(mod, reg, rm) + ' ';

                    if (tokenObject.hasSib){
                        tokenObject.bytes += ' 24'
                    }

                    let imm = tokenObject.tokens[tokenObject.tokens.length - 1].lexeme;
                    let id = getVarValue(getId(tokenObject, 0));
                    let idValue = tokenObject.hasOwnProperty('prefix67') ? '0'.repeat(4 - id.length) + id : '0'.repeat(8 - id.length) + id;
                    tokenObject.bytes += ' ' + idValue + 'r ';
                    tokenObject.bytes += toDecimal(imm).toString(16).toUpperCase();
                } else if (tokenObject.tokens[0].lexeme === 'XOR') {
                    tokenObject.bytes += opcode + ' ';
                    let mod = hasId(tokenObject, 0) ? '10' : '00';
                    let regFromOp2 = tokenObject.tokens[tokenObject.tokens.length - 1].lexeme;
                    let reg = getRegValue(regFromOp2).slice(0, -1);
                    let regFromOp1 = getRegToken(tokenObject, 0).lexeme;
                    let rm = tokenObject.hasOwnProperty('prefix67') ? reg16Table[regFromOp1] : getRegValue(regFromOp1);
                    rm = rm.slice(0, -1);
                    tokenObject.bytes += modrmToHex(mod, reg, rm);

                    if (tokenObject.hasSib){
                        tokenObject.bytes += ' 24'
                    }

                    if (hasId(tokenObject, 0)){
                        let id = getVarValue(getId(tokenObject, 0));
                        let idValue = tokenObject.hasOwnProperty('prefix67') ? '0'.repeat(4 - id.length) + id : '0'.repeat(8 - id.length) + id;
                        tokenObject.bytes += ' ' + idValue + 'r';
                    }
                } else if (tokenObject.tokens[0].lexeme === 'AND'){
                    tokenObject.bytes += opcode + ' ';
                    let mod = hasId(tokenObject, 1) ? '10' : '00';
                    let regFromOp1 = tokenObject.tokens[1].lexeme;
                    let reg = getRegValue(regFromOp1).slice(0, -1);
                    let regFromOp2 = getRegToken(tokenObject, 1).lexeme;
                    let rm = tokenObject.hasOwnProperty('prefix67') ? reg16Table[regFromOp2] : getRegValue(regFromOp2);
                    rm = rm.slice(0, -1);
                    tokenObject.bytes += modrmToHex(mod, reg, rm);

                    if (tokenObject.hasSib){
                        tokenObject.bytes += ' 24'
                    }

                    if (hasId(tokenObject, 1)){
                        let id = getVarValue(getId(tokenObject, 1));
                        let idValue = tokenObject.hasOwnProperty('prefix67') ? '0'.repeat(4 - id.length) + id : '0'.repeat(8 - id.length) + id;
                        tokenObject.bytes += ' ' + idValue + 'r';
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

function printMain2Table() {
    fs.writeFileSync("table2.txt", "Result of second pass\n\n");
    let data = [['$', 'Size', 'Bytes', 'Assembly line']];
    for (let lexemeObj of tableOfLexemes) {
        lexemeObj.assemblyString = lexemeObj.assemblyString.replace(/\t/g, '    ');
        data.push([getHexValue(lexemeObj.size), getHexValue(lexemeObj.offset), lexemeObj.bytes, lexemeObj.assemblyString]);
        if (lexemeObj.hasOwnProperty('error')) {
            data.push(['', '', '', lexemeObj.error]);
        }
    }
    fs.appendFileSync('table2.txt', table(data));
}

printMain2Table();

let a;