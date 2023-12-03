import { S3Event } from "aws-lambda";
import { NodeJsClient } from "@smithy/types";
import { v4 as uuidv4 } from "uuid";
import { finished } from "node:stream/promises";

import csv = require("csv-parser");

import * as s3 from "@aws-sdk/client-s3";

export { importFileParser as handler };

const client = new s3.S3Client() as NodeJsClient<s3.S3Client>;

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
  const file = (await client.send(new s3.GetObjectCommand(obj))).Body;
  if (file) {
    await Promise.all([
      parse(file),

      client.send(
        new s3.CopyObjectCommand({
          Bucket: obj.Bucket,
          CopySource: encodeURIComponent(`${obj.Bucket}/${obj.Key}`),
          Key: obj.Key.replace("uploaded/", `parsed/${uuidv4()}-`),
        }),
      ),
    ]);
    client.send(new s3.DeleteObjectCommand(obj));
  }
};

const parse = async (stream: NodeJS.ReadableStream) => {
  return finished(
    stream
      .pipe(csv())
      .on("data", (data) => {
        console.log(data);
      })
      .on("error", (error) => {
        console.error("Parsing error:", error);
      }),
  );
};
