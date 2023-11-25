import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";

export class ProductServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const productsListHandler = new nodejs.NodejsFunction(
      this,
      "getProductsList",
    );
    const productsByIdHandler = new nodejs.NodejsFunction(
      this,
      "getProductsById",
    );

    const productsListIntegration = new HttpLambdaIntegration(
      "ProductsListIntegration",
      productsListHandler,
    );
    const productsByIdIntegration = new HttpLambdaIntegration(
      "ProductsByIdIntegration",
      productsByIdHandler,
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

    const devStage = new apigwv2.HttpStage(this, "DevStage", {
      httpApi,
      stageName: "dev",
      autoDeploy: true,
    });

    new CfnOutput(this, "ProductServiceApiDNS", {
      value: httpApi.apiEndpoint,
    });
  }
}
