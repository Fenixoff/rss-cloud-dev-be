import { SQSBatchItemFailure, SQSHandler } from "aws-lambda";
import { v4 as uuidv4, validate as uuidValidate } from "uuid";

import { isProduct, saveProduct } from "./models/Product";

export { catalogBatchProcess as handler };

const catalogBatchProcess: SQSHandler = async (event) => {
  const promises = event.Records.map(async (item) => {
    const product = JSON.parse(item.body);

    if (!product.id) {
      product.id = uuidValidate(item.messageId) ? item.messageId : uuidv4();
    }

    if (isProduct(product)) {
      return Promise.allSettled([saveProduct(product), { id: item.messageId }]);
    } else {
      console.warn("Product is not valid: %o", product);
      return Promise.allSettled([null, { id: item.messageId }]);
    }
  });
  const result = await Promise.allSettled(promises);

  const unprocessed: SQSBatchItemFailure[] = [];
  result.forEach((item) => {
    if (item.status === "fulfilled") {
      if (item.value[0].status === "rejected")
        if (item.value[1].status === "fulfilled")
          unprocessed.push({ itemIdentifier: item.value[1].value.id });
    }
  });

  return { batchItemFailures: unprocessed };
};
