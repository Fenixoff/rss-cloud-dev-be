import { APIGatewayProxyResultV2 } from "aws-lambda";
import { buildResponse } from "./utils";

import { products } from "../data/products";

export { getProductsList as handler };

const getProductsList = async (): Promise<APIGatewayProxyResultV2> =>
  buildResponse(200, products);
