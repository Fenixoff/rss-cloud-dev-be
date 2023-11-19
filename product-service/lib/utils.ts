import { APIGatewayProxyResultV2 } from "aws-lambda";

export const buildResponse = (
  statusCode: number,
  responseBody: unknown,
): APIGatewayProxyResultV2 => {
  let body: string;
  try {
    body =
      typeof responseBody === "string"
        ? responseBody
        : JSON.stringify(responseBody);
  } catch {
    statusCode = 500;
    body = '{"message":"Server error occurred"}';
  }

  return {
    statusCode,
    body,
    headers: {
      "content-type": "application/json",
    },
  };
};
