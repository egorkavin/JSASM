let tableOfLexemes = require('./lexer');
let LEXEMES = require('./lexemes');
let fs = require('fs');

function makeSyntaxTable(tableOfLexemes) {
    tableOfLexemes.forEach(obj => {
        if (obj.hasOwnProperty('token')) {
            let sentenceStructure = makeSentence(obj);
            if (sentenceStructure.hasOwnProperty('errorMessage')) {
                obj.error = sentenceStructure.errorMessage;
            } else {
                obj.sentenceStructure = makeSentence(obj);
            }
        }
    });
    return tableOfLexemes;
}

function makeSentence(obj) {
    let sentenceStructure = {
        operands: [],
        mnem: [],
    };
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
                    sentenceStructure.labelOrName = "-";
                    i--;
                }
                break;
            case 'labelOrName':
                sentenceStructure.labelOrName = "0";
                state = 'mnem';
                if (token.lexeme !== ':') {
                    i--;
                }
                break;
            case 'mnem':
                if (LEXEMES.isMnemonic(token.type.toUpperCase())) {
                    state = 'checkShortDword';
                    sentenceStructure.mnem = [i, 1];
                } else {
                    return {errorMessage: `Syntax error '${token.lexeme}': expected label or name or mnemonic`};
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
                    return {errorMessage: `Syntax error '${token.lexeme}': expected PTR`};
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
                    return {errorMessage: `Syntax error '${token.lexeme}': expected colon`};
                }
                break;
            case 'id':
                if (token.type === 'Identifier' || LEXEMES.isRegister32(token.lexeme) || LEXEMES.isRegister16(token.lexeme) || LEXEMES.isRegister8(token.lexeme) || token.type === 'Binary number' || token.type === 'Decimal number' || token.type === 'Hexadecimal number' || token.type === 'Text constant') {
                    state = 'openingBracketCheck';
                    amount++;
                } else {
                    //return `Syntax error '${token.lexeme}': expected operand`;
                    state = 'openingBracketCheck';
                    i--;
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
                if (LEXEMES.isRegister32(token.lexeme) || LEXEMES.isRegister16(token.lexeme) || LEXEMES.isRegister8(token.lexeme)) {
                    state = 'closingBracketCheck';
                    amount++;
                } else {
                    return {errorMessage: `Syntax error '${token.lexeme}': expected register`};
                }
                break;
            case 'closingBracketCheck':
                if (token.lexeme === ']') {
                    state = 'newOp';
                    amount++;
                } else {
                    return {errorMessage: `Syntax error '${token.lexeme}': expected closing bracket`};
                }
                break;
            case 'newOp':
                if (token.lexeme === ',') {
                    state = 'checkShortDword';
                    //sentenceStructure += i - amount + '\t' + amount + '|';
                    sentenceStructure.operands.push([i - amount, amount]);
                    amount = 0;
                } else {
                    return {errorMessage: `Syntax error '${token.lexeme}': expected comma`};
                }
                break;
        }
    }
    if (amount !== 0) {
        sentenceStructure.operands.push([tokens.length - amount, amount]);
    }
    return sentenceStructure;
}

function outputTable(tableOfLexemes) {
    fs.writeFileSync("table.txt", "Result of lexical and syntactic analysis\n\n");
    tableOfLexemes.forEach(tokenObject => {
        fs.appendFileSync("table.txt", tokenObject.assemblyString.split('\t').join(' ') + '\n');
        tokenObject.token.forEach((item, index) => {
            if (item.type === 'error') {
                fs.appendFileSync("table.txt", item.lexeme + '\n');
            } else {
                fs.appendFileSync("table.txt", `${index}\t${item.lexeme}\t${item.length}\t${item.type}\n`);
            }
        });
        fs.appendFileSync('table.txt', `Sentence structure:
         Label or name: ${tokenObject.sentenceStructure.labelOrName}
         Mnemonic: ${JSON.stringify(tokenObject.sentenceStructure.mnem)}
         Operands: ${JSON.stringify(tokenObject.sentenceStructure.operands)}`);
        fs.appendFileSync("table.txt", "\n\n");
    })
}

//outputTable(makeSyntaxTable(tableOfLexemes));
module.exports = makeSyntaxTable(tableOfLexemes);