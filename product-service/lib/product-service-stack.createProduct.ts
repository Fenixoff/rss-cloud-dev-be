import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ProvisionedThroughputExceededException } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";

import { buildResponse, errorResponse } from "./utils";
import { ddbDocClient } from "./clients/dynamodb";
import { Product, isProduct } from "./models/Product";

export { createProduct as handler };

const MAX_RETRIES = 5;

const createProduct = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    console.log("Request event:", event);

    const body = event.body;
    if (!body) {
      return buildResponse(400, { message: "Request body is required" });
    }

    const product = JSON.parse(body);
    if (!product.id) {
      product.id = uuidv4();
    }

    if (!isProduct(product)) {
      return buildResponse(400, { message: "Product is not valid" });
    }

    await saveProduct(product);

    return buildResponse(200, { message: "Poduct updated" });
  } catch (error) {
    console.error(error);

    return errorResponse;
  }
};

const saveProduct = async (
  product: Product,
  retries = MAX_RETRIES,
): Promise<void> => {
  const productsTable = process.env.PRODUCT_TABLE;
  const stocksTable = process.env.STOCK_TABLE;

  if (!productsTable || !stocksTable) {
    throw new Error("Missing table name vars");
  }

  const { id, count, ...rest } = product;

  const command = new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: productsTable,
          Item: {
            id,
            ...rest,
          },
        },
      },
      {
        Put: {
          TableName: stocksTable,
          Item: {
            id,
            count,
          },
        },
      },
    ],
  });

  let retriesCount = 0;
  while (retriesCount < retries) {
    try {
      await ddbDocClient.send(command);

      break;
    } catch (error) {
      if (error instanceof ProvisionedThroughputExceededException) {
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * Math.pow(2, retriesCount)),
        );

        retriesCount++;
      } else {
        throw error;
      }
    }
  }

  if (retriesCount === retries) {
    throw new Error("Max retries exceeded");
  }
};
