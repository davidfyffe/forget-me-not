// ForgetMeNot is a sample Alexa function that demonstrates persistent attributes
// The function requires Create Table and read/write access to DynamoDB

'use strict';

const Alexa = require("ask-sdk");

// let AWS = require("aws-sdk");
// AWS.config.region = 'us-east-1';

const invocationName = "forget me not";

const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || 'askMemorySkillTable';


function getMemoryAttributes() {
    const memoryAttributes = {
        "history":[],

        "launchCount":0,
        "lastUseTimestamp":0,

        "bookmark":0,
        "factHistory":[],
        "favoriteColor":"",
        "mobileNumber":"",

        // "name":"",
        // "namePronounce":"",
        // "email":"",
        // "mobileNumber":"",
        // "city":"",
        // "state":"",
        // "postcode":"",
        // "birthday":"",
        // "wishlist":[],
    };
    return memoryAttributes;
}

const facts = [ // include at least 5 facts
    "Chameleon tongues can be as long as 28 inches.",
    "It is estimated that over 100 billion people have lived on the earth so far.",
    "The temperature on Venus is at least 462 degrees Celsius, which is about 864 degrees Fahrenheit.",
    "The world's fastest land animal is Sarah, a cheetah that ran 100 meters in 5.95 seconds.",
    "The quietest natural place on earth is in Washington State's Olympic National Park, within the Hoh Rainforest.",
    "A liger is a hybrid offspring of a male lion and a female tiger.",
    "Boston's Fenway Park has been the home of the Red Sox baseball team since 1912."
];

const DontRepeatLastN = 3;  // the last 3 facts are not available for the next random fact


const LaunchHandler = {
    canHandle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const launchCount = sessionAttributes['launchCount'] || 0;

        return (handlerInput.requestEnvelope.request.type === 'LaunchRequest' || launchCount === 0);

    },
    handle(handlerInput) {
        console.log('**** in LaunchHandler ');

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        const launchCount = sessionAttributes['launchCount'];
        const lastUseTimestamp = sessionAttributes['lastUseTimestamp'];

        const thisTimeStamp = new Date(handlerInput.requestEnvelope.request.timestamp).getTime();
        // console.log('thisTimeStamp: ' + thisTimeStamp);

        const span = timeDelta(lastUseTimestamp, thisTimeStamp);

        let say = '';
        if (launchCount == 1) {
            say = 'welcome new user! ';
        } else {

            say = 'Welcome back! This is session ' + launchCount
                + ' and it has been ' + span.timeSpanDesc
                + '. ';
        }

        const responseBuilder = handlerInput.responseBuilder;

        if (supportsDisplay(handlerInput)) {
            const myImage1 = new Alexa.ImageHelper()
                .addImageInstance(DisplayImg1.url)
                .getImage();

            const myImage2 = new Alexa.ImageHelper()
                .addImageInstance(DisplayImg2.url)
                .getImage();

            const primaryText = new Alexa.RichTextContentHelper()
                .withPrimaryText('Welcome to the skill!')
                .getTextContent();

            responseBuilder.addRenderTemplateDirective({
                type : 'BodyTemplate2',
                token : 'string',
                backButton : 'HIDDEN',
                backgroundImage: myImage2,
                image: myImage1,
                title: capitalize(invocationName),
                textContent: primaryText,
            });
        }

        return handlerInput.responseBuilder
            .speak(say)
            .reprompt(say)
            .withStandardCard('Welcome!',
                'Hello!\nThis is a card for your skill, ' + capitalize(invocationName),
                welcomeCardImg.smallImageUrl, welcomeCardImg.largeImageUrl)
            .getResponse();

    }
};

// const MyNameIsHandler = {
//     canHandle(handlerInput) {
//         return handlerInput.requestEnvelope.request.type === 'IntentRequest'
//             && handlerInput.requestEnvelope.request.intent.name === 'MyNameIsIntent';
//     },
//
//     handle(handlerInput) {
//         const myName = handlerInput.requestEnvelope.request.intent.slots.firstname.value;
//         let say;
//
//         if(typeof myName == 'undefined') {
//             say = "Sorry, I didn't catch your name. ";
//
//         } else {
//             say = "Hello, " + myName;
//             let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
//             sessionAttributes['name'] = myName;
//
//             handlerInput.attributesManager.setPersistentAttributes(sessionAttributes);
//             // handlerInput.attributesManager.savePersistentAttributes();  // already saving in ResponseInterceptor
//
//         }
//         return handlerInput.responseBuilder
//             .speak(say)
//             .reprompt(say)
//             .getResponse();
//
//     }
// };

const MyColorIsHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'MyColorIsIntent';
    },

    handle(handlerInput) {
        const color = handlerInput.requestEnvelope.request.intent.slots.color.value;
        let say;

        if(typeof color == 'undefined') {
            say = "Sorry, I didn't catch your favorite color. ";

        } else {
            say = "Wow, I like " + color + " too!";
            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
            sessionAttributes['favoriteColor'] = color;

            handlerInput.attributesManager.setPersistentAttributes(sessionAttributes);
            // handlerInput.attributesManager.savePersistentAttributes();  // already saving in ResponseInterceptor
        }
        return handlerInput.responseBuilder
            .speak(say)
            .reprompt(say)
            .getResponse();

    }
};

const BookmarkSetHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'BookmarkSetIntent';
    },
    handle(handlerInput) {

        const request = handlerInput.requestEnvelope.request;

        const currentIntent = request.intent;
        if (request.dialogState && request.dialogState !== 'COMPLETED') {
            return handlerInput.responseBuilder
                .addDelegateDirective(currentIntent)
                .getResponse();
        }

        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let slotStatus = '';
        let page = {};

        //   SLOT: page
        if (request.intent.slots.page && request.intent.slots.page.value) {
            page = request.intent.slots.page.value;
            slotStatus += ' slot page was heard as ' + page + '. ';
            sessionAttributes['bookmark'] = page;

        } else {
            slotStatus += ' slot page is empty. ';
        }

        handlerInput.attributesManager.setPersistentAttributes(sessionAttributes);

        let say = 'I saved your bookmark for page ' + page + '. what else can I help you with?';

        return handlerInput.responseBuilder
            .speak(say)
            .reprompt('Try again. ' + say)
            .getResponse();
    }
};

const BookmarkGetHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'BookmarkGetIntent';
    },
    handle(handlerInput) {

        const request = handlerInput.requestEnvelope.request;

        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let page = sessionAttributes['bookmark'];
        let say = '';
        if (page) {
            say += 'Your bookmark is for page ' + page + '. ';
        } else {
            say += 'You don\'t have a bookmark yet. ';
        }

        say += 'You can ask me to set a new bookmark if you like. ';

        return handlerInput.responseBuilder
            .speak(say)
            .reprompt('Try again. ' + say)
            .getResponse();
    }
};

const MyPhoneNumberHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'MyPhoneNumberIntent';
    },
    handle(handlerInput) {

        const request = handlerInput.requestEnvelope.request;

        const currentIntent = request.intent;

        if (request.dialogState && request.dialogState !== 'COMPLETED') {
            return handlerInput.responseBuilder
                .addDelegateDirective(currentIntent)
                .getResponse();
        }

        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let slotStatus = '';
        let mobileNumber;

        if (request.intent.slots.mobileNumber.value) {
            mobileNumber = request.intent.slots.mobileNumber.value;
            slotStatus += ' slot mobile number was heard as ' + mobileNumber + '. ';
            sessionAttributes['mobileNumber'] = mobileNumber;

        } else {
            slotStatus += ' slot mobile number is empty. ';
        }

        const bodyText = 'Hello! ' + emoji.smile + ' from the Alexa skill!\n'
            + 'Here is the product I recommend: \n'
            + 'https://www.amazon.com/dp/B01C4MGKQE/ref=cm_sw_r_tw_dp_U_x_HNi4AbJEHN1G0';
            // + 'https://youtu.be/DLzxrzFCyOs';

        const params = {
            PhoneNumber: mobileNumber.toString(),
            Message: bodyText
        };

        handlerInput.attributesManager.setPersistentAttributes(sessionAttributes);

        return new Promise((resolve) => {
            sendTxtMessage(params, request.locale, myResult=>{
                let say = myResult + ' What else can I help you with?';

                resolve(handlerInput.responseBuilder
                    .speak(say)
                    .reprompt('Try again. ' + say)
                    .getResponse()
                );
            });
        });

    }
};

const GetNewFactHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'GetNewFactIntent';
    },
    handle(handlerInput) {

        const request = handlerInput.requestEnvelope.request;
        let fact = 0;
        let say = '';
        let factHistory = [];

        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        factHistory = sessionAttributes['factHistory'] || [];
        console.log('factHistory [ ' + factHistory.toString() + ' ]');


        if (factHistory.length === 0) {  // first time

            fact = randomArrayElement(facts);
            console.log('fact : ' + fact);
            factHistory.push(fact);

        } else {

            let availableFacts = facts.diff(factHistory);
            fact = randomArrayElement(availableFacts);
            console.log('fact ' + fact);
            factHistory.push(fact);

            if (factHistory.length > DontRepeatLastN) {
                factHistory.shift();  // remove first element
            }

        }
        handlerInput.attributesManager.setPersistentAttributes(sessionAttributes);

        say = 'Here is your fact, ' + fact;

        return handlerInput.responseBuilder
            .speak(say)
            .reprompt('Try again. ' + say)
            .getResponse();
    }
};

//
// const StatusHandler = {
//     canHandle(handlerInput) {
//         return handlerInput.requestEnvelope.request.type === 'IntentRequest'
//             && handlerInput.requestEnvelope.request.intent.name === 'StatusIntent';
//     },
//     handle(handlerInput) {
//         const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
//         let say = '';
//         let attrCount = 0;
//         Object.keys(sessionAttributes).forEach(function(key) {  // initialize all attributes
//
//             if (sessionAttributes[key] && sessionAttributes[key].length > 0) {
//                 attrCount += 1;
//                 const attrVal = sessionAttributes[key];
//                 let attrValSay = "";
//                 if (Array.isArray(attrVal)) {
//                     attrValSay += ' an attributed list called ' + key + ', the last of whose ' + attrVal.length
//                         + ' elements is ' + attrVal[attrVal.length-1].IntentRequest;
//                     // attrVal.forEach(function(element) {
//                     //
//                     //     attrValSay += element.IntentRequest + ', ';
//                     // });
//                 } else {
//                     attrValSay = attrVal;
//                 }
//
//                 say += 'Attribute ' + key + ' is ' + attrValSay + ', ';
//
//             }
//
//         });
//         say = 'You have ' + attrCount + ' attributes defined. ' + say;
//
//         return handlerInput.responseBuilder
//             .speak(say)
//             .reprompt(say)
//             .getResponse();
//     }
// };

// const RepeatHandler = {
//     canHandle(handlerInput) {
//         return handlerInput.requestEnvelope.request.type === 'IntentRequest'
//             && handlerInput.requestEnvelope.request.intent.name === 'RepeatIntent';
//     },
//     handle(handlerInput) {
//
//         let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
//
//         let say = 'I will repeat that now.';
//
//         return handlerInput.responseBuilder
//             .speak(say)
//             .reprompt('Try again. ' + say)
//             .getResponse();
//     }
// };

const HelpHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        let say = 'You asked for help. ';
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let history = sessionAttributes['history'];

        if (!handlerInput.requestEnvelope.session.new) {
            say += 'Your last intent was ' + history[history.length-2].IntentRequest + '. ';
            // prepare context-sensitive help messages here
        }
        say += 'You can say things like, set a bookmark, or, my favorite color is, or reset profile. ';

        return handlerInput.responseBuilder
            .speak(say)
            .reprompt('Try again. ' + say)
            .getResponse();
    }
};

const ResetHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'ResetIntent';
    },
    handle(handlerInput) {

        let say = '<say-as interpret-as="interjection">heads up</say-as>, I will clear all your profile data and history for this skill.  Are you sure?';

        return handlerInput.responseBuilder
            .speak(say)
            .reprompt('Try again. ' + say)
            .getResponse();
    }
};


const YesHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent';
    },
    handle(handlerInput) {
        let say = '';
        let end = false;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let previousIntent = sessionAttributes.history[sessionAttributes.history.length - 2].IntentRequest;

        if (handlerInput.requestEnvelope.session.new) {
            say = 'Yes! Welcome to the skill';
        } else {
            if (previousIntent === "ResetIntent") {

                const initialAttributes = getMemoryAttributes();

                sessionAttributes = initialAttributes;

                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
                handlerInput.attributesManager.setPersistentAttributes(sessionAttributes);
                handlerInput.attributesManager.savePersistentAttributes();
                end = true;

                say = 'okay, I have deleted all your profile data.  When you open this skill again you will be a new user.';

            } else {
                say = 'You said yes.  Your previous intent was ' + previousIntent + '. Say help if you want to hear some options? ';
            }

        }
        if (end) {
            return handlerInput.responseBuilder
                .speak(say)
                .withShouldEndSession(true)
                .getResponse();

        } else {
            return handlerInput.responseBuilder
                .speak(say)
                .reprompt('Try again. ' + say)
                .getResponse();

        }

    }
};

const NoHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent';
    },
    handle(handlerInput) {

        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        if (sessionAttributes.history.length < 2) {
            say = 'No? Okay. What can I help you with?';
        } else {
            let previousIntent = sessionAttributes.history[sessionAttributes.history.length - 2].IntentRequest;
            if (previousIntent === "ResetIntent") {

                say = 'okay, I will not delete anything.  What else can I help you with?';

            } else {
                say = 'Okay. What can I help you with?';
            }

        }



        let say = '';

        return handlerInput.responseBuilder
            .speak(say)
            .reprompt('Try again. ' + say)
            .getResponse();
    }
};

const ExitHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
            || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const responseBuilder = handlerInput.responseBuilder;

        return responseBuilder
            .speak('Talk to you later!')
            .withShouldEndSession(true)
            .getResponse();
    }
};

const UnhandledHandler = {
    canHandle(handlerInput) {
        return true;  // will catch AMAZON.FallbackIntent or any other requests
    },
    handle(handlerInput) {
        console.log('Unhandled request: ');
        console.log(JSON.stringify(handlerInput.requestEnvelope.request, null, 2));

        const outputSpeech = 'Sorry, I didn\'t understand that. Please try something else.';
        return handlerInput.responseBuilder
            .speak(outputSpeech)
            .reprompt(outputSpeech)
            .getResponse();
    }
};

const RequestPersistenceInterceptor = {
    process(handlerInput) {
        if(handlerInput.requestEnvelope.session['new']) {

            return new Promise((resolve, reject) => {

                handlerInput.attributesManager.getPersistentAttributes()

                    .then((sessionAttributes) => {
                        sessionAttributes = sessionAttributes || {};

                        // console.log(JSON.stringify(sessionAttributes, null, 2));

                        if(Object.keys(sessionAttributes).length === 0) {
                            console.log('--- First Ever Visit for userId ' + handlerInput.requestEnvelope.session.user.userId);

                            const initialAttributes = getMemoryAttributes();
                            sessionAttributes = initialAttributes;


                        }

                        sessionAttributes['launchCount'] += 1;
                        // sessionAttributes['tempPassPhrase'] = generatePassPhrase().word1 + '-' + generatePassPhrase().word2 + '-' + generatePassPhrase().number;

                        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

                        handlerInput.attributesManager.savePersistentAttributes()
                            .then(() => {
                                resolve();
                            })
                            .catch((err) => {
                                reject(err);
                            });

                    });

            });

        } // end session['new']


    }
};

const RequestHistoryInterceptor = {
    process(handlerInput) {

        const maxHistorySize = 10;  // number of intent/request events to store

        const thisRequest = handlerInput.requestEnvelope.request;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let history = sessionAttributes['history'];

        let IntentRequest = {};
        if (thisRequest.type === 'IntentRequest' ) {

            let slots = {};

            IntentRequest = {
                'IntentRequest' : thisRequest.intent.name
            };

            if (thisRequest.intent.slots) {

                for (let slot in thisRequest.intent.slots) {
                    slots[slot] = thisRequest.intent.slots[slot].value;
                }

                IntentRequest = {
                    'IntentRequest' : thisRequest.intent.name,
                    'slots' : slots
                };

            }

        } else {
            IntentRequest = {'IntentRequest' : thisRequest.type};
        }

        if(history.length > maxHistorySize) {
            history.shift();
        }
        history.push(IntentRequest);

        handlerInput.attributesManager.setPersistentAttributes(sessionAttributes);

    }

};

const ResponsePersistenceInterceptor = {
    process(handlerInput, responseOutput) {

        const ses = (typeof responseOutput.shouldEndSession == "undefined" ? true : responseOutput.shouldEndSession);

        if(ses || handlerInput.requestEnvelope.request.type == 'SessionEndedRequest') { // skill was stopped or timed out

            let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

            sessionAttributes['lastUseTimestamp'] = new Date(handlerInput.requestEnvelope.request.timestamp).getTime();

            handlerInput.attributesManager.setPersistentAttributes(sessionAttributes);

            return new Promise((resolve, reject) => {
                handlerInput.attributesManager.savePersistentAttributes()
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });

            });

        }

    }
};


const skillBuilder = Alexa.SkillBuilders.standard();


exports.handler = skillBuilder
    .addRequestHandlers(
        LaunchHandler,
        MyColorIsHandler,
        BookmarkSetHandler,
        BookmarkGetHandler,
        MyPhoneNumberHandler,
        GetNewFactHandler,
        ResetHandler,
        HelpHandler,
        ExitHandler,
        YesHandler,
        NoHandler,
        UnhandledHandler
    )
    .addRequestInterceptors(RequestPersistenceInterceptor)
    .addRequestInterceptors(RequestHistoryInterceptor)
    .addResponseInterceptors(ResponsePersistenceInterceptor)

    .withTableName(DYNAMODB_TABLE)
    .withAutoCreateTable(true)

    // .withPartitionKeyGenerator(PartitionKeyGenerators.userId or deviceId (define values stored in "id" column)
    // .withPartitionKeyName('myKeyName') // override default primary key name "id"
    // .withDynamoDbClient

    .lambda();

//------------------------------------------------------------------------------
// Helper Functions

function supportsDisplay(handlerInput) // returns true if the skill is running on a device with a display (Echo Show, Echo Spot, etc.)
{                                      //  Enable your skill for display as shown here: https://alexa.design/enabledisplay
    const hasDisplay =
        handlerInput.requestEnvelope.context &&
        handlerInput.requestEnvelope.context.System &&
        handlerInput.requestEnvelope.context.System.device &&
        handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
        handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display;

    return hasDisplay;
}


const welcomeCardImg = {
    smallImageUrl: "https://s3.amazonaws.com/skill-images-789/cards/card_plane720_480.png",
    largeImageUrl: "https://s3.amazonaws.com/skill-images-789/cards/card_plane1200_800.png"

};

const DisplayImg1 = {
    title: 'Jet Plane',
    url: 'https://s3.amazonaws.com/skill-images-789/display/plane340_340.png'
};
const DisplayImg2 = {
    title: 'Starry Sky',
    url: 'https://s3.amazonaws.com/skill-images-789/display/background1024_600.png'

};

function timeDelta(t1, t2) {

    const dt1 = new Date(t1);
    const dt2 = new Date(t2);
    const timeSpanMS = dt2.getTime() - dt1.getTime();
    const span = {
        "timeSpanMIN": Math.floor(timeSpanMS / (1000 * 60 )),
        "timeSpanHR": Math.floor(timeSpanMS / (1000 * 60 * 60)),
        "timeSpanDAY": Math.floor(timeSpanMS / (1000 * 60 * 60 * 24)),
        "timeSpanDesc" : ""
    };


    if (span.timeSpanHR < 2) {
        span.timeSpanDesc = span.timeSpanMIN + " minutes";
    } else if (span.timeSpanDAY < 2) {
        span.timeSpanDesc = span.timeSpanHR + " hours";
    } else {
        span.timeSpanDesc = span.timeSpanDAY + " days";
    }


    return span;

}

function randomArrayElement(myArray) {
    return(myArray[Math.floor(Math.random() * myArray.length)]);
}

function capitalize(myString) {

    return myString.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); }) ;
}


function resolveCanonical(slot){
    let canonical = '';
    if (slot.hasOwnProperty('resolutions')) {
        canonical = slot.resolutions.resolutionsPerAuthority[0].values[0].value.name;
    } else {
        canonical = slot.value;
    }

    return canonical;
}

function generatePassPhrase() {
    // 'correct', 'horse', 'battery', 'staple'
    const word1 = ['nice', 'good', 'clear', 'kind', 'red', 'green', 'orange', 'yellow', 'brown', 'careful',
        'powerful', 'vast', 'happy', 'deep', 'warm', 'cold', 'heavy', 'dry', 'quiet', 'sweet',
        'short', 'long', 'late', 'early', 'quick', 'fast', 'slow', 'other','public','clean','proud',
        'flat','round', 'loud', 'funny', 'free', 'tall', 'short', 'big', 'small'];

    const word2 = ['person', 'day', 'car', 'tree', 'fish', 'wheel', 'chair', 'sun', 'moon', 'star',
        'story', 'voice', 'job', 'fact', 'record', 'computer', 'ocean', 'building', 'cat', 'dog', 'rabbit',
        'carrot', 'orange', 'bread', 'soup', 'spoon', 'fork', 'straw', 'napkin', 'fold', 'pillow', 'radio',
        'towel', 'pencil', 'table', 'mark', 'teacher', 'student', 'developer', 'raisin', 'pizza', 'movie',
        'book', 'cup', 'plate', 'wall', 'door', 'window', 'shoes', 'hat', 'shirt', 'bag', 'page', 'clock',
        'glass', 'button', 'bump', 'paint', 'song', 'story', 'memory', 'school', 'corner', 'wire', 'cable'
    ];
    const numLimit = 999;

    const phraseObject = {
        'word1': randomArrayElement(word1),
        'word2': randomArrayElement(word2),
        'number': Math.floor(Math.random() * numLimit)
    };
    return phraseObject;

}
Array.prototype.diff = function(a) {
    return this.filter(function(i) {return a.indexOf(i) < 0;});
};

function sendTxtMessage(params, locale, callback) {

    const AWS = require('aws-sdk');
    //AWS.config.update({region: AWSregion});

    let mobileNumber = params.PhoneNumber.toString();


    if (locale === 'en-US') {
        if (mobileNumber.length < 10 ){
            const errMsg = 'mobileNumber provided is too short: ' + mobileNumber + '. ';
            callback(errMsg);
        }
        if (mobileNumber.substring(0,1) !== '1' ) {
            mobileNumber = '1' + mobileNumber;
        }
    }

    if (mobileNumber.substring(0,1) !== '+') {
        mobileNumber = '+' + mobileNumber;
    }

    let snsParams = params;
    snsParams.PhoneNumber = mobileNumber;

    const SNS = new AWS.SNS();

    SNS.publish(snsParams, function(err, data){

        console.log('sending message to ' + mobileNumber );

        if (err) console.log(err, err.stack);

        callback('I sent you a text message. ');

    });
}

const emoji = {
    'thumbsup':     '\uD83D\uDC4D',
    'smile':        '\uD83D\uDE0A',
    'star':         '\uD83C\uDF1F',
    'robot':        '\uD83E\uDD16',
    'germany':      '\ud83c\udde9\ud83c\uddea',
    'uk':           '\ud83c\uddec\ud83c\udde7',
    'usa':          '\ud83c\uddfa\ud83c\uddf8'
};
// Escaped Unicode for other emoji:  https://github.com/wooorm/gemoji/blob/master/support.md

