import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

import { buildResponse, errorResponse } from "../../common/lib/utils/responses";
import { getProductListFromDb } from "./models/Product";

export { getProductsList as handler };

const getProductsList = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    console.log("Request event:", event);

    const data = await getProductListFromDb();
    return buildResponse(200, data);
  } catch (error) {
    console.error(error);

    return errorResponse;
  }
};
