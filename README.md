# forget-me-not
Alexa skill sample showing Persistent memory

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
