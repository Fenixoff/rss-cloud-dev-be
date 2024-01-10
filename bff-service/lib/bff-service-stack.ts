import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";

import { Construct } from "constructs";
import { HttpUrlIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";

import "dotenv/config";

export class BffServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const httpApi = new apigwv2.HttpApi(this, "BffApi", {
      corsPreflight: {
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowOrigins: ["*"],
        allowHeaders: ["authorization", "content-type"],
        maxAge: cdk.Duration.days(1),
      },
    });

    httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [
        apigwv2.HttpMethod.GET,
        apigwv2.HttpMethod.POST,
        apigwv2.HttpMethod.PUT,
        apigwv2.HttpMethod.DELETE,
        apigwv2.HttpMethod.PATCH,
      ],
      integration: new HttpUrlIntegration(
        "BffApiIntegration",
        `${process.env.API_URL}/{proxy}`,
      ),
    });

    new cdk.CfnOutput(this, "BffApiUrl", {
      value: httpApi.url!,
    });
  }
}
