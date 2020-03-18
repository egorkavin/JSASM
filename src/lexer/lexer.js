let LEXEMES = require('./lexemes');
let fs = require('fs');

function State(current = 'start', next = 'start') {
    this.current = current;
    this.next = next;
}

State.prototype.resetState = function () {
    this.current = 'start';
    this.next = 'start';
};

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
    } else if (LEXEMES.isTextConstant(char)) {
        return 'textConstant';
    } else if (LEXEMES.isSingleCharacter(char)) {
        return 'singleCharacter';
    } else if (LEXEMES.isSpace(char)) {
        return 'space';
    } else if (char === ';') {
        return 'comment';
    }
}

function makeToken(lexeme, state, tokensArray) {
    console.log(lexeme.join('')+" "+LEXEMES.chooseType(lexeme.join(''), state.current));
    let token = new Token(lexeme.join(''), LEXEMES.chooseType(lexeme, state.current));
    tokensArray.push(token);
    state.resetState();
    lexeme.length = 0;
    return token;
}

function makeArrayOfTokens(string) {
    let state = new State();
    let tokens = [];
    let currentLexeme = [];
    string.split('').forEach(char => {
        char = char.toUpperCase();
        switch (state.current) {
            case 'start':
                state.current = typeOfChar(char);
                currentLexeme.push(char);
                break;
            case 'id':
                if (!LEXEMES.isIdentifier(char)) {
                    makeToken(currentLexeme, state, tokens);
                    state.current = 'start';
                } else {
                    currentLexeme.push(char);
                }
                break;
            case 'number':
                if (!LEXEMES.isNumber(char)){
                    if (char === 'H'){
                        currentLexeme.push(char);
                        state.current = LEXEMES.isRightNumber(currentLexeme.slice());
                        makeToken(currentLexeme, state, tokens);
                        state.current = 'start';
                    } else {
                        state.current = LEXEMES.isRightNumber(currentLexeme.slice());
                        makeToken(currentLexeme, state, tokens);
                        state.current = 'start';
                    }
                } else{
                    currentLexeme.push(char);
                }
        }
    });
    makeToken(currentLexeme, state, tokens);
    return tokens;
}

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
