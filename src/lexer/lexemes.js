const COMMANDS = ["CLI", "MUL", "DIV", "ADD", "CMP", "XOR", "MOV", "AND", "JE", "JMP"];//TODO short
const DIRECTIVES = ["END", "SEGMENT", "ENDS", "ASSUME"];
const DATA_TYPES = ["DB", "DW", "DD"];
const SEGMENT_REGISTERS = ["CS", "FS", "DS", "ES", "GS", "SS"];
const REGISTERS_32 = ["EAX", "ECX", "EDX", "EBX", "ESP", "EBP", "ESI", "EDI"];
const REGISTERS_16 = ["AX", "CX", "DX", "BX", "SP", "BP", "SI", "DI"];
const REGISTERS_8 = ["AH", "AL", "DH", "DL", "CH", "CL", "BH", "BL"];
const SINGLE_CHARACTERS = ["[", "]", ":", ",", "+", "-", "*", "/"];
const ALLOWED_CHARACTERS = "_@$?";
const BINARY_NUMBERS = "01";
const DECIMAL_NUMBERS = "0123456789";
const HEXADECIMAL_NUMBERS = "0123456789ABCDEF";
const SPACES = [" ", "\t", "\r", "\n"];

let isMnemonic = char => COMMANDS.indexOf(char) > -1;
let isDirectives = char => DIRECTIVES.indexOf(char) > -1;
let isDataType = char => DATA_TYPES.indexOf(char) > -1;
let isRegister32 = char => REGISTERS_32.indexOf(char) > -1;
let isRegister16 = char => REGISTERS_16.indexOf(char) > -1;
let isRegister8 = char => REGISTERS_8.indexOf(char) > -1;
let isSingleCharacter = char => SINGLE_CHARACTERS.indexOf(char) > -1;
let isAllowedCharacter = char => ALLOWED_CHARACTERS.indexOf(char) > -1;
let isBinaryCharacter = char => BINARY_NUMBERS.indexOf(char) > -1;
let isDecimalCharacter = char => DECIMAL_NUMBERS.indexOf(char) > -1;
let isHexadecimalCharacter = char => HEXADECIMAL_NUMBERS.indexOf(char) > -1;
let isNumber = char => isHexadecimalCharacter(char);
let isSpace = char => SPACES.indexOf(char) > -1;
let isLetter = char => char.toLowerCase() !== char.toUpperCase();
let isQuote = char => char === '\'' || char === '\"';
let isIdentifier = char => isLetter(char) || isAllowedCharacter(char) || isNumber(char);

function isRightNumber(number) {
    let lastChar = number.pop();
    if (lastChar === 'B') {
        return number.every(char => isBinaryCharacter(char)) ? 'binaryNumber' : 'error';
    } else if (lastChar === 'D' || isNumber(lastChar)) {
        return number.every(char => isDecimalCharacter(char)) ? 'decimalNumber' : 'error';
    } else if (lastChar === 'H') {
        return number.every(char => isHexadecimalCharacter(char)) ? 'hexadecimalNumber' : 'error';
    } else {
        return 'error';
    }
}

function keywordType(lexeme) {
    if (COMMANDS.some(item => item === lexeme)) {
        return 'Command';
    } else if (DIRECTIVES.some(item => item === lexeme)) {
        return 'Directive';
    } else if (DATA_TYPES.some(item => item === lexeme)) {
        return 'Data type';
    } else if (SEGMENT_REGISTERS.some(item => item === lexeme)) {
        return 'Segment register';
    } else if (REGISTERS_32.some(item => item === lexeme)) {
        return 'Register 32';
    } else if (REGISTERS_16.some(item => item === lexeme)) {
        return 'Register 16';
    } else if (REGISTERS_8.some(item => item === lexeme)) {
        return 'Register 8';
    } else {
        return 'Identifier'
    }
}

function chooseType(lexeme, type) {
    switch (type) {
        case 'id':
            return keywordType(lexeme);
        case 'textConstant':
            return 'Text constant';
        case 'singleCharacter':
            return 'Single character';
        case 'binaryNumber':
            return 'Binary number';
        case 'decimalNumber':
            return 'Decimal number';
        case 'hexadecimalNumber':
            return 'Hexadecimal number';
    }
}

module.exports = {
    isMnemonic,
    isDirectives,
    isDataType,
    isRegister32,
    isRegister16,
    isRegister8,
    isSingleCharacter,
    isIdentifier,
    isBinaryCharacter,
    isDecimalCharacter,
    isHexadecimalCharacter,
    isNumber,
    isSpace,
    isQuote,
    isRightNumber,
    isLetter,
    chooseType,
};