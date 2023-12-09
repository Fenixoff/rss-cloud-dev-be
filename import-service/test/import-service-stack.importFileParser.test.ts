import { handler } from "../lib/import-service-stack.importFileParser";

import { S3Event } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { Readable } from "node:stream";
import { sdkStreamMixin } from "@aws-sdk/util-stream-node";

import * as s3 from "@aws-sdk/client-s3";

import "aws-sdk-client-mock-jest";

const s3mock = mockClient(s3.S3Client);

jest.mock("uuid", () => ({
  v4: jest.fn().mockReturnValue("00000000-0000-0000-0000-000000000000"),
}));

describe("importFileParser", () => {
  afterEach(() => {
    jest.clearAllMocks();
    s3mock.reset();
  });

  it("should process all records from S3Event and await for completion", async () => {
    const event = {
      Records: [
        {
          s3: {
            bucket: {
              name: "TestBucketName",
            },
            object: {
              key: "uploaded/test.csv",
            },
          },
        },
        {
          s3: {
            bucket: {
              name: "TestBucketName",
            },
            object: {
              key: "uploaded/test + test.csv",
            },
          },
        },
      ],
    };

    s3mock.on(s3.GetObjectCommand).callsFake(() => {
      const stream = new Readable();
      stream.push("id,value\n1,Test\n");
      stream.push(null);
      const sdkStream = sdkStreamMixin(stream);

      return { Body: sdkStream };
    });
    s3mock.on(s3.CopyObjectCommand).resolves({});
    s3mock.on(s3.DeleteObjectCommand).resolves({});

    await handler(event as S3Event);

    event.Records.forEach((record, index) => {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

      expect(s3mock).toHaveReceivedCommandWith(s3.GetObjectCommand, {
        Bucket: bucket,
        Key: key,
      });

      expect(s3mock).toHaveReceivedCommandWith(s3.CopyObjectCommand, {
        Bucket: bucket,
        CopySource: encodeURIComponent(`${bucket}/${key}`),
        Key: key.replace(
          "uploaded/",
          "parsed/00000000-0000-0000-0000-000000000000-",
        ),
      });

      expect(s3mock).toHaveReceivedCommandWith(s3.DeleteObjectCommand, {
        Bucket: bucket,
        Key: key,
      });
    });
  });
});
