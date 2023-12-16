import { SQSBatchItemFailure, SQSHandler } from "aws-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { v4 as uuidv4, validate as uuidValidate } from "uuid";

import { isProduct, saveProduct } from "./models/Product";

export { catalogBatchProcess as handler };

const snsClient = new SNSClient();

const catalogBatchProcess: SQSHandler = async (event) => {
  const snsTopic = process.env.SNS_TOPIC_ARN;
  if (!snsTopic) console.warn("SNS_TOPIC_ARN is not defined");

  const promises = event.Records.map((item) => {
    const product = JSON.parse(item.body);

    if (!product.id) {
      product.id = uuidValidate(item.messageId) ? item.messageId : uuidv4();
    }

    if (isProduct(product)) {
      return Promise.allSettled([
        saveProduct(product).then(
          () => {
            return snsTopic
              ? snsClient.send(
                  new PublishCommand({
                    Subject: "Product created",
                    Message: JSON.stringify(product),
                    TopicArn: snsTopic,
                  }),
                )
              : null;
          },
          (reason) => {
            throw reason;
          },
        ),
        item.messageId,
      ]);
    } else {
      console.warn("Product is not valid: %o", product);
      return Promise.allSettled([null, item.messageId]);
    }
  });
  const result = await Promise.allSettled(promises);

  const unprocessed: SQSBatchItemFailure[] = [];
  result.forEach((item) => {
    if (item.status === "fulfilled") {
      if (item.value[0].status === "rejected")
        if (item.value[1].status === "fulfilled")
          unprocessed.push({ itemIdentifier: item.value[1].value });
    }
  });

  return { batchItemFailures: unprocessed };
};
