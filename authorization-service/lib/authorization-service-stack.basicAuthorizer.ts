import { APIGatewayRequestSimpleAuthorizerHandlerV2 } from "aws-lambda";

export { basicAuthorizer as handler };

const basicAuthorizer: APIGatewayRequestSimpleAuthorizerHandlerV2 = async (
  event,
) => {
  try {
    const [user, password] = Buffer.from(
      event.identitySource[0].match(/Basic (.*)/)![1],
      "base64",
    )
      .toString()
      .split(":");

    if (user && password && process.env[user] === password) {
      return {
        isAuthorized: true,
      };
    }
  } catch (e) {
    console.error(e);
  }

  return {
    isAuthorized: false,
  };
};
