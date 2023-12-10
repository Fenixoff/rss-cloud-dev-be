import { handler } from "../lib/product-service-stack.getProductsList";
import { buildResponse } from "../../common/lib/utils/responses";
import { getProductListFromDb } from "../lib/models/Product";
import { APIGatewayProxyEventV2 } from "aws-lambda";

jest.mock("../../common/lib/utils/responses", () => ({
  buildResponse: jest.fn().mockReturnValue("testMockResponse"),
}));

jest.mock("../lib/models/Product", () => ({
  getProductListFromDb: jest.fn().mockReturnValue([
    {
      description: "Short Product Description1",
      id: "TestId",
      price: 24,
      count: 10,
      title: "TestProduct",
    },
  ]),
}));

describe("getProductsList", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should get products from DB and call buildResponse with statusCode 200 and products array", async () => {
    const response = await handler({} as APIGatewayProxyEventV2);

    expect(getProductListFromDb).toHaveBeenCalled();

    expect(buildResponse).toHaveBeenCalledWith(200, [
      {
        description: "Short Product Description1",
        id: "TestId",
        price: 24,
        count: 10,
        title: "TestProduct",
      },
    ]);

    expect(response).toBe("testMockResponse");
  });
});
