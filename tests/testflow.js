// testflow - a multiple intent test script for Alexa Lambda code
// testflow reads your Intent sequence from a dialog sequence file, saved to the /dialogs folder
// Launch testflow from a Terminal Prompt.  Examples:
//
// node testflow
// node testflow mydialog.txt
let AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';

// Toggle on or off various debugging outputs
const options = {

    delay        : 0.5,     // seconds between requests
    stdout       : true,    // standard output  / console.log() in your code
    attributes   : true,   // true, false, or a string with the name of an attribute
    speechOutput : true,
    slots        : true
};


var appId = 'amzn1.echo-sdk-ams.app.1234';  // set this to match your skill's alexa.appId to remove warnings
var locale = 'en-US';

var fs = require("fs");
var MyLambdaFunction = require('../lambda/custom/index.js'); // Your Lambda source with exports.handler

var MyDialog = './dialogs/default.txt';

if (process.argv[2]) {
    MyDialog = './dialogs/' + process.argv[2];
}

console.log();
console.log('================================================================================');
console.log('Running test sequence from dialog file : ', MyDialog);
console.log();

const OriginalConsoleLog = console.log;

var slotname = '';
var slotvalue = '';
var sa = {};
var current_line = 1;
var lineArray = [];
var Intent = '';
var prompt = false;


var context = { // lambda functions may finish by calling context.succeed OR the callback function passed as the third argument
    'succeed': function (data) {

        if (data.response.shouldEndSession ) {
            sa = {};
        } else {
            sa = data.sessionAttributes;
        }

        if (typeof options.attributes == 'boolean') {

            if (options.attributes) {
                console.log = OriginalConsoleLog;
                console.log('\x1b[35m%s\x1b[0m ', JSON.stringify(sa, null, 2)); // for formatted JSON
            }
        } else {  // you can define an attribute to display by setting options.attribute to a string, such as 'STATE'
            var printAttributeObject = {};
            console.log = OriginalConsoleLog;
            var printAttributeName = options.attributes.toString();
            var printAttribute = sa[printAttributeName];
            if (!printAttribute) {
                printAttribute = '';
            } else if (typeof printAttribute == 'object') {
                printAttributeObject = printAttribute;
            } else {
                printAttributeObject = JSON.parse('{"' + printAttributeName + '":"' + printAttribute + '"}');
            }
            console.log('\x1b[35m%s\x1b[0m ', JSON.stringify(printAttributeObject)); // , null, 2)); // for formatted JSON

        }

        var textToSay = data.response.outputSpeech.ssml;

        textToSay = textToSay.replace('<speak>', '    ');
        textToSay = textToSay.replace('</speak>', '');

        if (options.speechOutput) {
            console.log = OriginalConsoleLog;
            console.log('\x1b[36m%s\x1b[0m ', textToSay);
        }


        // =====================

        if (current_line < lineArray.length ) {

            // blocking pause
            var waitTill = new Date(new Date().getTime() + options.delay * 1000);
            while(waitTill > new Date()){}

            console.log();

            runSingleTest(lineArray, current_line++, sa);

        } else {
            process.exit();

        }


    },
    'fail': function (err) {
        console.log('context.fail occurred');
        console.log(JSON.stringify(err, null,'\t') );
    }

};

fs.readFile(MyDialog, function (err, data) {  // open dialog sequence file and read Intents

    // var newSession = true;
    var request = {};

    lineArray = cleanArray(data.toString().split('\n')); // remove empty or comment lines (# or //)

    runSingleTest(lineArray, 0, {});

});


function runSingleTest(myLineArray, currentLine, sa) {

    console.log('--------------------------------------------------------------------------------');
    // console.log('testing line ', currentLine);
    // console.log('testing line values ', myLineArray[currentLine]);

    let tokenArray = myLineArray[currentLine].split(' ');

    if (tokenArray[0].replace('\r','') == '?') {  // pause and prompt the user to confirm
        prompt = true;
        // console.log(' ----------------- > prompt');
        tokenArray.shift();  // removes first item
    }

    let requestType = tokenArray[0].replace('\r','');
    tokenArray.shift();

    prompt = false;

    let newSession = true;

    if (currentLine > 0 && requestType !== 'LaunchRequest') {
        newSession = false;

    }


    if (requestType =='LaunchRequest') {
        request =  {
            "type": requestType,
            "locale": locale,
            "timestamp": "2018-04-03T21:47:49Z"
        };

        // console.log(' ========== %s. Request  \x1b[31m\x1b[1m%s\x1b[0m', currentLine+1, requestType);

        console.log('%s \x1b[31m\x1b[1m%s\x1b[0m', currentLine+1, requestType); // print header for each test

        prepareTestRequest(sa, newSession, request);

    } else {

        Intent = requestType;
        slotArray = [];

        var sdkState = '';

        if(sa['STATE']){
            sdkState = sa['STATE'];
        }

        // console.log(' ========== %s. Intent  \x1b[33m\x1b[1m%s\x1b[0m', currentLine+1, Intent);
        console.log('%s \x1b[33m\x1b[1m%s\x1b[0m \x1b[2m%s\x1b[0m', currentLine+1, Intent, sdkState);


        processArray(tokenArray, function(request) {
            prepareTestRequest(sa, newSession, request);

        });


    }

}

slotArray = [];

function processArray(arr, cb) {

    if(arr.length > 0) {

        var equalsPosition = arr[0].indexOf('=');
        slotname = arr[0].substr(0, equalsPosition);
        slotvalue = decodeURI(arr[0].substr(equalsPosition+1, 300)).replace('\r','');

        promptForSlot(prompt, slotname, slotvalue, (newValue) => {

            // console.log('slotname, slotvalue, newValue');
            // console.log(slotname, slotvalue, newValue);

            var answer = newValue.toString().trim();

            if(answer == '') {
                answer = slotvalue;
            }

            if (answer != '') {
                slotArray.push('"' + slotname + '": {"name":"' + slotname + '","value":"' + answer + '"}');
            }

            arr.shift();
            processArray(arr, cb);  // RECURSION

        });



    } else {  // nothing left in slot array


        var slotArrayString = '{' + slotArray.toString() + '}';

        var slotObj = JSON.parse(slotArrayString);

        var req =  {
            "type": "IntentRequest",
            "timestamp": "2018-04-03T21:47:49Z",
            "intent": {
                "name": Intent,
                "slots" : slotObj
            },
            "locale": locale
        };

        cb(req);
        // process.exit();

    }

}

function prepareTestRequest(sa, newSession, request){

    const eventJSON =
        {

            "context": {
                "AudioPlayer": {
                    "playerActivity": "IDLE"
                },
                "Display": {
                    "token": ""
                },
                "System": {
                    "application": {
                        "applicationId": "amzn1.ask.skill.50ef6df2-ffb8-4692-8e18-c9b485cc03b0"
                    },
                    "user": {
                        "userId": "amzn1.ask.account.AG4BEMGBJIJYRAGKP5YLYGJDISRIQVPWOEABD3OQW66MTPOF4JRHLAEETH5TBIOT652I3KUYZSWA5MAZ55GUTIBLEMUQ4YQBPKXVG4YSFHLQL27UEC6YQDXTEYH5MD4NMK4M7UJ4FWTRPKTSII4R733EX3TVC3UKLKOBMHXXM5CHOX2TDUV2WPF6NCWF5KLJETNGQ5YC7EOUFLO"
                    },
                    "device": {
                        "deviceId": "amzn1.ask.device.AFUWNBZ2FSMDFRJDWWA7GSZQBYX4DBS52RV7CHECNUTBCVMT6WW5SVO56SLUZ6D6TIJM5J2S6XNXKHAUU2RCXXQKUI75C37IOPVAA6HCVK5E5NV5EBVC5YUFAMIGD4FYZ4XFA4OEPDNCJYCHXN2RRGDQOZYQ",
                        "supportedInterfaces": {
                            "AudioPlayer": {},
                            "Display": {
                                "templateVersion": "1.0",
                                "markupVersion": "1.0"
                            }
                        }
                    },
                    "apiEndpoint": "https://api.amazonalexa.com",
                    "apiAccessToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.eyJhdWQiOiJodHRwczovL2FwaS5hbWF6b25hbGV4YS5jb20iLCJpc3MiOiJBbGV4YVNraWxsS2l0Iiwic3ViIjoiYW16bjEuYXNrLnNraWxsLjUwZWY2ZGYyLWZmYjgtNDY5Mi04ZTE4LWM5YjQ4NWNjMDNiMCIsImV4cCI6MTUyMjcwOTI2OSwiaWF0IjoxNTIyNzA1NjY5LCJuYmYiOjE1MjI3MDU2NjksInByaXZhdGVDbGFpbXMiOnsiY29uc2VudFRva2VuIjpudWxsLCJkZXZpY2VJZCI6ImFtem4xLmFzay5kZXZpY2UuQUZVV05CWjJGU01ERlJKRFdXQTdHU1pRQllYNERCUzUyUlY3Q0hFQ05VVEJDVk1UNldXNVNWTzU2U0xVWjZENlRJSk01SjJTNlhOWEtIQVVVMlJDWFhRS1VJNzVDMzdJT1BWQUE2SENWSzVFNU5WNUVCVkM1WVVGQU1JR0Q0RllaNFhGQTRPRVBETkNKWUNIWE4yUlJHRFFPWllRIiwidXNlcklkIjoiYW16bjEuYXNrLmFjY291bnQuQUc0QkVNR0JKSUpZUkFHS1A1WUxZR0pESVNSSVFWUFdPRUFCRDNPUVc2Nk1UUE9GNEpSSExBRUVUSDVUQklPVDY1MkkzS1VZWlNXQTVNQVo1NUdVVElCTEVNVVE0WVFCUEtYVkc0WVNGSExRTDI3VUVDNllRRFhURVlINU1ENE5NSzRNN1VKNEZXVFJQS1RTSUk0UjczM0VYM1RWQzNVS0xLT0JNSFhYTTVDSE9YMlREVVYyV1BGNk5DV0Y1S0xKRVROR1E1WUM3RU9VREJBIn19.dPbWxnmKZb-KCCDIFayLc7JkuFI1LQGsmHPvHMHAX4dnAwO0PmjGejdl-rlTwjXcIIPIDPT5Y65dIIf0D63SgVIYe2LC0M5alW327UhT5FVjJu8TmtEbiPEoVwKYWqmMbGYi95Zyi5q9XFGRTq6u9idaDALZLT7LjBdY_DQLmks5fSeI819n1AGuxPecwCO29s0GRHg6JNrLVyCsovJIMB0_9yvz_KoOzwXOHp9YfkA9jtOkBWuEjXe1_DKq1HM5VfuAyiTrM1IYmfw9yoctVcH2xCfqL0QmmIYL9TCuh3mTd3yK5S-0NC-uFijeT-Qyg0o6hjmr2v0zfG0NgHQpQA"
                }
            },

            "session": {
                "sessionId": "SessionId.f9e6dcbb-b7da-4b47-905c.etc.etc",
                "application": {
                    "applicationId": appId
                },
                "attributes": sa,
                "user": {
                    "userId": "amzn1.ask.account.AG4BEMGBJIJYRAGKP5YLYGJDISRIQVPWOEABD3OQW66MTPOF4JRHLAEETH5TBIOT652I3KUYZSWA5MAZ55GUTIBLEMUQ4YQBPKXVG4YSFHLQL27UEC6YQDXTEYH5MD4NMK4M7UJ4FWTRPKTSII4R733EX3TVC3UKLKOBMHXXM5CHOX2TDUV2WPF6NCWF5KLJETNGQ5YC7EOUFLO"
                },
                "new": newSession
            },
            request,
            "version": "1.0"
        };


    // blocking pause
    var waitTill = new Date(new Date().getTime() + options.delay * 1000);
    while(waitTill > new Date()){}

        // console.log(JSON.stringify(eventJSON, null, 2));

    // call the function
    if (options.stdout) {
        MyLambdaFunction['handler'] (eventJSON, context, callback);

    }  else {

        console.log = function() {};
        MyLambdaFunction['handler'] (eventJSON, context, callback);
        console.log = OriginalConsoleLog;
    }

}

function promptForSlot(prompt, slotname, slotvalue, callback) {

    if (prompt) {
        process.stdout.write('\x1b[34m' + slotname + ' \x1b[0m\x1b[32m [' + slotvalue + ']\x1b[0m: ');

        // console.log('\x1b[34m%s :\x1b[0m\x1b[32m %s\x1b[0m ', slotname,  slotvalue  );

        process.stdin.once('data', function (data) {
            var answer = data.toString().trim();

            // console.log(answer);

            if(answer == '') {
                if(slotvalue == '') {
                    // no default, user must type something
                    console.error('Error: No default slot value defined, user must type a slot value.');
                    process.exit();

                } else {
                    answer = slotvalue;
                }
            }

            callback(answer);
        });

    } else {
        if (options.slots) {
            console.log('\x1b[34m%s :\x1b[0m\x1b[32m %s\x1b[0m ', slotname,  slotvalue  );
        }

        callback(slotvalue);
    }
}

function callback(error, data) {
    if(error) {
        console.log('error: ' + error);
    } else {
        // console.log('^^^^^^^ CALL ME BACK');
        context.succeed(data);
        //console.log(data);
    }
};

function cleanArray(myArray) {
    var cleanedArray = [];

    for (var i = 0; i < myArray.length; i++ ) {
        if(myArray[i] != '' && myArray[i].substring(0,1) != '#'  && myArray[i].substring(0,2) != '//') {
            cleanedArray.push(myArray[i]);
        }
    }
    return cleanedArray;
}
//
// const fontcolor = {
//     Reset = "\x1b[0m",
//     Bright = "\x1b[1m",
//     Dim = "\x1b[2m",
//     Underscore = "\x1b[4m",
//     Blink = "\x1b[5m",
//     Reverse = "\x1b[7m",
//     Hidden = "\x1b[8m",
//
//     FgBlack = "\x1b[30m",
//     FgRed = "\x1b[31m",
//     FgGreen = "\x1b[32m",
//     FgYellow = "\x1b[33m",
//     FgBlue = "\x1b[34m",
//     FgMagenta = "\x1b[35m",
//     FgCyan = "\x1b[36m",
//     FgWhite = "\x1b[37m",
//
//     BgBlack = "\x1b[40m",
//     BgRed = "\x1b[41m",
//     BgGreen = "\x1b[42m",
//     BgYellow = "\x1b[43m",
//     BgBlue = "\x1b[44m",
//     BgMagenta = "\x1b[45m",
//     BgCyan = "\x1b[46m",
//     BgWhite = "\x1b[47m"
// };