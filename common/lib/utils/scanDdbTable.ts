import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { NativeAttributeValue } from "@aws-sdk/util-dynamodb";

export const scanTable = async (
  table: string,
  ddbDocClient: DynamoDBDocumentClient,
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
