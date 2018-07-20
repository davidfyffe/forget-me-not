# forget-me-not
This is an Alexa skill sample showing Persistent memory.  Persistent memory is long term memory.
When the user relaunches skill, after five minutes or five weeks, the skill recalls and leverages past interactions to provide a more personalized experience.

## Features

**Bookmark**
1. Say "set a bookmark for page 123"
1. Say "stop"
1. Launch the skill again
1. Say "what is my bookmark".  The skill says, "your bookmark is page 123".

**Fact**
1. Say "tell me a fact". You should hear a random fact
1. Say "stop"
1. Launch the skill again
1. Say "tell me a fact".  You should hear a random fact, but not a repeat one of the previous three facts.


**Reset Memory**
1. Say "reset memory". Alexa will warn you that you are about to delete all your saved attributes.
1. Say Yes.  The skill will confirm and then end.
1. Launch the skill again
1. Say "what is my bookmark?".  The skill will inform you that you do not have any bookmark saved.


## Code

### Setting and Getting persistent attributes
This skill uses [session and persistent attributes](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/wiki/Skill-Attributes) to track key data elements for the user.

Session attributes are active during the scope of one Alexa skill session.  Persistent attributes must be stored and retrieved from a database, such as DynamoDB.

### Interceptors
[Request and Response interceptors](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/wiki/Request-Processing)
handle the task of saving session attributes to persistent attributes.  Each time a skill is launched, a request interceptor will load previous persistent attributes into the session attributes.
When a skill is stopped (or times out), a response interceptor will save session attributes to persistent attributes.


## Setup

### Lambda function
1. Create a new, empty Lambda function from scratch.
1. Be sure to define Alexa Skills Kit as the trigger, and click Save
1. Attach an IAM role with AmazonDynamoDBFullAccess


### Setup and publish Function
1. Clone this repository.
1. In a command prompt, navigate to the /lambda/custom folder and run ```npm install --save ask-sdk```
1. Optional: you may remove node_modules/aws-sdk to save space.
1. Zip the contents of the /custom folder and upload to your Lambda function.  (Hint, see the deploylambda.sh script at the root)
1. Make note of the Lambda Function ARN shown near the top right.

### Setup skill and endpoint
1. From the Developer Portal, create a new custom Alexa skill.
1. In the Intents panel, click JSON Editor, and paste in the model found in the models/en-US.json file.
1. Click SAVE and BUILD.
1. In the Interfaces panel, toggle ON the Display Interface.  The skill will show a welcome screen on Show/Spot devices.
1. In the Endpoint tab, click AWS Lambda ARN and click into the Default Region box.
1. Paste in the Lambda ARN recorded above, and click SAVE and then rebuild your skill.
1. Test your skill by saying "alexa, open forget me not".


### Using Alexa Skills Kit Command Line Interface (ASK CLI) to deploy
1. Install and configure ASK CLI
1. Clone this repository.
1. In a command prompt run ```ask deploy```
1. Attach an IAM role with AmazonDynamoDBFullAccess to the created lambda. (ASK CLI will create the AWS Lambda function with an IAM role named ask-lambda-forget-me-not, attached to the basic execution policy only!)
