const commands = [
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

const regTable = [
    {regs: ['AL', 'AX', 'EAX'], value: '000B'},
    {regs: ['CL', 'CX', 'ECX'], value: '001B'},
    {regs: ['DL', 'DX', 'EDX'], value: '010B'},
    {regs: ['BL', 'BX', 'EBX'], value: '011B'},
    {regs: ['AH', 'SP', 'ESP'], value: '100B'},
    {regs: ['CH', 'BP', 'EBP'], value: '101B'},
    {regs: ['DH', 'SI', 'ESI'], value: '110B'},
    {regs: ['BH', 'DI', 'EDI'], value: '111B'},
];

const reg16Table = {
    SI: '100B',
    DI: '101B',
    BP: '110B',
    BX: '111B',
};

function getRegValue(regName) {
    return regTable.find(obj => obj.regs.some(reg => reg === regName)).value;
}

module.exports = {
    getCommand, getOpCodeArr, SegRegTable, getSegRegBySegment, segmentsTable, Segment, tableHasSegment,
    variablesTable, Variable, tableHasVar, getVarValue, Operand, activeSeg, regTable, reg16Table, getRegValue
};