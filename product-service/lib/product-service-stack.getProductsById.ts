import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { validate as uuidValidate } from "uuid";

import { buildResponse, errorResponse } from "./utils";
import { ddbDocClient } from "./clients/dynamodb";
import { Product, isProduct } from "./models/Product";
import { TransactGetCommand } from "@aws-sdk/lib-dynamodb";

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

const getProductsByIdFromDb = async (id: string): Promise<Product | null> => {
  const productsTable = process.env.PRODUCT_TABLE;
  const stocksTable = process.env.STOCK_TABLE;

  if (!productsTable || !stocksTable) {
    throw new Error("Missing table name vars");
  }

  const { Responses: responses } = await ddbDocClient.send(
    new TransactGetCommand({
      TransactItems: [
        {
          Get: {
            TableName: productsTable,
            Key: { id },
          },
        },
        {
          Get: {
            TableName: stocksTable,
            Key: { id },
          },
        },
      ],
    }),
  );

  if (!responses) {
    throw new Error("Database error");
  }

  const [{ Item: product }, { Item: stock }] = responses;

  if (!product && !stock) {
    return null;
  }

  const result = { ...product, ...stock };
  if (!isProduct(result)) {
    throw new Error("Got wrong product from DB");
  }

  return result;
};
