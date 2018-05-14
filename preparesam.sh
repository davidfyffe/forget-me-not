aws cloudformation package --template-file ./sam/skill-project.yaml --s3-bucket alexabucket234 --output-template-file ./sam/skill-project-packaged.yaml


# aws cloudformation deploy --template-file ./sam/packaged-memory-skill-sam.yaml --stack-name memory-stack  --capabilities CAPABILITY_IAM

