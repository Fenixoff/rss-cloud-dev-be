import { APIGatewayProxyEventV2 } from "aws-lambda";
import { handler } from "../lib/product-service-stack.getProductsById";
import { buildResponse } from "../lib/utils";
import { products } from "../data/products";

jest.mock("../lib/utils", () => ({
  buildResponse: jest.fn(),
}));

jest.mock("../data/products", () => ({
  products: [
    {
      description: "Short Product Description1",
      id: "TestId",
      price: 24,
      title: "TestProduct",
    },
  ],
}));

describe("getProductsById", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should call buildResponse with statusCode 400 if productId is not provided", async () => {
    const event = {
      pathParameters: {},
    };

    await handler(event as APIGatewayProxyEventV2);

    expect(buildResponse).toHaveBeenCalledWith(400, {
      message: "ProductId is required",
    });
  });

  it("should call buildResponse with statusCode 404 if product is not found", async () => {
    const event = {
      pathParameters: { productId: "nonexistent-id" },
    };

    await handler(event as unknown as APIGatewayProxyEventV2);

    expect(buildResponse).toHaveBeenCalledWith(404, {
      message: "Product not found",
    });
  });

  it("should call buildResponse with statusCode 200 with the product if it exists", async () => {
    const event = {
      pathParameters: { productId: products[0].id },
    };

    await handler(event as unknown as APIGatewayProxyEventV2);

    expect(buildResponse).toHaveBeenCalledWith(200, products[0]);
  });
});
