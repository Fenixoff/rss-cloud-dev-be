import { handler } from "../lib/product-service-stack.catalogBatchProcess";
import { isProduct, saveProduct } from "../lib/models/Product";
import { Context, SQSEvent } from "aws-lambda";

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";

const snsMock = mockClient(SNSClient);

jest.mock("uuid", () => ({
  v4: jest.fn().mockReturnValue("00000000-0000-0000-0000-000000000000"),
  validate: jest.fn().mockReturnValue(true),
}));

jest.mock("../lib/models/Product", () => ({
  isProduct: jest.fn().mockReturnValue(true),
  saveProduct: jest
    .fn()
    .mockResolvedValue({})
    .mockRejectedValueOnce(new Error("Test")),
}));

describe("catalogBatchProcess", () => {
  process.env.SNS_TOPIC_ARN = "TestArn";

  const context: Context = {
    callbackWaitsForEmptyEventLoop: true,
    functionName: "test",
    functionVersion: "1",
    invokedFunctionArn: "test",
    memoryLimitInMB: "1",
    awsRequestId: "test",
    logGroupName: "test",
    logStreamName: "test",
    getRemainingTimeInMillis: () => 1,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };

  const commonProductProps = {
    title: "test",
    description: "test",
    price: 10,
    count: 10,
  };

  afterEach(() => {
    jest.clearAllMocks();
    snsMock.reset();
  });
  it("should return unsaved messageId on productSave error", async () => {
    const event = {
      Records: [
        {
          body: JSON.stringify(commonProductProps),
          messageId: "00000000-0000-0000-0000-000000000003",
        },
        {
          body: JSON.stringify(commonProductProps),
          messageId: "00000000-0000-0000-0000-000000000004",
        },
      ],
    };

    const result = await handler(event as SQSEvent, context, () => null);

    expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
      Subject: "Product created",
      Message: JSON.stringify({
        ...commonProductProps,
        id: "00000000-0000-0000-0000-000000000004",
      }),
      TopicArn: "TestArn",
    });

    expect(result).toEqual({
      batchItemFailures: [
        { itemIdentifier: "00000000-0000-0000-0000-000000000003" },
      ],
    });
  });
  it("should create products and send notifications if id field is present", async () => {
    const event = {
      Records: [
        {
          body: JSON.stringify({
            id: "00000000-0000-0000-0000-000000000001",
            ...commonProductProps,
          }),
        },
      ],
    };

    const result = await handler(event as SQSEvent, context, () => null);
    expect(saveProduct).toHaveBeenCalledWith({
      id: "00000000-0000-0000-0000-000000000001",
      ...commonProductProps,
    });

    expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
      Subject: "Product created",
      Message: event.Records[0].body,
      TopicArn: "TestArn",
    });

    expect(result).toEqual({ batchItemFailures: [] });
  });

  it("should create products and send notifications if id field is absent", async () => {
    const event = {
      Records: [
        {
          body: JSON.stringify(commonProductProps),
          messageId: "00000000-0000-0000-0000-000000000002",
        },
      ],
    };

    const result = await handler(event as SQSEvent, context, () => null);
    expect(saveProduct).toHaveBeenCalledWith({
      id: "00000000-0000-0000-0000-000000000002",
      ...commonProductProps,
    });

    expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
      Subject: "Product created",
      Message: JSON.stringify({
        ...commonProductProps,
        id: "00000000-0000-0000-0000-000000000002",
      }),
      TopicArn: "TestArn",
    });

    expect(result).toEqual({ batchItemFailures: [] });
  });

  it("should not create products and send notifications if product is invalid", async () => {
    const event = {
      Records: [
        {
          body: "{}",
        },
      ],
    };

    jest.mocked(isProduct).mockReturnValue(false);

    const result = await handler(event as SQSEvent, context, () => null);

    expect(saveProduct).toHaveBeenCalledTimes(0);

    expect(snsMock).toHaveReceivedCommandTimes(PublishCommand, 0);

    expect(result).toEqual({ batchItemFailures: [] });
  });

  it("should not try to use SNS without SNS_TOPIC_ARN defined", async () => {
    delete process.env.SNS_TOPIC_ARN;

    const event = {
      Records: [
        {
          body: "{}",
        },
      ],
    };

    const result = await handler(event as SQSEvent, context, () => null);

    expect(snsMock).toHaveReceivedCommandTimes(PublishCommand, 0);

    expect(result).toEqual({ batchItemFailures: [] });
  });
});
