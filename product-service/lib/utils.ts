import { APIGatewayProxyResultV2 } from "aws-lambda";

export const buildResponse = (
  statusCode: number,
  responseBody: unknown,
): APIGatewayProxyResultV2 => {
  const body =
    typeof responseBody === "string"
      ? responseBody
      : JSON.stringify(responseBody);
  return {
    statusCode,
    body,
    headers: {
      "content-type": "application/json",
    },
  };
};

export const errorResponse = buildResponse(
  500,
  '{"message":"Server error occurred"}',
);
