import { handler } from "../lib/product-service-stack.getProductsList";
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

describe("getProductsList", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should call buildResponse with statusCode 200 with products array", async () => {
    await handler();

    expect(buildResponse).toHaveBeenCalledWith(200, products);
  });
});
