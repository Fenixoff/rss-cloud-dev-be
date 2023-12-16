import { validate as uuidValidate } from "uuid";
import {
  TransactGetCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

import { ddbDocClient } from "../clients/dynamodb";
import { scanTable } from "../../../common/lib/utils/scanDdbTable";

export type Product = {
  description: string;
  id: string;
  price: number;
  title: string;
  count: number;
};

export const isProduct = (product: unknown): product is Product => {
  return (
    typeof product === "object" &&
    product !== null &&
    "id" in product &&
    typeof product.id === "string" &&
    uuidValidate(product.id) &&
    "title" in product &&
    typeof product.title === "string" &&
    product.title.length > 0 &&
    "description" in product &&
    typeof product.description === "string" &&
    "price" in product &&
    typeof product.price === "number" &&
    product.price > 0 &&
    "count" in product &&
    typeof product.count === "number" &&
    product.count >= 0
  );
};

export const getProductsByIdFromDb = async (
  id: string,
): Promise<Product | null> => {
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

export const getProductListFromDb = async (): Promise<Product[]> => {
  const productsTable = process.env.PRODUCT_TABLE;
  const stocksTable = process.env.STOCK_TABLE;

  if (!productsTable || !stocksTable) {
    throw new Error("Missing table name vars");
  }
  const [products, stocks] = await Promise.all([
    scanTable(productsTable, ddbDocClient),
    scanTable(stocksTable, ddbDocClient),
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

export const saveProduct = async (product: Product) => {
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

  return ddbDocClient.send(command);
};
