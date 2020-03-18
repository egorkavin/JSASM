let LEXEMES = require('./lexemes');
let fs = require('fs');

function makeTableOfLexemes(inputFilePath) {
    let arrayOfStrings = fs.readFileSync(inputFilePath).toString().split('\r\n').filter(item => item.length);
    let tokenTable = [];
    arrayOfStrings.forEach(function (string) {
        let state = {
            current: 'start',
            next: 'start',
            resetState() {
                this.current = 'start';
                this.next = 'start';
            }
        };
        let tokens = [];
        let currentLexeme = [];
        let currentToken = {};
        for (let i = 0; i < string.length; i++) {
            if (state.next !== 'comment') {
                let char = string[i];
                char = char.toUpperCase();
                switch (state.current) {
                    case 'start':
                        state.next = startCase(char);
                        break;
                    case 'identifierOrKeyword':
                        if (!LEXEMES.isIdentifierCharacter(char)) {
                            state.next = 'makeToken';
                        }
                        break;
                    case 'number':
                        if (!LEXEMES.isNumber(char)) {
                            if (char === 'H') {
                                state.next = 'numberEnd'
                            } else if (LEXEMES.isControlCharacter(char)) {
                                state.current = LEXEMES.isRightNumber(currentLexeme.slice());
                                state.next = 'makeToken';
                            }
                        }
                        break;
                    case 'textConstant':
                        if (LEXEMES.isTextConstant(char)) {
                            state.next = 'makeToken';
                        }
                        break;
                    case 'singleCharacter': {
                        state.next = 'makeToken';
                        break;
                    }
                    case 'numberEnd': {
                        state.current = LEXEMES.isRightNumber(currentLexeme.slice());
                        state.next = 'makeToken';
                        break;
                    }
                }
                //console.log(state.next + " " + char);
                if (state.next === 'makeToken') {
                    currentToken.lexeme = currentLexeme.join('');
                    currentToken.length = currentLexeme.length;
                    currentToken.type = LEXEMES.chooseType(currentToken.lexeme, state.current);
                    tokens.push(Object.assign({}, currentToken));
                    state.resetState();
                    currentLexeme = [];
                    if (!LEXEMES.isControlCharacter(char)) {
                        i--;
                    }
                } else {
                    if (!LEXEMES.isControlCharacter(char) && !LEXEMES.isTextConstant(char)) {
                        currentLexeme.push(char);
                    }
                    state.current = state.next;
                }
            }

        }
        if (tokens.length !== 0) {
            tokenTable.push({
                assemblyString: string,
                token: tokens,
            })
        }
    });
    return tokenTable;
}


function startCase(char) {
    char = char.toUpperCase();
    if (LEXEMES.isLetter(char)) {
        return 'identifierOrKeyword';
    } else if (LEXEMES.isNumber(char)) {
        return 'number';
    } else if (LEXEMES.isTextConstant(char)) {
        return 'textConstant';
    } else if (LEXEMES.isSingleCharacter(char)) {
        return 'singleCharacter';
    } else if (LEXEMES.isControlCharacter(char)) {
        return 'start';
    } else if (char === ';') {
        return 'comment';
    }
}

function identifyCharType(char) {
    char = char.toUpperCase();
    if (LEXEMES.isLetter(char)) {
        return 'identifierOrKeyword';
    } else if (LEXEMES.isNumber(char)) {
        return 'number';
    } else if (LEXEMES.isTextConstant(char)) {
        return 'textConstant';
    } else if (LEXEMES.isSingleCharacter(char)) {
        return 'singleCharacter';
    } else if (LEXEMES.isControlCharacter(char)) {
        return 'start';
    } else if (char === ';') {
        return 'comment';
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// function makeTableOfLexemes(inputFilePath) {
//     let arrayOfArraysOfLexemes = splitFileIntoArray(inputFilePath);
//     let tokensArray = [];
//     arrayOfArraysOfLexemes.forEach(arrayOfLexemes => {
//         let state = {
//             current: 'start',
//             next: 'start',
//             resetState() {
//                 this.current = 'start';
//                 this.next = 'start';
//             }
//         };
//         let tokens = [];
//         let currentLexeme = [];
//         let currentToken = {};
//         for (let lexeme of arrayOfLexemes) {
//             identifyLexemeType(lexeme);
//         }
//     })
// }

function splitFileIntoArray(file) {
    let arrayOfStrings = fs.readFileSync(file).toString().split('\r\n').filter(item => item.length);
}

function identifyLexemeType(lexeme) {
    for (let i = 0; i < lexeme.length; i++) {

    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function outputTable(arrayOfTokens) {
    fs.writeFileSync("table.txt", "Result of lexical analysis\n\n");
    arrayOfTokens.forEach(tokenObject => {
        fs.appendFileSync("table.txt", tokenObject.assemblyString);
        //fs.appendFileSync("table.txt", "_________________________\n");//FIXME calc length
        tokenObject.token.forEach(item => {
            fs.appendFileSync("table.txt", `|${item.lexeme}\t|${item.length}\t|${item.type}\t|\n`);
        });
        fs.appendFileSync("table.txt", "\n\n");
    })
}

let table = makeTableOfLexemes('test.txt');
console.log();
