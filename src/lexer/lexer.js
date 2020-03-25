let LEXEMES = require('./lexemes');
let fs = require('fs');

function Token(lexeme, type) {
    this.lexeme = lexeme;
    this.length = lexeme.length;
    this.type = type;
}

function makeTableOfLexemes(inputFilePath) {
    let arrayOfStrings = fs.readFileSync(inputFilePath).toString().split('\r\n').filter(item => item.length);
    let tokenTable = [];
    arrayOfStrings.forEach(function (string) {
        tokenTable.push({
            assemblyString: string,
            token: makeArrayOfTokens(string),
        })
    });
    return tokenTable;
}

function makeArrayOfTokens(string) {
    let state = 'start';
    let tokens = [];
    let currentLexeme = [];
    for (let i = 0; i < string.length; i++) {
        let char = string[i];
        switch (state) {
            case 'start':
                state = typeOfChar(char);
                i--;
                break;
            case 'id':
                char = char.toUpperCase();
                currentLexeme.push(char);
                if (!LEXEMES.isIdentifier(char)) {
                    currentLexeme = currentLexeme.slice(0, -1);
                    makeToken(currentLexeme, state, tokens);
                    state = 'start';
                    i--;
                }
                break;
            case 'number':
                char = char.toUpperCase();
                currentLexeme.push(char);
                if (!LEXEMES.isNumber(char) && char !== 'H') {
                    currentLexeme = currentLexeme.slice(0, -1);
                    makeToken(currentLexeme, state, tokens);
                    state = 'start';
                    i--;
                }
                break;
            case 'textConstant':
                currentLexeme.push(char);
                if (LEXEMES.isQuote(char) && currentLexeme.length > 1) {
                    currentLexeme = currentLexeme.slice(1, -1);
                    makeToken(currentLexeme, state, tokens);
                    state = 'start';
                }
                break;
            case 'singleCharacter': {
                currentLexeme.push(char);
                makeToken(currentLexeme, state, tokens);
                state = 'start';
                break;
            }
            case 'space':
                if (!LEXEMES.isSpace(char)) {
                    state = 'start';
                    i--;
                }
                break;
            case 'comment':
                return tokens;
            case 'error':
                currentLexeme.push(char);
                makeToken(currentLexeme, 'error', tokens);
                return tokens;
        }
    }
    if (currentLexeme.length) {
        makeToken(currentLexeme, state, tokens);
    }
    return tokens;
}

function typeOfChar(char) {
    if (LEXEMES.isLetter(char)) {
        return 'id';
    } else if (LEXEMES.isNumber(char)) {
        return 'number';
    } else if (LEXEMES.isQuote(char)) {
        return 'textConstant';
    } else if (LEXEMES.isSingleCharacter(char)) {
        return 'singleCharacter';
    } else if (LEXEMES.isSpace(char)) {
        return 'space';
    } else if (char === ';') {
        return 'comment';
    } else {
        return 'error';
    }
}

function makeToken(lexeme, state, tokensArray) {
    let type = LEXEMES.chooseType(lexeme.join(''), state);
    if (type === 'error') {
        lexeme = `Error! Invalid character: ${lexeme.pop()}`.split('');
    }
    let token = new Token(lexeme.join(''), type);
    tokensArray.push(token);
    lexeme.length = 0;
}

let table = makeTableOfLexemes('test.txt');
module.exports = table;