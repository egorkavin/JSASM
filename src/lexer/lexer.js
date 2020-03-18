let LEXEMES = require('./lexemes');
let fs = require('fs');

function makeTableOfLexemes(inputFilePath) {
    let arrayOfStrings = fs.readFileSync(inputFilePath).toString().split('\r\n').filter(item => item.length);
    let tokenTable = [];
    arrayOfStrings.forEach(function (string) {

    });
    return tokenTable;
}

function makeArrayOfTokens(string) {
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
}

function State(current = 'start', next = 'start') {
    this.current = current;
    this.next = next;
}

State.prototype.resetState = function () {
    this.current = 'start';
    this.next = 'start';
};

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

//let table = makeTableOfLexemes('test.txt');
console.log();
