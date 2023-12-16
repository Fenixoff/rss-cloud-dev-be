import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { buildResponse, errorResponse } from "../../common/lib/utils/responses";

export { importProductsFile as handler };

const importProductsFile = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    console.log("Request event:", event);

    const fileName = event.queryStringParameters?.name;
    if (!fileName) {
      return buildResponse(400, "Name is required", {});
    }

    if (!fileName.match(/\.csv$/)) {
      return buildResponse(400, "File must be a CSV", {});
    }

    const bucket = process.env.PRODUCTS_BUCKET;
    if (!bucket) {
      throw new Error("Bucket name is not set");
    }

    return buildResponse(
      200,
      await getSignedUrl(
        new S3Client(),
        new PutObjectCommand({
          Bucket: bucket,
          Key: `uploaded/${fileName}`,
        }),
        { expiresIn: 60 },
      ),
      {},
    );
  } catch (error) {
    console.error(error);

    return errorResponse;
  }
};
