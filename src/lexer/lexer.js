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
    if (state === 'number') {
        state = LEXEMES.isRightNumber(lexeme.slice());
        if (state === 'error') {
            lexeme = 'Error! Incorrect number!'.split('');
            tokensArray.length = 0;
        }
    }
    let token = new Token(lexeme.join(''), LEXEMES.chooseType(lexeme.join(''), state));
    tokensArray.push(token);
    lexeme.length = 0;
    return state;
}

function makeArrayOfTokens(string) {
    let state = 'start';
    let tokens = [];
    let currentLexeme = [];
    for (let i = 0; i < string.length; i++) {
        if (state !== 'comment') {
            let char = string[i];
            switch (state) {
                case 'start':
                    char = char.toUpperCase();
                    state = typeOfChar(char);
                    break;
                case 'id':
                    char = char.toUpperCase();
                    if (!LEXEMES.isIdentifier(char)) {
                        makeToken(currentLexeme, state, tokens);
                        state = 'start';
                    }
                    break;
                case 'number':
                    char = char.toUpperCase();
                    if (!LEXEMES.isNumber(char)) {
                        if (char === 'H') {
                            i++;
                            currentLexeme.push(char);
                        }
                        state = makeToken(currentLexeme, state, tokens);
                        if (state === 'error'){
                            state = 'exit';
                        } else {
                            state = 'start';
                        }
                    }
                    break;
                case 'textConstant':
                    if (LEXEMES.isQuote(char)) {
                        currentLexeme = currentLexeme.slice(1);
                        makeToken(currentLexeme, state, tokens);
                        state = 'start';
                    }
                    break;
                case 'singleCharacter': {
                    makeToken(currentLexeme, state, tokens);
                    state = 'start';
                    break;
                }
                case 'space': {
                    currentLexeme = [];
                    state = 'start';
                    break;
                }
                case 'error': {
                    tokens = [];
                    char = currentLexeme.pop();
                    currentLexeme = `Error! Invalid character: ${char}`;
                    currentLexeme = currentLexeme.split('');
                    state = 'exit';
                }
            }
            if (state === 'exit') {
                break;
            }
            if (state === 'start' && !LEXEMES.isSpace(char) && !LEXEMES.isQuote(char)) {
                i--;
            }
            if (state !== 'space' && state !== 'comment' && state !== 'start') {
                currentLexeme.push(char);
            }
        }
    }
    if (currentLexeme.length !== 0) {
        makeToken(currentLexeme, state, tokens);
    }
    return tokens;
}

function outputTable(arrayOfTokens) {
    fs.writeFileSync("table.txt", "Result of lexical analysis\n\n");
    arrayOfTokens.forEach(tokenObject => {
        fs.appendFileSync("table.txt", tokenObject.assemblyString.split('\t').join(' ') + '\n');
        //fs.appendFileSync("table.txt", "----------\n");
        tokenObject.token.forEach(item => {
            if(item.type === undefined){
                fs.appendFileSync("table.txt", item.lexeme + '\n');
            } else {
                fs.appendFileSync("table.txt", `${item.lexeme}\t${item.length}\t${item.type}\n`);
            }
        });
        fs.appendFileSync("table.txt", "\n\n");
    })
}

outputTable(makeTableOfLexemes('test.txt'));
