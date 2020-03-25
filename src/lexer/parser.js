let tableOfLexemes = require('./lexer');
let LEXEMES = require('./lexemes');
let fs = require('fs');
function makeSyntaxTable(tableOfLexemes) {
    tableOfLexemes.forEach(obj => {
        obj.sentenceStructure = makeSentence(obj);
    });
    return tableOfLexemes;
}

function makeSentence(obj) {
    let sentenceStructure = "";
    let tokens = obj.token;
    let state = 'start';
    let amount = 0;
    for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];
        switch (state) {
            case 'start':
                if (token.type === 'Identifier') {
                    state = 'labelOrName';
                } else {
                    state = 'mnem';
                    sentenceStructure = "-\t|";
                    i--;
                }
                break;
            case 'labelOrName':
                sentenceStructure = "0\t|";
                state = 'mnem';
                if (token.lexeme !== ':') {
                    i--;
                }
                break;
            case 'mnem':
                if (LEXEMES.isMnemonic(token.type.toUpperCase())) {
                    state = 'checkShortDword';
                    sentenceStructure += i + '\t1|';
                } else {
                    return `Syntax error '${token.lexeme}': expected label or name or mnemonic`;
                }
                break;
            case 'checkShortDword':
                if (token.lexeme === 'SHORT') {
                    state = 'id';
                    amount++;
                } else if (token.lexeme === 'DWORD') {
                    state = 'checkPtr';
                    amount++;
                } else {
                    state = 'segReg';
                    i--;
                }
                break;
            case 'checkPtr':
                if (token.lexeme === 'PTR') {
                    state = 'segReg';
                    amount++;
                } else {
                    return `Syntax error '${token.lexeme}': expected PTR`;
                }
                break;
            case 'segReg':
                if (LEXEMES.isSegmentRegister(token.lexeme)) {
                    state = 'checkSegSep';
                    amount++;
                } else {
                    state = 'id';
                    i--;
                }
                break;
            case 'checkSegSep':
                if (token.lexeme === ':') {
                    state = 'id';
                    amount++;
                } else {
                    return `Syntax error '${token.lexeme}': expected colon`;
                }
                break;
            case 'id':
                if (token.type === 'Identifier' || LEXEMES.isRegister32(token.lexeme) || LEXEMES.isRegister16(token.lexeme) || LEXEMES.isRegister8(token.lexeme) || token.type === 'Binary number' || token.type === 'Decimal number' || token.type === 'Hexadecimal number' || token.type === 'Text constant') {
                    state = 'openingBracketCheck';
                    amount++;
                } else {
                    return `Syntax error '${token.lexeme}': expected operand`;
                }
                break;
            case 'openingBracketCheck':
                if (token.lexeme === '[') {
                    state = 'regCheck';
                    amount++;
                } else {
                    state = 'newOp';
                    i--;
                }
                break;
            case 'regCheck':
                if (LEXEMES.isRegister32(token.lexeme) || LEXEMES.isRegister16(token.lexeme) || LEXEMES.isRegister8(token.lexeme)){
                    state = 'closingBracketCheck';
                    amount++;
                } else {
                    return `Syntax error '${token.lexeme}': expected register`;
                }
                break;
            case 'closingBracketCheck':
                if (token.lexeme === ']'){
                    state = 'newOp';
                    amount++;
                } else {
                    return `Syntax error '${token.lexeme}': expected closing bracket`;
                }
                break;
            case 'newOp':
                if (token.lexeme === ',') {
                    state = 'checkShortDword';
                    sentenceStructure += i - amount + '\t' + amount + '|';
                    amount = 0;
                } else {
                    return `Syntax error '${token.lexeme}': expected comma`;
                }
                break;
        }
    }
    if (amount !== 0) {
        sentenceStructure += tokens.length - amount + '\t' + amount + '|';
    }
    return sentenceStructure;
}

function outputTable(tableOfLexemes) {
    fs.writeFileSync("table.txt", "Result of lexical and syntactic analysis\n\n");
    tableOfLexemes.forEach(tokenObject => {
        fs.appendFileSync("table.txt", tokenObject.assemblyString.split('\t').join(' ') + '\n');
        tokenObject.token.forEach(item => {
            if (item.type === 'error') {
                fs.appendFileSync("table.txt", item.lexeme + '\n');
            } else {
                fs.appendFileSync("table.txt", `${item.lexeme}\t${item.length}\t${item.type}\n`);
            }
        });
        fs.appendFileSync("table.txt", 'Sentence structure:\n' + tokenObject.sentenceStructure);
        fs.appendFileSync("table.txt", "\n\n");
    })
}

outputTable(makeSyntaxTable(tableOfLexemes));