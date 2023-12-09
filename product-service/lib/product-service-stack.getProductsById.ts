import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { validate as uuidValidate } from "uuid";

import { buildResponse, errorResponse } from "../../common/lib/utils/responses";
import { getProductsByIdFromDb } from "./models/Product";

export { getProductsById as handler };

const getProductsById = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    console.log("Request event:", event);

    const id = event.pathParameters?.productId;
    if (!id) {
      return buildResponse(400, { message: "ProductId is required" });
    }

    if (!uuidValidate(id)) {
      return buildResponse(400, { message: "ProductId is not valid" });
    }

    const selectedProduct = await getProductsByIdFromDb(id);
    if (!selectedProduct) {
      return buildResponse(404, { message: "Product not found" });
    }

    return buildResponse(200, selectedProduct);
  } catch (error) {
    console.error(error);

    return errorResponse;
  }
};
