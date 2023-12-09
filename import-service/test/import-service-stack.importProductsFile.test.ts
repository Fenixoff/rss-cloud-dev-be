import { handler } from "../lib/import-service-stack.importProductsFile";

import { APIGatewayProxyEventV2 } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import { buildResponse } from "../../common/lib/utils/responses";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

jest.mock("@aws-sdk/client-s3");

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("signed-url"),
}));

jest.mock("../../common/lib/utils", () => ({
  buildResponse: jest.fn().mockReturnValue("testMockResponse"),
  errorResponse: "testErrorResponse",
}));

describe("importProductsFile function", () => {
  process.env.PRODUCTS_BUCKET = "TestBucket";

  const mockEvent = {
    queryStringParameters: {
      name: "example.csv",
    },
  } as unknown as APIGatewayProxyEventV2;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a signed URL when valid parameters are provided", async () => {
    const result = await handler(mockEvent);

    expect(buildResponse).toHaveBeenCalledWith(200, "signed-url", {});
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.any(S3Client),
      expect.any(PutObjectCommand),
      { expiresIn: 60 },
    );

    expect(S3Client).toHaveBeenCalledTimes(1);
    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: process.env.PRODUCTS_BUCKET,
      Key: "uploaded/example.csv",
    });

    expect(result).toEqual("testMockResponse");
  });

  it("should return an error response when the file name is missing", async () => {
    const result = await handler({} as unknown as APIGatewayProxyEventV2);

    expect(S3Client).toHaveBeenCalledTimes(0);

    expect(buildResponse).toHaveBeenCalledWith(400, "Name is required", {});
    expect(result).toEqual("testMockResponse");
  });

  it("should return an error response when the file extension is not CSV", async () => {
    const result = await handler({
      queryStringParameters: {
        name: "example.txt",
      },
    } as unknown as APIGatewayProxyEventV2);

    expect(S3Client).toHaveBeenCalledTimes(0);

    expect(buildResponse).toHaveBeenCalledWith(400, "File must be a CSV", {});
    expect(result).toEqual("testMockResponse");
  });

  it("should throw an error when bucket name is absent in env", async () => {
    process.env = {};

    expect(await handler(mockEvent)).toBe("testErrorResponse");
  });
});
