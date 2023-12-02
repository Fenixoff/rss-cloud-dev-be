#!/usr/bin/env node
import "source-map-support/register";
import { v4 as uuidv4 } from "uuid";

import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ProvisionedThroughputExceededException } from "@aws-sdk/client-dynamodb";

import {
  CloudFormationClient,
  ListExportsCommand,
} from "@aws-sdk/client-cloudformation";

import {
  PRODUCT_SERVICE_PRODUCT_TABLE_NAME,
  PRODUCT_SERVICE_STOCK_TABLE_NAME,
} from "../../common/lib/constants";

import { ddbDocClient } from "../lib/clients/dynamodb";

const ITEMS_COUNT = 150;

(async () => {
  const cfn = new CloudFormationClient({});
  const cfExports = await cfn.send(new ListExportsCommand({}));

  const productsTable = cfExports.Exports?.find(
    (item) => item.Name === PRODUCT_SERVICE_PRODUCT_TABLE_NAME,
  )?.Value;

  const stocksTable = cfExports.Exports?.find(
    (item) => item.Name === PRODUCT_SERVICE_STOCK_TABLE_NAME,
  )?.Value;

  if (!productsTable || !stocksTable) {
    throw new Error("Missing table name exports");
  }

  for (let i = 0; i < ITEMS_COUNT; i++) {
    const uuid = uuidv4();
    const command = new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: productsTable,
            Item: {
              id: uuid,
              title: `Product ${i}`,
              description: `Quite long description of item ${i}`,
              price: +((1 - Math.random()) * 1000).toFixed(2),
            },
          },
        },
        {
          Put: {
            TableName: stocksTable,
            Item: {
              id: uuid,
              count: Math.floor(Math.random() * 20),
            },
          },
        },
      ],
    });

    let timeout = 500;
    for (;;) {
      try {
        const result = await ddbDocClient.send(command);

        console.log(result);
        timeout = 500;
        break;
      } catch (e) {
        console.log(e);

        if (e instanceof ProvisionedThroughputExceededException) {
          await new Promise((resolve) => setTimeout(resolve, timeout));
          timeout *= 2;
        } else {
          throw e;
        }
      }
    }
  }
})();
