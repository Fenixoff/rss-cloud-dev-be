import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Bucket } from "aws-cdk-lib/aws-s3";

import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";

import { IMPORT_SERVICE_API_DNS } from "../../common/lib/constants";

export class ImportServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, "ProductsBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      minimumTLSVersion: 1.2,
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

    const parseHandler = new nodejs.NodejsFunction(
      this,
      "importFileParser",
      lambdaDefaultProps,
    );

    [
      bucket.grantWrite(importHandler),
      bucket.grantReadWrite(parseHandler),
    ].forEach((grant) => grant.assertSuccess());

    const importIntegration = new HttpLambdaIntegration(
      "ImportIntegration",
      importHandler,
    );

    const parseIntegration = new HttpLambdaIntegration(
      "ParseIntegration",
      parseHandler,
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
