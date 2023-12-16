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
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";

import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";

import {
  PRODUCT_SERVICE_API_DNS,
  PRODUCT_SERVICE_PRODUCT_TABLE_NAME,
  PRODUCT_SERVICE_STOCK_TABLE_NAME,
  PRODUCT_SERVICE_CATALOG_QUEUE_ARN,
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

    const createProductTopic = new sns.Topic(this, "CreateProductTopic");
    createProductTopic.addSubscription(
      new EmailSubscription("azh.andrei@gmail.com", {
        filterPolicyWithMessageBody: {
          price: sns.FilterOrPolicy.filter(
            sns.SubscriptionFilter.numericFilter({
              greaterThan: 100,
            }),
          ),
        },
      }),
    );

    createProductTopic.addSubscription(
      new EmailSubscription("a.z.h.andrei@gmail.com", {
        filterPolicyWithMessageBody: {
          price: sns.FilterOrPolicy.filter(
            sns.SubscriptionFilter.numericFilter({
              lessThanOrEqualTo: 100,
            }),
          ),
        },
      }),
    );

    const commonHandlerProps = {
      runtime: Runtime.NODEJS_20_X,
      environment: {
        PRODUCT_TABLE: productTable.tableName,
        STOCK_TABLE: stockTable.tableName,
      },
    };

    const productsListHandler = new nodejs.NodejsFunction(
      this,
      "getProductsList",
      commonHandlerProps,
    );

    const productsByIdHandler = new nodejs.NodejsFunction(
      this,
      "getProductsById",
      commonHandlerProps,
    );

    const createProductHandler = new nodejs.NodejsFunction(
      this,
      "createProduct",
      commonHandlerProps,
    );

    const catalogBatchProcessHandler = new nodejs.NodejsFunction(
      this,
      "catalogBatchProcess",
      {
        ...commonHandlerProps,
        environment: {
          ...commonHandlerProps.environment,
          SNS_TOPIC_ARN: createProductTopic.topicArn,
        },
      },
    );

    const catalogItemsQueue = new sqs.Queue(this, "catalogItemsQueue", {
      enforceSSL: true,
    });

    const grants = [
      productTable.grantReadData(productsListHandler),
      stockTable.grantReadData(productsListHandler),

      productTable.grantReadData(productsByIdHandler),
      stockTable.grantReadData(productsByIdHandler),

      productTable.grantWriteData(createProductHandler),
      stockTable.grantWriteData(createProductHandler),

      productTable.grantWriteData(catalogBatchProcessHandler),
      stockTable.grantWriteData(catalogBatchProcessHandler),

      createProductTopic.grantPublish(catalogBatchProcessHandler),
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

    catalogBatchProcessHandler.addEventSource(
      new SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
        maxBatchingWindow: Duration.seconds(10),
        reportBatchItemFailures: true,
      }),
    );

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

    new CfnOutput(this, "CatalogQueueArn", {
      value: catalogItemsQueue.queueArn,
      exportName: PRODUCT_SERVICE_CATALOG_QUEUE_ARN,
    });
  }
}
