import { APIGatewayProxyEventV2 } from "aws-lambda";
import { handler } from "../lib/product-service-stack.getProductsById";
import { buildResponse } from "../../common/lib/utils/responses";
import { getProductsByIdFromDb } from "../lib/models/Product";

jest.mock("../../common/lib/utils/responses", () => ({
  buildResponse: jest.fn().mockReturnValue("testMockResponse"),
}));

jest.mock("../lib/models/Product", () => ({
  getProductsByIdFromDb: jest.fn().mockReturnValue({
    description: "Short Product Description1",
    id: "TestId",
    price: 24,
    count: 10,
    title: "TestProduct",
  }),
}));

jest.mock("uuid", () => ({
  v4: jest.fn().mockReturnValue("00000000-0000-0000-0000-000000000000"),
  validate: jest.fn().mockReturnValue(true),
}));

describe("getProductsById", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should call buildResponse with statusCode 200 with the product if it exists", async () => {
    const event = {
      pathParameters: { productId: "TestId" },
    };

    const response = await handler(event as unknown as APIGatewayProxyEventV2);
    expect(getProductsByIdFromDb).toHaveBeenCalledWith(
      event.pathParameters.productId,
    );

    expect(buildResponse).toHaveBeenCalledWith(200, {
      description: "Short Product Description1",
      id: "TestId",
      price: 24,
      count: 10,
      title: "TestProduct",
    });

    expect(response).toBe("testMockResponse");
  });

  it("should call buildResponse with statusCode 400 if productId is not provided", async () => {
    const event = {
      pathParameters: {},
    };

    const response = await handler(event as APIGatewayProxyEventV2);

    expect(buildResponse).toHaveBeenCalledWith(400, {
      message: "ProductId is required",
    });

    expect(getProductsByIdFromDb).toHaveBeenCalledTimes(0);

    expect(response).toBe("testMockResponse");
  });

  it("should call buildResponse with statusCode 404 if product is not found", async () => {
    const event = {
      pathParameters: { productId: "nonexistent-id" },
    };

    jest.mocked(getProductsByIdFromDb).mockResolvedValue(null);

    const response = await handler(event as unknown as APIGatewayProxyEventV2);

    expect(getProductsByIdFromDb).toHaveBeenCalledWith(
      event.pathParameters.productId,
    );

    expect(buildResponse).toHaveBeenCalledWith(404, {
      message: "Product not found",
    });

    expect(response).toBe("testMockResponse");
  });
});
