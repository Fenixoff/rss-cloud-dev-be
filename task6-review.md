### Basic criteria `0/70`

- [ ] AWS CDK Stack contains configuration for `catalogBatchProcess` function `0/15`
- [ ] AWS CDK Stack contains policies to allow lambda `catalogBatchProcess`
      function to interact with SNS and SQS `0/15`
- [ ] AWS CDK Stack contains configuration for SQS `catalogItemsQueue` `0/20`
- [ ] AWS CDK Stack contains configuration for SNS Topic `createProductTopic`
      and email subscription `0/20`

### Additional criteria `0/30`

- [ ] `catalogBatchProcess` lambda is covered by unit tests `0/15`
- [ ] A Filter Policy for SNS `createProductTopic` is present in AWS CDK Stack
      and an additional email subscription to distribute messages to different
      emails depending on the filter for any product attribute `0/15`

### Penalties

- [ ] Serverless Framework used to create and deploy infrastructure `0/-50`

---

#### Total score: `0/100`
