import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";

import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";

import "dotenv/config";

import { AUTHORIZATION_SERVICE_AUTHORIZER_ARN } from "../../common/lib/constants";

export class AuthorizationServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const credentialsString = process.env.CREDENTIALS;
    if (!credentialsString) {
      throw new Error("No credentials provided!");
    }

    const credentials = JSON.parse(credentialsString);
    if (!Array.isArray(credentials)) {
      throw new Error("Wrong credentials provided!");
    }

    const basicAuthorizerHandler = new nodejs.NodejsFunction(
      this,
      "basicAuthorizer",
      {
        runtime: Runtime.NODEJS_20_X,
        environment: credentials.reduce((permissions, { user, password }) => {
          permissions[user] = password;
          return permissions;
        }, {}),
      },
    );

    basicAuthorizerHandler.grantInvoke(
      new ServicePrincipal("apigateway.amazonaws.com"),
    );

    new CfnOutput(this, "basicAuthorizerArn", {
      value: basicAuthorizerHandler.functionArn,
      exportName: AUTHORIZATION_SERVICE_AUTHORIZER_ARN,
    });
  }
}
