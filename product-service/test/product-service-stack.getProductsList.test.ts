import { handler } from "../lib/product-service-stack.getProductsList";
import { buildResponse } from "../../common/lib/utils";
import { products } from "../data/products";

jest.mock("../lib/utils", () => ({
  buildResponse: jest.fn().mockReturnValue("testMockResponse"),
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
    const response = await handler();

    expect(buildResponse).toHaveBeenCalledWith(200, products);

    expect(response).toBe("testMockResponse");
  });
});
