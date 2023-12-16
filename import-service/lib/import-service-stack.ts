import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
  Fn,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { S3EventSource } from "aws-cdk-lib/aws-lambda-event-sources";

import * as s3 from "aws-cdk-lib/aws-s3";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as sqs from "aws-cdk-lib/aws-sqs";

import {
  IMPORT_SERVICE_API_DNS,
  PRODUCT_SERVICE_CATALOG_QUEUE_ARN,
} from "../../common/lib/constants";

export class ImportServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const catalogItemsQueueArn = Fn.importValue(
      PRODUCT_SERVICE_CATALOG_QUEUE_ARN,
    );

    const catalogItemsQueue = sqs.Queue.fromQueueArn(
      this,
      "CatalogItemsQueue",
      catalogItemsQueueArn,
    );

    const bucket = new s3.Bucket(this, "ProductsBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      minimumTLSVersion: 1.2,
      cors: [
        {
          allowedHeaders: ["*"],
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: ["*"],
          maxAge: 3600,
        },
      ],
    });

    const lambdaDefaultProps = {
      runtime: Runtime.NODEJS_20_X,
      environment: {
        PRODUCTS_BUCKET: bucket.bucketName,
      },
    };

    const importHandler = new nodejs.NodejsFunction(
      this,
      "importProductsFile",
      lambdaDefaultProps,
    );

    const parseHandler = new nodejs.NodejsFunction(this, "importFileParser", {
      ...lambdaDefaultProps,
      environment: {
        ...lambdaDefaultProps.environment,
        CATALOG_ITEMS_QUEUE_URL: catalogItemsQueue.queueUrl,
      },
    });

    [
      bucket.grantWrite(importHandler),

      bucket.grantRead(parseHandler),
      bucket.grantDelete(parseHandler),
      bucket.grantPut(parseHandler),

      catalogItemsQueue.grantSendMessages(parseHandler),
    ].forEach((grant) => grant.assertSuccess());

    parseHandler.addEventSource(
      new S3EventSource(bucket, {
        events: [s3.EventType.OBJECT_CREATED],
        filters: [{ prefix: "uploaded/" }, { suffix: ".csv" }],
      }),
    );

    const importIntegration = new HttpLambdaIntegration(
      "ImportIntegration",
      importHandler,
    );

    const httpApi = new apigwv2.HttpApi(this, "ImportServiceApi", {
      corsPreflight: {
        allowMethods: [apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.HEAD],
        allowOrigins: ["*"],
        maxAge: Duration.days(1),
      },
      createDefaultStage: false,
    });

    httpApi.addRoutes({
      path: "/import",
      methods: [apigwv2.HttpMethod.GET],
      integration: importIntegration,
    });

    const devStage = new apigwv2.HttpStage(this, "DevStage", {
      httpApi,
      stageName: "dev",
      autoDeploy: true,
    });

    new CfnOutput(this, "ApiDns", {
      value: httpApi.apiEndpoint,
      exportName: IMPORT_SERVICE_API_DNS,
    });
  }
}
