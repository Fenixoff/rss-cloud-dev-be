### Basic criteria `0/70`

- [ ] DynamoDB tables are created `0/10`
- [ ] Script to fill test data is written, stored in Github repo and executed
      `0/10`
- [ ] DynamoDB tables references are added to Lambdas ENV using CDK Application
      `0/10` (Should be reworded in the task to force to use that values!)
- [ ] `getProductsList` lambda is implemented to return a list of products from
      the database via GET /products request `0/10`
- [ ] `getProductsById` lambda is implemented to return a single product from
      the database via GET /products/{productId} request `0/10`
- [ ] `createProduct` lambda is implemented to create a single product in the
      database via POST /products request `0/10`
- [ ] Frontend application is integrated with Product Service (/products API) `0/10`

### Additional criteria `0/30`

- [ ] POST /products lambda functions returns error 400 status code if product
      data is invalid `0/7.5`
- [ ] All lambdas return error 500 status code on any error (DB connection, any
      unhandled error in code) `0/7.5`
- [ ] All lambdas do console.log for each incoming requests and their arguments
      `0/7.5`
- [ ] Transaction based creation of product `0/7.5`

---

#### Total score: `0/100`
