### Basic criteria `0/70`

- [ ] AWS CDK Stack contains configuration for `importProductsFile` function `0/15`
- [ ] The `importProductsFile` lambda function returns a correct response which
      can be used to upload a file into the S3 bucket `0/20`
- [ ] Frontend application is integrated with `importProductsFile` lambda `0/15`
- [ ] The `importFileParser` lambda function is implemented and AWS CDK Stack
      contains configuration for the lambda `0/20`

### Additional criteria `0/30`

- [ ] `importProductsFile` lambda is covered by unit tests with AWS SDK mocked `0/10`
- [ ] `importFileParser` lambda is covered by unit tests `0/10`
- [ ] At the end of the stream the lambda function should move the file from
      the `uploaded` folder into the `parsed` folder `0/10`

### Penalties

- [ ] Serverless Framework used to create and deploy infrastructure `0/-50`

---

#### Total score: `0/100`
