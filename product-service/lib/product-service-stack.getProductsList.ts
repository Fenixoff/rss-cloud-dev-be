import { APIGatewayProxyResultV2 } from "aws-lambda";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ProvisionedThroughputExceededException } from "@aws-sdk/client-dynamodb";
import { NativeAttributeValue } from "@aws-sdk/util-dynamodb";

import { buildResponse, errorResponse } from "./utils";
import { ddbDocClient } from "./clients/dynamodb";
import { Product } from "./models/Product";

export { getProductsList as handler };

const MAX_RETRIES = 5;

const getProductsList = async (
  event: APIGatewayProxyResultV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    console.log("Request event:", event);

    const data = await getProductListFromDb();
    return buildResponse(200, data);
  } catch {
    return errorResponse;
  }
};

const getProductListFromDb = async (): Promise<Product[]> => {
  const productsTable = process.env.PRODUCT_TABLE;
  const stocksTable = process.env.STOCK_TABLE;

  if (!productsTable || !stocksTable) {
    throw new Error("Missing table name vars");
  }
  const [products, stocks] = await Promise.all([
    scanTable(productsTable),
    scanTable(stocksTable),
  ]);

  return products.map(
    (product) =>
      ({
        ...product,
        count: stocks.find((stock) => stock.id === product.id)!.count,
      }) as Product,
  );
};

const scanTable = async (
  table: string,
  retries = MAX_RETRIES,
): Promise<Record<string, NativeAttributeValue>[]> => {
  const command = new ScanCommand({
    TableName: table,
  });

  const result = [];

  let finished = false;
  do {
    let retriesCount = 0;
    while (retriesCount < retries) {
      try {
        const { Items: items, LastEvaluatedKey: lastKey } =
          await ddbDocClient.send(command);

        if (items) {
          result.push(...items);
        }

        if (!lastKey) {
          finished = true;
        } else {
          command.input.ExclusiveStartKey = lastKey;
        }

        break;
      } catch (error) {
        if (error instanceof ProvisionedThroughputExceededException) {
          retriesCount++;

          await new Promise((resolve) =>
            setTimeout(resolve, 500 * Math.pow(2, retriesCount)),
          );
        } else {
          throw error;
        }
      }
    }

    if (retriesCount === retries) {
      throw new Error("Max retries exceeded");
    }
  } while (!finished);

  return result;
};
