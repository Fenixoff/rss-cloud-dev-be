import {
  CfnOutput,
  Duration,
  Stack,
  StackProps,
  RemovalPolicy,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";

import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";

import {
  PRODUCT_SERVICE_API_DNS,
  PRODUCT_SERVICE_PRODUCT_TABLE_NAME,
  PRODUCT_SERVICE_STOCK_TABLE_NAME,
} from "../../common/lib/constants";

export class ProductServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const productTable = new dynamodb.TableV2(this, "ProductTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      billing: dynamodb.Billing.provisioned({
        readCapacity: dynamodb.Capacity.fixed(5),
        writeCapacity: dynamodb.Capacity.autoscaled({
          maxCapacity: 5,
        }),
      }),
    });

    const stockTable = new dynamodb.TableV2(this, "StockTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      billing: dynamodb.Billing.provisioned({
        readCapacity: dynamodb.Capacity.fixed(5),
        writeCapacity: dynamodb.Capacity.autoscaled({
          maxCapacity: 5,
        }),
      }),
    });

    const productsListHandler = new nodejs.NodejsFunction(
      this,
      "getProductsList",
      {
        runtime: Runtime.NODEJS_20_X,
        environment: {
          PRODUCT_TABLE: productTable.tableName,
          STOCK_TABLE: stockTable.tableName,
        },
      },
    );

    const productsByIdHandler = new nodejs.NodejsFunction(
      this,
      "getProductsById",
      {
        runtime: Runtime.NODEJS_20_X,
        environment: {
          PRODUCT_TABLE: productTable.tableName,
          STOCK_TABLE: stockTable.tableName,
        },
      },
    );
    const createProductHandler = new nodejs.NodejsFunction(
      this,
      "createProduct",
      {
        runtime: Runtime.NODEJS_20_X,
        environment: {
          PRODUCT_TABLE: productTable.tableName,
          STOCK_TABLE: stockTable.tableName,
        },
      },
    );

    const grants = [
      productTable.grantReadData(productsListHandler),
      stockTable.grantReadData(productsListHandler),

      productTable.grantReadData(productsByIdHandler),
      stockTable.grantReadData(productsByIdHandler),

      productTable.grantWriteData(createProductHandler),
      stockTable.grantWriteData(createProductHandler),
    ];
    grants.forEach((grant) => grant.assertSuccess());

    const productsListIntegration = new HttpLambdaIntegration(
      "ProductsListIntegration",
      productsListHandler,
    );
    const productsByIdIntegration = new HttpLambdaIntegration(
      "ProductsByIdIntegration",
      productsByIdHandler,
    );
    const createProductIntegration = new HttpLambdaIntegration(
      "CreateProductIntegration",
      createProductHandler,
    );

    const httpApi = new apigwv2.HttpApi(this, "ProductServiceApi", {
      corsPreflight: {
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.HEAD,
          apigwv2.CorsHttpMethod.OPTIONS,
          apigwv2.CorsHttpMethod.POST,
        ],
        allowOrigins: ["*"],
        allowHeaders: ["content-type", "authorization"],
        maxAge: Duration.days(1),
      },
      createDefaultStage: false,
    });

    httpApi.addRoutes({
      path: "/products",
      methods: [apigwv2.HttpMethod.GET],
      integration: productsListIntegration,
    });

    httpApi.addRoutes({
      path: "/products/{productId}",
      methods: [apigwv2.HttpMethod.GET],
      integration: productsByIdIntegration,
    });

    httpApi.addRoutes({
      path: "/products",
      methods: [apigwv2.HttpMethod.POST],
      integration: createProductIntegration,
    });

    const devStage = new apigwv2.HttpStage(this, "DevStage", {
      httpApi,
      stageName: "dev",
      autoDeploy: true,
    });

    new CfnOutput(this, "ApiDns", {
      value: httpApi.apiEndpoint,
      exportName: PRODUCT_SERVICE_API_DNS,
    });

    new CfnOutput(this, "ProductTableName", {
      value: productTable.tableName,
      exportName: PRODUCT_SERVICE_PRODUCT_TABLE_NAME,
    });

    new CfnOutput(this, "StockTableName", {
      value: stockTable.tableName,
      exportName: PRODUCT_SERVICE_STOCK_TABLE_NAME,
    });
  }
}
