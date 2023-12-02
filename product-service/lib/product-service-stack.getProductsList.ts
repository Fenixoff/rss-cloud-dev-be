import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { NativeAttributeValue } from "@aws-sdk/util-dynamodb";

import { buildResponse, errorResponse } from "../../common/lib/utils";
import { ddbDocClient } from "./clients/dynamodb";
import { Product, isProduct } from "./models/Product";

export { getProductsList as handler };

const getProductsList = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    console.log("Request event:", event);

    const data = await getProductListFromDb();
    return buildResponse(200, data);
  } catch (error) {
    console.error(error);

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

  return products.map((product) => {
    const result = {
      ...product,
      count: stocks.find((stock) => stock.id === product.id)!.count,
    };

    if (!isProduct(result)) {
      throw Error("Got wrong product from DB");
    }

    return result;
  });
};

const scanTable = async (
  table: string,
): Promise<Record<string, NativeAttributeValue>[]> => {
  const command = new ScanCommand({
    TableName: table,
  });

  const result = [];

  let finished = false;
  do {
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
  } while (!finished);

  return result;
};
