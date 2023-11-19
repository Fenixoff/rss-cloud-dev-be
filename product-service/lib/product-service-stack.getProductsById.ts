import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { buildResponse } from "./utils";
import { products } from "../data/products";

export { getProductsById as handler };

const getProductsById = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const id = event.pathParameters?.productId;
  if (typeof id === "undefined") {
    return buildResponse(400, { message: "ProductId is required" });
  }

  const selectedProduct = products.find((product) => product.id === id);
  if (typeof selectedProduct === "undefined") {
    return buildResponse(404, { message: "Product not found" });
  }

  return buildResponse(200, selectedProduct);
};
