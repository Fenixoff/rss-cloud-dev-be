import { buildResponse } from "../lib/utils/responses";

describe("buildResponse", () => {
  test("should build a response with status code, body, and headers", () => {
    const statusCode = 200;
    const responseBody = { message: "Success" };

    const result = buildResponse(statusCode, responseBody);

    expect(result).toEqual({
      statusCode,
      body: JSON.stringify(responseBody),
      headers: {
        "content-type": "application/json",
      },
    });
  });

  test("should handle string response body", () => {
    const statusCode = 200;
    const responseBody = "Plain text response";

    const result = buildResponse(statusCode, responseBody);

    expect(result).toEqual({
      statusCode,
      body: responseBody,
      headers: {
        "content-type": "application/json",
      },
    });
  });

  test("should handle an error during JSON stringification", () => {
    const statusCode = 200;
    const responseBody = { bigInt: BigInt(9007199254740991) };

    const result = buildResponse(statusCode, responseBody);

    expect(result).toEqual({
      statusCode: 500,
      body: '{"message":"Server error occurred"}',
      headers: {
        "content-type": "application/json",
      },
    });
  });
});
