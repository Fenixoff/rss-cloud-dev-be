import { S3Event } from "aws-lambda";
import { NodeJsClient } from "@smithy/types";
import { v4 as uuidv4 } from "uuid";
import {
  SQSClient,
  SendMessageCommand,
  SendMessageCommandOutput,
} from "@aws-sdk/client-sqs";
import { finished } from "node:stream/promises";

import csv = require("csv-parser");

import * as s3 from "@aws-sdk/client-s3";

export { importFileParser as handler };

const s3Client = new s3.S3Client() as NodeJsClient<s3.S3Client>;
const sqsClient = new SQSClient();

const importFileParser = async (event: S3Event) => {
  const promises = event.Records.map(async (record) => {
    const obj = {
      Bucket: record.s3.bucket.name,
      Key: decodeURIComponent(record.s3.object.key.replace(/\+/g, " ")),
    };

    return processFile(obj);
  });
  await Promise.all(promises);
};

const processFile = async (obj: S3Object) => {
  const file = (await s3Client.send(new s3.GetObjectCommand(obj))).Body;
  if (file) {
    await Promise.all([
      parse(file),

      s3Client.send(
        new s3.CopyObjectCommand({
          Bucket: obj.Bucket,
          CopySource: encodeURIComponent(`${obj.Bucket}/${obj.Key}`),
          Key: obj.Key.replace("uploaded/", `parsed/${uuidv4()}-`),
        }),
      ),
    ]);

    s3Client.send(new s3.DeleteObjectCommand(obj));
  }
};

const parse = async (stream: NodeJS.ReadableStream) => {
  const queueUrl = process.env.CATALOG_ITEMS_QUEUE_URL;

  if (!queueUrl) {
    throw new Error("Missing queue url");
  }

  const promises: Promise<SendMessageCommandOutput>[] = [];
  await finished(
    stream
      .pipe(
        csv({
          mapValues: ({ header, value }) =>
            ["price", "count"].includes(header) ? +value : value,
        }),
      )
      .on("data", (data) => {
        promises.push(
          sqsClient.send(
            new SendMessageCommand({
              QueueUrl: queueUrl,
              MessageBody: JSON.stringify(data),
            }),
          ),
        );
      })
      .on("error", (error) => {
        console.error("Parsing error:", error);
      }),
  );

  return Promise.all(promises);
};
