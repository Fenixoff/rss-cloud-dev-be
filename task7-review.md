### Basic criteria `0/70`

- [ ] `authorization-service` is added to the repo, has correct basicAuthorizer
      lambda and correct AWS CDK Stack `0/15`
- [ ] `import-service` AWS CDK Stack has authorizer configuration for the
      `importProductsFile` lambda `0/15`
- [ ] Request to the `importProductsFile` lambda works only with correct
      authorization token being decoded and checked by basicAuthorizer lambda.
      Response should have 403 HTTP status if access is denied for this user
      (invalid authorization_token) and in 401 HTTP status if Authorization
      header is not provided `0/20`
- [ ] Client application is updated to send
      `Authorization: Basic <authorization_token>` header on import. Client
      should get authorization_token value from browser localStorage `0/20`

### Additional criteria `0/30`

- [ ] Client application should display alerts for the responses in 401 and 403
      HTTP statuses. This behavior should be added to the
      `nodejs-aws-fe-main/src/index.tsx file` `0/30`

### Penalties

- [ ] Serverless Framework used to create and deploy infrastructure `0/-50`

---

#### Total score: `0/100`
